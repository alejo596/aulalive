import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as crypto from 'crypto';
import { z } from 'zod';
import { RoleType } from '@prisma/client';

function hashPassword(password: string): string {
  const salt = 'aulalive_secure_salt_2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  rut: z.string().optional(),
  roleName: z.enum(['TEACHER', 'STUDENT']).default('STUDENT')
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { email },
          include: { role: true }
        });
      } catch (dbErr: any) {
        console.warn('⚠️ PostgreSQL no responde en puerto 5432:', dbErr.message);

        // Fallback seguro de desarrollo si la base de datos aun no se ha iniciado
        if (email === 'docente@aulalive.edu' && password === 'Docente1234*') {
          const token = generateToken({
            id: 'mock-teacher-id',
            email: 'docente@aulalive.edu',
            role: 'TEACHER',
            firstName: 'Profesor (Modo Local)',
            lastName: 'González'
          });
          return res.json({
            success: true,
            token,
            user: {
              id: 'mock-teacher-id',
              email: 'docente@aulalive.edu',
              role: 'TEACHER',
              firstName: 'Profesor (Modo Local)',
              lastName: 'González'
            },
            notice: 'Iniciado en modo local. Inicia PostgreSQL con INICIAR_TODO.bat para persistencia completa.'
          });
        } else if (email === 'admin@aulalive.edu' && password === 'Admin1234*') {
          const token = generateToken({
            id: 'mock-admin-id',
            email: 'admin@aulalive.edu',
            role: 'ADMIN',
            firstName: 'Administrador (Modo Local)',
            lastName: 'Sistema'
          });
          return res.json({
            success: true,
            token,
            user: {
              id: 'mock-admin-id',
              email: 'admin@aulalive.edu',
              role: 'ADMIN',
              firstName: 'Administrador (Modo Local)',
              lastName: 'Sistema'
            },
            notice: 'Iniciado en modo local. Inicia PostgreSQL con INICIAR_TODO.bat para persistencia completa.'
          });
        }

        return res.status(503).json({
          success: false,
          message: 'La base de datos PostgreSQL no está iniciada en localhost:5432. Por favor ejecuta el archivo "INICIAR_TODO.bat" en d:\\unidad2 para encender la base de datos automáticamente.'
        });
      }

      if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Usuario desactivado. Contacte al administrador.'
        });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role.name,
        firstName: user.firstName,
        lastName: user.lastName
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'AUTH_LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          rut: user.rut
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: data.email }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }

      const role = await prisma.role.findUnique({
        where: { name: data.roleName as RoleType }
      });
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Rol no válido'
        });
      }

      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: hashPassword(data.password),
          firstName: data.firstName,
          lastName: data.lastName,
          rut: data.rut,
          roleId: role.id
        },
        include: { role: true }
      });

      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role.name,
          rut: newUser.rut
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'No autenticado' });

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });

      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          rut: user.rut,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

