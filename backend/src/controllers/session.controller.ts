import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { QRService } from '../services/qr.service';
import { StatsService } from '../services/stats.service';
import { SessionStatus } from '@prisma/client';

export class SessionController {
  private static async generateUniquePin(): Promise<string> {
    let pin = '';
    let exists = true;
    while (exists) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      const count = await prisma.liveSession.count({
        where: {
          pinCode: pin,
          status: { in: [SessionStatus.LOBBY, SessionStatus.ACTIVE, SessionStatus.PAUSED] }
        }
      });
      if (count === 0) exists = false;
    }
    return pin;
  }

  static async createSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { quizId } = req.body;
      const hostTeacherId = req.user?.id;
      if (!hostTeacherId) return res.status(401).json({ success: false, message: 'No autenticado' });

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: { orderBy: { orderNum: 'asc' } } }
      });

      if (!quiz) return res.status(404).json({ success: false, message: 'Cuestionario no encontrado' });
      if (quiz.questions.length === 0) {
        return res.status(400).json({ success: false, message: 'El cuestionario no tiene preguntas configuradas' });
      }

      const pinCode = await SessionController.generateUniquePin();
      const qrCodeUrl = await QRService.generateSessionQR(pinCode);

      const session = await prisma.liveSession.create({
        data: {
          quizId,
          hostTeacherId,
          pinCode,
          qrCodeUrl,
          status: SessionStatus.LOBBY,
          currentQuestionId: quiz.questions[0].id,
          currentQuestionIndex: 0
        },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { orderNum: 'asc' },
                include: { answerOptions: true }
              }
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Sesión interactiva creada exitosamente',
        session
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { pinCode, nickname, studentIdentifier } = req.body;

      if (!pinCode || !nickname) {
        return res.status(400).json({ success: false, message: 'El PIN y el nombre de alumno son obligatorios' });
      }

      const session = await prisma.liveSession.findUnique({
        where: { pinCode: pinCode.trim() },
        include: {
          quiz: {
            select: {
              title: true,
              isAnonymous: true,
              allowInstantFeedback: true
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ success: false, message: 'PIN de sesión inválido o sesión inexistente' });
      }

      if (session.status === SessionStatus.FINISHED) {
        return res.status(400).json({ success: false, message: 'Esta sesión interactiva ya ha finalizado' });
      }

      let linkedUserId: string | null = null;
      try {
        const studentRole = await prisma.role.findUnique({
          where: { name: 'STUDENT' }
        });

        if (studentRole) {
          const generatedEmail = studentIdentifier 
            ? `${studentIdentifier.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@estudiante.aulalive.edu`
            : `${nickname.replace(/\s+/g, '.').toLowerCase()}@estudiante.aulalive.edu`;

          const studentUser = await prisma.user.upsert({
            where: { email: generatedEmail },
            update: {
              firstName: nickname.trim().split(' ')[0] || nickname.trim(),
              lastName: nickname.trim().split(' ').slice(1).join(' ') || 'Estudiante',
              rut: studentIdentifier ? studentIdentifier.trim() : undefined,
              isActive: true
            },
            create: {
              email: generatedEmail,
              passwordHash: 'STUDENT_NO_PASSWORD',
              firstName: nickname.trim().split(' ')[0] || nickname.trim(),
              lastName: nickname.trim().split(' ').slice(1).join(' ') || 'Estudiante',
              rut: studentIdentifier ? studentIdentifier.trim() : null,
              roleId: studentRole.id,
              isActive: true
            }
          });
          linkedUserId = studentUser.id;
        }
      } catch (errUser) {
        console.warn('Notice: user link optional step skipped:', errUser);
      }

      const participant = await prisma.sessionParticipant.upsert({
        where: {
          sessionId_nickname: {
            sessionId: session.id,
            nickname: nickname.trim()
          }
        },
        update: {
          studentIdentifier: studentIdentifier ? studentIdentifier.trim() : undefined,
          userId: linkedUserId || undefined,
          isConnected: true,
          lastActiveAt: new Date()
        },
        create: {
          sessionId: session.id,
          userId: linkedUserId,
          nickname: nickname.trim(),
          studentIdentifier: studentIdentifier ? studentIdentifier.trim() : null,
          isConnected: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: linkedUserId,
          action: 'STUDENT_JOIN_SESSION',
          entityType: 'SessionParticipant',
          entityId: participant.id,
          details: {
            nickname: participant.nickname,
            studentIdentifier: participant.studentIdentifier,
            pinCode: session.pinCode,
            sessionId: session.id
          },
          ipAddress: req.ip
        }
      }).catch(() => null);

      res.json({
        success: true,
        message: 'Conectado a la sesión con éxito',
        participant: {
          id: participant.id,
          nickname: participant.nickname,
          sessionId: session.id,
          pinCode: session.pinCode
        },
        session: {
          id: session.id,
          status: session.status,
          quizTitle: session.quiz.title,
          currentQuestionIndex: session.currentQuestionIndex,
          isAnonymous: session.quiz.isAnonymous
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSessionState(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const session = await prisma.liveSession.findUnique({
        where: { id },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { orderNum: 'asc' },
                include: {
                  answerOptions: { orderBy: { orderNum: 'asc' } }
                }
              }
            }
          },
          hostTeacher: {
            select: { firstName: true, lastName: true, email: true }
          },
          participants: {
            where: { isConnected: true },
            select: { id: true, nickname: true, studentIdentifier: true, joinedAt: true }
          }
        }
      });

      if (!session) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

      res.json({ success: true, session });
    } catch (error) {
      next(error);
    }
  }

  static async getLiveStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, questionId } = req.params;
      const stats = await StatsService.getQuestionLiveStats(id, questionId);
      res.json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }

  static async updateSessionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, currentQuestionIndex, isShowingResults, isShowingCorrect } = req.body;

      const session = await prisma.liveSession.findUnique({
        where: { id },
        include: {
          quiz: {
            include: { questions: { orderBy: { orderNum: 'asc' } } }
          }
        }
      });

      if (!session) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

      let currentQuestionId = session.currentQuestionId;
      if (currentQuestionIndex !== undefined && session.quiz.questions[currentQuestionIndex]) {
        currentQuestionId = session.quiz.questions[currentQuestionIndex].id;
      }

      const updated = await prisma.liveSession.update({
        where: { id },
        data: {
          status: status || undefined,
          currentQuestionIndex: currentQuestionIndex !== undefined ? currentQuestionIndex : undefined,
          currentQuestionId: currentQuestionId || undefined,
          isShowingResults: isShowingResults !== undefined ? isShowingResults : undefined,
          isShowingCorrect: isShowingCorrect !== undefined ? isShowingCorrect : undefined,
          startedAt: status === SessionStatus.ACTIVE && !session.startedAt ? new Date() : undefined,
          endedAt: status === SessionStatus.FINISHED ? new Date() : undefined
        }
      });

      res.json({ success: true, session: updated });
    } catch (error) {
      next(error);
    }
  }
}
