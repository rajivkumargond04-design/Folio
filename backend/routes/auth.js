import { Router } from 'express';
import {
  login,
  logout,
  changePassword,
  setUniversalPassword,
  removeUniversalPassword,
  getUniversalPasswordStatus,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/change-password', authenticateToken, changePassword);
router.post('/universal-password', authenticateToken, setUniversalPassword);
router.delete('/universal-password', authenticateToken, removeUniversalPassword);
router.get('/universal-password-status', authenticateToken, getUniversalPasswordStatus);

export default router;
