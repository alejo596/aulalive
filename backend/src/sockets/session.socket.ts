import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from '../config/database';
import { StatsService } from '../services/stats.service';
import { SessionStatus, QuestionType } from '@prisma/client';

export function setupSessionSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // 1. Join a Session Room (Teacher, Projection or Student)
    socket.on('session:join_room', async (data: { sessionId: string; participantId?: string; role?: string }) => {
      const { sessionId, participantId, role } = data;
      const roomName = `session_${sessionId}`;
      socket.join(roomName);

      console.log(`👤 Socket ${socket.id} joined room ${roomName} as ${role || 'guest'}`);

      // If student participant, link socket ID and mark connected
      if (participantId) {
        await prisma.sessionParticipant.update({
          where: { id: participantId },
          data: { socketId: socket.id, isConnected: true, lastActiveAt: new Date() }
        }).catch(() => null);

        // Notify room that participant joined
        const activeCount = await prisma.sessionParticipant.count({
          where: { sessionId, isConnected: true }
        });

        const participants = await prisma.sessionParticipant.findMany({
          where: { sessionId, isConnected: true },
          select: { id: true, nickname: true, studentIdentifier: true }
        });

        io.to(roomName).emit('session:participant_joined', {
          participantId,
          activeCount,
          participants
        });
      }
    });

    // 2. Student Submits an Answer
    socket.on('student:submit_answer', async (data: {
      sessionId: string;
      participantId: string;
      questionId: string;
      selectedOptionId?: string;
      textResponse?: string;
      orderingResponse?: string[];
      responseTimeMs: number;
    }) => {
      try {
        const { sessionId, participantId, questionId, selectedOptionId, textResponse, orderingResponse, responseTimeMs } = data;
        const roomName = `session_${sessionId}`;

        // Anti-duplicate protection: Check if already answered
        const existing = await prisma.response.findUnique({
          where: {
            sessionId_participantId_questionId: {
              sessionId,
              participantId,
              questionId
            }
          }
        });

        if (existing) {
          socket.emit('student:error', { message: 'Ya has enviado una respuesta para esta pregunta.' });
          return;
        }

        // Fetch question & options from PostgreSQL
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          include: { answerOptions: true, quiz: true }
        });

        if (!question) {
          socket.emit('student:error', { message: 'Pregunta no encontrada.' });
          return;
        }

        let isCorrect = false;
        let pointsEarned = 0;

        // Validation logic per question type
        if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.TRUE_FALSE) {
          const selected = question.answerOptions.find(opt => opt.id === selectedOptionId);
          if (selected && selected.isCorrect) {
            isCorrect = true;
          }
        } else if (question.type === QuestionType.SHORT_ANSWER) {
          const correctTexts = question.answerOptions.map(opt => opt.text.trim().toLowerCase());
          const cleanUserText = (textResponse || '').trim().toLowerCase();
          if (correctTexts.includes(cleanUserText)) {
            isCorrect = true;
          }
        } else if (question.type === QuestionType.ORDERING && orderingResponse) {
          // Check order match
          const correctOrder = [...question.answerOptions].sort((a, b) => a.orderNum - b.orderNum).map(o => o.id);
          const isExactMatch = correctOrder.every((id, idx) => id === orderingResponse[idx]);
          if (isExactMatch) {
            isCorrect = true;
          }
        } else if (question.type === QuestionType.WORD_CLOUD || question.type === QuestionType.POLL || question.type === QuestionType.LIKERT) {
          // Participation-based question: correct by submitting
          isCorrect = true;
        }

        // Scoring with speed bonus
        if (isCorrect) {
          const basePoints = question.points;
          const maxTime = question.timeLimitSec * 1000;
          const remainingTime = Math.max(0, maxTime - responseTimeMs);
          const speedFactor = maxTime > 0 ? remainingTime / maxTime : 0;
          const speedBonus = Math.round(basePoints * 0.5 * speedFactor);
          pointsEarned = basePoints + speedBonus;
        }

        // Save real response to PostgreSQL
        const savedResponse = await prisma.response.create({
          data: {
            sessionId,
            participantId,
            questionId,
            selectedOptionId: selectedOptionId || null,
            textResponse: textResponse || null,
            orderingResponse: orderingResponse ? (orderingResponse as any) : undefined,
            isCorrect,
            pointsEarned,
            responseTimeMs
          }
        });

        // Confirm to student socket immediately
        socket.emit('student:answer_confirmed', {
          responseId: savedResponse.id,
          isCorrect: question.quiz.allowInstantFeedback ? isCorrect : null,
          pointsEarned,
          explanation: question.quiz.allowInstantFeedback ? question.explanation : null
        });

        // Recalculate real-time statistics from PostgreSQL and broadcast to Teacher & Projection
        const liveStats = await StatsService.getQuestionLiveStats(sessionId, questionId);
        io.to(roomName).emit('session:stats_update', liveStats);

      } catch (err) {
        console.error('Error handling student answer submission:', err);
        socket.emit('student:error', { message: 'Error al procesar la respuesta en el servidor.' });
      }
    });

    // 3. Teacher Starts Session (From Lobby to Question 0)
    socket.on('teacher:start_session', async (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `session_${sessionId}`;

      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { orderNum: 'asc' },
                include: { answerOptions: { orderBy: { orderNum: 'asc' } } }
              }
            }
          }
        }
      });

      if (!session || session.quiz.questions.length === 0) return;

      const firstQuestion = session.quiz.questions[0];

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.ACTIVE,
          currentQuestionId: firstQuestion.id,
          currentQuestionIndex: 0,
          isShowingResults: false,
          isShowingCorrect: false,
          startedAt: new Date()
        }
      });

      io.to(roomName).emit('session:started', {
        questionIndex: 0,
        totalQuestions: session.quiz.questions.length,
        question: {
          id: firstQuestion.id,
          text: firstQuestion.text,
          type: firstQuestion.type,
          points: firstQuestion.points,
          timeLimitSec: firstQuestion.timeLimitSec,
          imageUrl: firstQuestion.imageUrl,
          answerOptions: firstQuestion.answerOptions.map(o => ({
            id: o.id,
            text: o.text,
            orderNum: o.orderNum,
            imageUrl: o.imageUrl
          }))
        }
      });
    });

    // 4. Teacher Advances to Next Question
    socket.on('teacher:next_question', async (data: { sessionId: string; nextIndex: number }) => {
      const { sessionId, nextIndex } = data;
      const roomName = `session_${sessionId}`;

      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { orderNum: 'asc' },
                include: { answerOptions: { orderBy: { orderNum: 'asc' } } }
              }
            }
          }
        }
      });

      if (!session) return;

      if (nextIndex >= session.quiz.questions.length) {
        // Reached end of questions -> Auto-finish
        await finalizeSession(sessionId, io, roomName);
        return;
      }

      const nextQ = session.quiz.questions[nextIndex];

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          currentQuestionIndex: nextIndex,
          currentQuestionId: nextQ.id,
          isShowingResults: false,
          isShowingCorrect: false
        }
      });

      io.to(roomName).emit('session:question_changed', {
        questionIndex: nextIndex,
        totalQuestions: session.quiz.questions.length,
        question: {
          id: nextQ.id,
          text: nextQ.text,
          type: nextQ.type,
          points: nextQ.points,
          timeLimitSec: nextQ.timeLimitSec,
          imageUrl: nextQ.imageUrl,
          answerOptions: nextQ.answerOptions.map(o => ({
            id: o.id,
            text: o.text,
            orderNum: o.orderNum,
            imageUrl: o.imageUrl
          }))
        }
      });
    });

    // 5. Teacher Toggles Results (Chart Display)
    socket.on('teacher:toggle_results', async (data: { sessionId: string; show: boolean }) => {
      const { sessionId, show } = data;
      const roomName = `session_${sessionId}`;

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: { isShowingResults: show }
      });

      io.to(roomName).emit('session:results_toggled', { show });
    });

    // 6. Teacher Reveals Correct Answer
    socket.on('teacher:toggle_correct', async (data: { sessionId: string; show: boolean }) => {
      const { sessionId, show } = data;
      const roomName = `session_${sessionId}`;

      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          quiz: {
            include: {
              questions: {
                include: { answerOptions: true }
              }
            }
          }
        }
      });

      if (!session) return;
      const currentQ = session.quiz.questions[session.currentQuestionIndex];

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: { isShowingCorrect: show }
      });

      io.to(roomName).emit('session:correct_revealed', {
        show,
        questionId: currentQ?.id,
        correctOptionIds: currentQ?.answerOptions.filter(o => o.isCorrect).map(o => o.id) || [],
        explanation: currentQ?.explanation
      });
    });

    // 7. Teacher Finishes Session
    socket.on('teacher:finish_session', async (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `session_${sessionId}`;
      await finalizeSession(sessionId, io, roomName);
    });

    // 8. Client Disconnect Tracking
    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const participant = await prisma.sessionParticipant.findFirst({
        where: { socketId: socket.id }
      });

      if (participant) {
        await prisma.sessionParticipant.update({
          where: { id: participant.id },
          data: { isConnected: false, lastActiveAt: new Date() }
        }).catch(() => null);

        const roomName = `session_${participant.sessionId}`;
        const activeCount = await prisma.sessionParticipant.count({
          where: { sessionId: participant.sessionId, isConnected: true }
        });

        io.to(roomName).emit('session:participant_left', {
          participantId: participant.id,
          activeCount
        });
      }
    });
  });
}

async function finalizeSession(sessionId: string, io: SocketIOServer, roomName: string) {
  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.FINISHED,
      endedAt: new Date()
    }
  });

  const finalLeaderboard = await StatsService.getSessionLeaderboard(sessionId);

  io.to(roomName).emit('session:finished', {
    message: '¡La sesión interactiva ha finalizado!',
    leaderboard: finalLeaderboard
  });
}

