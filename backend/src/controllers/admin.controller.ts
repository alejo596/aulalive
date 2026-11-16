import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { RoleType } from '@prisma/client';

export class AdminController {
  static async getSystemStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [totalUsers, totalTeachers, totalStudents, totalQuizzes, totalSessions, totalResponses] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: { name: RoleType.TEACHER } } }),
        prisma.user.count({ where: { role: { name: RoleType.STUDENT } } }),
        prisma.quiz.count(),
        prisma.liveSession.count(),
        prisma.response.count()
      ]);

      const recentSessions = await prisma.liveSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: { select: { title: true } },
          hostTeacher: { select: { firstName: true, lastName: true } },
          _count: { select: { participants: true, responses: true } }
        }
      });

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalTeachers,
          totalStudents,
          totalQuizzes,
          totalSessions,
          totalResponses
        },
        recentSessions
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { role: true }
      });

      res.json({
        success: true,
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          rut: u.rut,
          role: u.role.name,
          isActive: u.isActive,
          createdAt: u.createdAt
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ADMIN_TOGGLE_USER_STATUS',
          entityType: 'User',
          entityId: id,
          details: { isActive: updated.isActive },
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: `Usuario ${updated.isActive ? 'activado' : 'desactivado'} con éxito`,
        isActive: updated.isActive
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      });

      res.json({ success: true, logs });
    } catch (error) {
      next(error);
    }
  }

  static async getCourses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const courses = await prisma.course.findMany({
        include: {
          subjects: true,
          _count: { select: { enrollments: true } }
        }
      });
      res.json({ success: true, courses });
    } catch (error) {
      next(error);
    }
  }
}

