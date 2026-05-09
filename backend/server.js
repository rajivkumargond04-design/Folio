import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { CONFIG } from './config/config.js';
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import fs from 'fs';

const app = express();

// Ensure storage directories exist
[CONFIG.STORAGE_PATH, CONFIG.DATA_PATH, CONFIG.BOOKS_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  })
);

// Rate limiting - relaxed for book streaming
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Too many requests' },
});

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    booksPath: CONFIG.BOOKS_PATH,
  });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/books', generalLimiter, booksRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Start server
app.listen(CONFIG.PORT, () => {
  console.log('\n🚀 Folio Backend Server Started');
  console.log(`   Port    : ${CONFIG.PORT}`);
  console.log(`   Books   : ${CONFIG.BOOKS_PATH}`);
  console.log(`   Origins : ${CONFIG.ALLOWED_ORIGINS.join(', ')}`);
  console.log('\n📚 Place your PDF books in:');
  console.log(`   ${CONFIG.BOOKS_PATH}\n`);
});

export default app;
