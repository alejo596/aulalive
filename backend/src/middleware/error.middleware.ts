import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ AulaLive Error Handler:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación en los datos enviados',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  if (err.code === 'P1001') {
    statusCode = 503;
    message = 'No se pudo conectar a la base de datos PostgreSQL en localhost:5432. Por favor inicia PostgreSQL (Docker o servicio local).';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

