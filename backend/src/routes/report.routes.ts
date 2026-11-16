import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(RoleType.ADMIN, RoleType.TEACHER));

router.get('/:sessionId/excel', ReportController.downloadExcel);
router.get('/:sessionId/csv', ReportController.downloadCSV);
router.get('/:sessionId/pdf', ReportController.downloadPDF);

export default router;

