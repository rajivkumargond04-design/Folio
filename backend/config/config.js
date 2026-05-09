import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'folio-super-secret-jwt-key-2024-private',
  JWT_EXPIRY: '7d',
  BCRYPT_ROUNDS: 14,
  STORAGE_PATH: path.resolve(__dirname, '../storage'),
  BOOKS_PATH: path.resolve(__dirname, '../storage/books'),
  DATA_PATH: path.resolve(__dirname, '../storage/data'),
  ALLOWED_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
};
