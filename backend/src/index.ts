import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, logError } from './config/database';
import authRoutes from './routes/auth';
import tableRoutes from './routes/tables';
import queueRoutes from './routes/queue';
import reservationRoutes from './routes/reservations';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import chatbotRoutes from './routes/chatbot';
import notificationRoutes from './routes/notifications';
import { AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Global error handler (must be after routes)
app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error:', err);
  
  // Log error to database
  const authReq = req as AuthRequest;
  await logError(
    'UNHANDLED_ERROR',
    err.message,
    err.stack,
    authReq.user?.userId,
    req.path
  );

  // Send appropriate response
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await logError('UNCAUGHT_EXCEPTION', err.message, err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason: any) => {
  console.error('Unhandled Rejection:', reason);
  await logError('UNHANDLED_REJECTION', reason?.message || String(reason), reason?.stack);
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(async (error) => {
    console.error('Failed to initialize database:', error);
    await logError('DB_INIT_ERROR', error.message, error.stack);
    process.exit(1);
  });
