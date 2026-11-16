import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import quizRoutes from './routes/quiz.routes';
import sessionRoutes from './routes/session.routes';
import reportRoutes from './routes/report.routes';

export const createApp = (): Application => {
  const app = express();

  // Global Middlewares
  app.use(helmet({
    contentSecurityPolicy: false // Allow embedding in educational iframe / projection views
  }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'AulaLive Real-Time API',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/reports', reportRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;

