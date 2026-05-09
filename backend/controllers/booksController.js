import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/config.js';

const PROGRESS_FILE = path.join(CONFIG.DATA_PATH, 'progress.json');

const readProgress = () => {
  if (!fs.existsSync(PROGRESS_FILE)) return { progress: {} };
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { progress: {} };
  }
};

const writeProgress = (data) => {
  if (!fs.existsSync(CONFIG.DATA_PATH)) {
    fs.mkdirSync(CONFIG.DATA_PATH, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
};

const getBookTitle = (filename) => {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

export const getBooks = (req, res) => {
  try {
    if (!fs.existsSync(CONFIG.BOOKS_PATH)) {
      fs.mkdirSync(CONFIG.BOOKS_PATH, { recursive: true });
    }

    const files = fs.readdirSync(CONFIG.BOOKS_PATH).filter((f) => f.toLowerCase().endsWith('.pdf'));

    const books = files.map((filename) => {
      const filePath = path.join(CONFIG.BOOKS_PATH, filename);
      const stat = fs.statSync(filePath);
      const id = encodeURIComponent(filename);

      return {
        id,
        title: getBookTitle(filename),
        filename,
        size: stat.size,
        addedAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    return res.json({ books, total: books.length });
  } catch (err) {
    console.error('Get books error:', err);
    return res.status(500).json({ message: 'Failed to read books directory' });
  }
};

export const streamBook = (req, res) => {
  try {
    const { bookId } = req.params;
    const filename = decodeURIComponent(bookId);
    const filePath = path.join(CONFIG.BOOKS_PATH, filename);

    // Security: prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedBooks = path.resolve(CONFIG.BOOKS_PATH);
    if (!resolvedPath.startsWith(resolvedBooks)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, max-age=3600',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Stream book error:', err);
    return res.status(500).json({ message: 'Failed to stream book' });
  }
};

export const saveProgress = (req, res) => {
  try {
    const { bookId } = req.params;
    const { page, total, title } = req.body;
    const userId = req.user.id;

    if (!page || !total) {
      return res.status(400).json({ message: 'Page and total required' });
    }

    const data = readProgress();
    if (!data.progress[userId]) data.progress[userId] = {};

    data.progress[userId][bookId] = {
      bookId,
      currentPage: parseInt(page),
      totalPages: parseInt(total),
      title: title || decodeURIComponent(bookId),
      lastRead: new Date().toISOString(),
    };

    writeProgress(data);
    return res.json({ message: 'Progress saved' });
  } catch (err) {
    console.error('Save progress error:', err);
    return res.status(500).json({ message: 'Failed to save progress' });
  }
};

export const getBookProgress = (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const data = readProgress();
    const progress = data.progress?.[userId]?.[bookId] || null;
    return res.json({ progress });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get progress' });
  }
};

export const getAllProgress = (req, res) => {
  try {
    const userId = req.user.id;
    const data = readProgress();
    const userProgress = data.progress?.[userId] || {};
    return res.json({ progress: userProgress });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get progress' });
  }
};
