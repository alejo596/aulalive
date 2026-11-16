import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(RoleType.ADMIN));

router.get('/stats', AdminController.getSystemStats);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/toggle-status', AdminController.toggleUserStatus);
router.get('/courses', AdminController.getCourses);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;

