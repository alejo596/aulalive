import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { RoleType } from '@prisma/client';

export const requireRole = (...allowedRoles: RoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado: se requiere uno de los siguientes roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

