import { Router } from 'express';
import {
  getBooks,
  streamBook,
  saveProgress,
  getBookProgress,
  getAllProgress,
} from '../controllers/booksController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All book routes require authentication
router.get('/', authenticateToken, getBooks);
router.get('/progress/all', authenticateToken, getAllProgress);
router.get('/:bookId/stream', authenticateToken, streamBook);
router.get('/:bookId/progress', authenticateToken, getBookProgress);
router.post('/:bookId/progress', authenticateToken, saveProgress);

export default router;
