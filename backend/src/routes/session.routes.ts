import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Public student endpoints (by PIN or session ID)
router.post('/join', SessionController.joinSession);
router.get('/:id/state', SessionController.getSessionState);
router.get('/:id/stats/:questionId', SessionController.getLiveStats);

// Teacher/Admin authenticated endpoints
router.post('/', authenticateToken, requireRole(RoleType.ADMIN, RoleType.TEACHER), SessionController.createSession);
router.patch('/:id/status', authenticateToken, requireRole(RoleType.ADMIN, RoleType.TEACHER), SessionController.updateSessionStatus);

export default router;

