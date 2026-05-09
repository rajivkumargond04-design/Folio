import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/config.js';

const USERS_FILE = path.join(CONFIG.DATA_PATH, 'users.json');

// Ensure storage dirs exist
const ensureDirs = () => {
  [CONFIG.STORAGE_PATH, CONFIG.DATA_PATH, CONFIG.BOOKS_PATH].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize default user if not exists
const initUsers = () => {
  ensureDirs();
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = {
      users: [
        {
          id: '1',
          username: 'Rajiv Kumar Gond',
          passwordHash: bcrypt.hashSync('root', CONFIG.BCRYPT_ROUNDS),
          universalPasswordHash: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    console.log('✅ Default user created: Rajiv Kumar Gond / root');
  }
};

const readUsers = () => {
  initUsers();
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeUsers = (data) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRY }
  );
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password required' });
    }

    const { users } = readUsers();
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check main password
    const mainMatch = await bcrypt.compare(password, user.passwordHash);

    // Check universal password
    let universalMatch = false;
    if (!mainMatch && user.universalPasswordHash) {
      universalMatch = await bcrypt.compare(password, user.universalPasswordHash);
    }

    if (!mainMatch && !universalMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      token,
      username: user.username,
      loginType: mainMatch ? 'standard' : 'universal',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const logout = (req, res) => {
  return res.json({ message: 'Logged out successfully' });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const data = readUsers();
    const userIndex = data.users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = data.users[userIndex];
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    data.users[userIndex].passwordHash = await bcrypt.hash(newPassword, CONFIG.BCRYPT_ROUNDS);
    writeUsers(data);

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const setUniversalPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const data = readUsers();
    const userIndex = data.users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    data.users[userIndex].universalPasswordHash = await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);
    writeUsers(data);

    return res.json({ message: 'Universal password set successfully' });
  } catch (err) {
    console.error('Set universal password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const removeUniversalPassword = async (req, res) => {
  try {
    const data = readUsers();
    const userIndex = data.users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    data.users[userIndex].universalPasswordHash = null;
    writeUsers(data);

    return res.json({ message: 'Universal password removed' });
  } catch (err) {
    console.error('Remove universal password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getUniversalPasswordStatus = async (req, res) => {
  try {
    const data = readUsers();
    const user = data.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ hasUniversalPassword: !!user.universalPasswordHash });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};
