import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(RoleType.ADMIN, RoleType.TEACHER));

router.get('/', QuizController.getTeacherQuizzes);
router.get('/:id', QuizController.getQuizById);
router.post('/', QuizController.createQuiz);
router.put('/:id', QuizController.updateQuiz);
router.delete('/:id', QuizController.deleteQuiz);
router.post('/:id/duplicate', QuizController.duplicateQuiz);

export default router;

