import prisma from '../config/database';
import { LiveStatsDTO, ParticipantRankDTO } from '../types';

export class StatsService {
  /**
   * Calculates comprehensive live statistics from PostgreSQL for a question in a session
   */
  static async getQuestionLiveStats(sessionId: string, questionId: string): Promise<LiveStatsDTO> {
    // 1. Total connected participants
    const totalParticipants = await prisma.sessionParticipant.count({
      where: { sessionId, isConnected: true }
    });

    // 2. All responses for this question
    const responses = await prisma.response.findMany({
      where: { sessionId, questionId },
      include: {
        selectedOption: true,
        participant: true
      }
    });

    const totalResponses = responses.length;
    const participationPercentage = totalParticipants > 0 
      ? Math.round((totalResponses / totalParticipants) * 100) 
      : 0;

    // 3. Option distribution
    const options = await prisma.answerOption.findMany({
      where: { questionId },
      orderBy: { orderNum: 'asc' }
    });

    const distribution: { [optionId: string]: number } = {};
    options.forEach(opt => {
      distribution[opt.id] = 0;
    });

    let correctCount = 0;
    let incorrectCount = 0;
    let totalTimeMs = 0;
    let totalPoints = 0;

    const wordFrequencyMap: { [word: string]: number } = {};

    responses.forEach(r => {
      if (r.selectedOptionId && distribution[r.selectedOptionId] !== undefined) {
        distribution[r.selectedOptionId]++;
      }

      if (r.isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      totalTimeMs += r.responseTimeMs;
      totalPoints += r.pointsEarned;

      // Word cloud aggregation if text response present
      if (r.textResponse) {
        const words = r.textResponse.trim().toLowerCase().split(/\s+/);
        words.forEach(w => {
          const clean = w.replace(/[^a-záéíóúüñ0-9]/gi, '');
          if (clean.length > 2) {
            wordFrequencyMap[clean] = (wordFrequencyMap[clean] || 0) + 1;
          }
        });
      }
    });

    const averageTimeMs = totalResponses > 0 ? Math.round(totalTimeMs / totalResponses) : 0;
    const averageScore = totalResponses > 0 ? Math.round(totalPoints / totalResponses) : 0;

    const wordCloud = Object.entries(wordFrequencyMap).map(([text, count]) => ({
      text,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 30);

    // Current leaderboard for the session
    const leaderboard = await this.getSessionLeaderboard(sessionId);

    return {
      sessionId,
      questionId,
      totalParticipants,
      totalResponses,
      participationPercentage,
      distribution,
      correctCount,
      incorrectCount,
      averageTimeMs,
      averageScore,
      wordCloud,
      leaderboard
    };
  }

  /**
   * Recalculates and retrieves the live session leaderboard
   */
  static async getSessionLeaderboard(sessionId: string): Promise<ParticipantRankDTO[]> {
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        responses: true
      }
    });

    const ranks: ParticipantRankDTO[] = participants.map(p => {
      const totalScore = p.responses.reduce((sum, r) => sum + r.pointsEarned, 0);
      const correctAnswers = p.responses.filter(r => r.isCorrect).length;
      const totalTime = p.responses.reduce((sum, r) => sum + r.responseTimeMs, 0);
      const averageTimeMs = p.responses.length > 0 ? Math.round(totalTime / p.responses.length) : 0;

      return {
        rank: 0,
        participantId: p.id,
        nickname: p.nickname,
        totalScore,
        correctAnswers,
        averageTimeMs
      };
    });

    // Sort descending by score, tiebreaker: faster average time
    ranks.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.averageTimeMs - b.averageTimeMs;
    });

    // Assign ranking numbers and persist to Scores table
    for (let i = 0; i < ranks.length; i++) {
      ranks[i].rank = i + 1;
      
      // Calculate Chilean Grade: 1.0 to 7.0 at 60% requirement
      const totalSessionQuestions = await prisma.question.count({
        where: {
          quiz: {
            liveSessions: {
              some: { id: sessionId }
            }
          }
        }
      });

      const grade = this.calculateChileanGrade(ranks[i].correctAnswers, totalSessionQuestions || 1);

      await prisma.score.upsert({
        where: { participantId: ranks[i].participantId },
        update: {
          totalScore: ranks[i].totalScore,
          correctAnswers: ranks[i].correctAnswers,
          averageTimeMs: ranks[i].averageTimeMs,
          rank: ranks[i].rank,
          finalGrade: grade
        },
        create: {
          sessionId,
          participantId: ranks[i].participantId,
          totalScore: ranks[i].totalScore,
          correctAnswers: ranks[i].correctAnswers,
          averageTimeMs: ranks[i].averageTimeMs,
          rank: ranks[i].rank,
          finalGrade: grade
        }
      });
    }

    return ranks;
  }

  /**
   * Chilean Grade Calculator: standard 60% requirement scale (1.0 to 7.0)
   */
  static calculateChileanGrade(score: number, maxScore: number): number {
    if (maxScore <= 0) return 1.0;
    const ratio = score / maxScore;
    if (ratio < 0.6) {
      return Number((1.0 + (3.0 * (score / (0.6 * maxScore)))).toFixed(1));
    } else {
      return Number((4.0 + (3.0 * ((score - 0.6 * maxScore) / (0.4 * maxScore)))).toFixed(1));
    }
  }
}

