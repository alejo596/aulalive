import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import { QuestionType } from '@prisma/client';

const answerOptionSchema = z.object({
  id: z.string().optional(),
  orderNum: z.number().default(1),
  text: z.string().min(1, 'El texto de la alternativa es obligatorio'),
  isCorrect: z.boolean().default(false),
  weight: z.number().optional().default(1.0),
  imageUrl: z.string().optional().nullable()
});

const questionSchema = z.object({
  id: z.string().optional(),
  orderNum: z.number().default(1),
  text: z.string().min(2, 'El enunciado de la pregunta es obligatorio'),
  type: z.nativeEnum(QuestionType),
  points: z.number().default(100),
  timeLimitSec: z.number().default(20),
  imageUrl: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  answerOptions: z.array(answerOptionSchema).min(1, 'Debe incluir al menos una alternativa o respuesta válida')
});

const quizSchema = z.object({
  title: z.string().min(3, 'El título del cuestionario es obligatorio'),
  description: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  timeLimitSec: z.number().default(30),
  isAnonymous: z.boolean().default(false),
  allowInstantFeedback: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  questions: z.array(questionSchema).optional()
});

export class QuizController {
  static async getTeacherQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.id;
      const quizzes = await prisma.quiz.findMany({
        where: req.user?.role === 'ADMIN' ? {} : { teacherId },
        orderBy: { updatedAt: 'desc' },
        include: {
          subject: { select: { name: true, code: true } },
          _count: {
            select: { questions: true, liveSessions: true }
          }
        }
      });

      res.json({ success: true, quizzes });
    } catch (error) {
      next(error);
    }
  }

  static async getQuizById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          subject: true,
          questions: {
            orderBy: { orderNum: 'asc' },
            include: {
              answerOptions: { orderBy: { orderNum: 'asc' } }
            }
          }
        }
      });

      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Cuestionario no encontrado' });
      }

      res.json({ success: true, quiz });
    } catch (error) {
      next(error);
    }
  }

  static async createQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) return res.status(401).json({ success: false, message: 'No autenticado' });

      const data = quizSchema.parse(req.body);

      const quiz = await prisma.quiz.create({
        data: {
          title: data.title,
          description: data.description,
          subjectId: data.subjectId,
          teacherId,
          timeLimitSec: data.timeLimitSec,
          isAnonymous: data.isAnonymous,
          allowInstantFeedback: data.allowInstantFeedback,
          isPublished: data.isPublished,
          questions: {
            create: data.questions?.map((q, idx) => ({
              orderNum: idx + 1,
              text: q.text,
              type: q.type,
              points: q.points,
              timeLimitSec: q.timeLimitSec,
              imageUrl: q.imageUrl,
              explanation: q.explanation,
              answerOptions: {
                create: q.answerOptions.map((opt, optIdx) => ({
                  orderNum: optIdx + 1,
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  weight: opt.weight || 1.0,
                  imageUrl: opt.imageUrl
                }))
              }
            }))
          }
        },
        include: {
          questions: {
            include: { answerOptions: true }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Cuestionario creado exitosamente',
        quiz
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = quizSchema.parse(req.body);

      // Verify ownership
      const existing = await prisma.quiz.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Cuestionario no encontrado' });
      if (req.user?.role !== 'ADMIN' && existing.teacherId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'No tiene permiso para editar este cuestionario' });
      }

      // Delete old questions if new ones provided (transactional replace)
      if (data.questions && data.questions.length > 0) {
        await prisma.question.deleteMany({ where: { quizId: id } });
      }

      const updated = await prisma.quiz.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          subjectId: data.subjectId,
          timeLimitSec: data.timeLimitSec,
          isAnonymous: data.isAnonymous,
          allowInstantFeedback: data.allowInstantFeedback,
          isPublished: data.isPublished,
          questions: data.questions ? {
            create: data.questions.map((q, idx) => ({
              orderNum: idx + 1,
              text: q.text,
              type: q.type,
              points: q.points,
              timeLimitSec: q.timeLimitSec,
              imageUrl: q.imageUrl,
              explanation: q.explanation,
              answerOptions: {
                create: q.answerOptions.map((opt, optIdx) => ({
                  orderNum: optIdx + 1,
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  weight: opt.weight || 1.0,
                  imageUrl: opt.imageUrl
                }))
              }
            }))
          } : undefined
        },
        include: {
          questions: { include: { answerOptions: true } }
        }
      });

      res.json({
        success: true,
        message: 'Cuestionario actualizado exitosamente',
        quiz: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await prisma.quiz.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Cuestionario no encontrado' });

      if (req.user?.role !== 'ADMIN' && existing.teacherId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'No tiene permiso para eliminar este cuestionario' });
      }

      await prisma.quiz.delete({ where: { id } });
      res.json({ success: true, message: 'Cuestionario eliminado con éxito' });
    } catch (error) {
      next(error);
    }
  }

  static async duplicateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const original = await prisma.quiz.findUnique({
        where: { id },
        include: {
          questions: {
            include: { answerOptions: true }
          }
        }
      });

      if (!original) return res.status(404).json({ success: false, message: 'Cuestionario no encontrado' });

      const copy = await prisma.quiz.create({
        data: {
          title: `${original.title} (Copia)`,
          description: original.description,
          subjectId: original.subjectId,
          teacherId: req.user?.id || original.teacherId,
          timeLimitSec: original.timeLimitSec,
          isAnonymous: original.isAnonymous,
          allowInstantFeedback: original.allowInstantFeedback,
          isPublished: false,
          questions: {
            create: original.questions.map(q => ({
              orderNum: q.orderNum,
              text: q.text,
              type: q.type,
              points: q.points,
              timeLimitSec: q.timeLimitSec,
              imageUrl: q.imageUrl,
              explanation: q.explanation,
              answerOptions: {
                create: q.answerOptions.map(opt => ({
                  orderNum: opt.orderNum,
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  weight: opt.weight,
                  imageUrl: opt.imageUrl
                }))
              }
            }))
          }
        },
        include: { questions: { include: { answerOptions: true } } }
      });

      res.status(201).json({
        success: true,
        message: 'Cuestionario duplicado exitosamente',
        quiz: copy
      });
    } catch (error) {
      next(error);
    }
  }
}

