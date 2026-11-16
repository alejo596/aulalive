import { RoleType, QuestionType, SessionStatus } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: RoleType;
  firstName: string;
  lastName: string;
}

export interface QuestionDTO {
  id?: string;
  orderNum: number;
  text: string;
  type: QuestionType;
  points: number;
  timeLimitSec: number;
  imageUrl?: string | null;
  explanation?: string | null;
  answerOptions: AnswerOptionDTO[];
}

export interface AnswerOptionDTO {
  id?: string;
  orderNum: number;
  text: string;
  isCorrect: boolean;
  weight?: number;
  imageUrl?: string | null;
}

export interface LiveStatsDTO {
  sessionId: string;
  questionId: string;
  totalParticipants: number;
  totalResponses: number;
  participationPercentage: number;
  distribution: { [optionId: string]: number };
  correctCount: number;
  incorrectCount: number;
  averageTimeMs: number;
  averageScore: number;
  wordCloud?: { text: string; count: number }[];
  leaderboard?: ParticipantRankDTO[];
}

export interface ParticipantRankDTO {
  rank: number;
  participantId: string;
  nickname: string;
  totalScore: number;
  correctAnswers: number;
  averageTimeMs: number;
}

