import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import testResultsRoutes from './routes/testResults.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import { securityHeaders, authCorsOptions } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Apply security headers to all routes
app.use(securityHeaders);

// CORS Configuration
app.use('/api/auth', cors(authCorsOptions));
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative dev port
    'https://santhoshsiddhu75.github.io' // GitHub Pages
  ],
  credentials: true
}));

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain'],
  strict: false
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', testResultsRoutes);
app.use('/api', usersRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  try {
    const { database } = await import('./db/database.js');
    await database.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  try {
    const { database } = await import('./db/database.js');
    await database.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 API endpoints: http://localhost:${PORT}/api`);
});

export default app;