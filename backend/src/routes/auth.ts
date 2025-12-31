import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Customer', 'Manager', 'Admin']).withMessage('Invalid role'),
  body('contact_info').optional().trim()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, password, role, contact_info } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (name, email, password, role, contact_info) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, contact_info || null]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;

    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, contact_info, created_at FROM users WHERE id = ?',
      [req.user?.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update current user profile
router.put('/profile', authenticate, [
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('contact_info').optional().trim(),
  body('current_password').optional(),
  body('new_password').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, contact_info, current_password, new_password } = req.body;
    const userId = req.user?.userId;

    // If changing password, verify current password
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: 'Current password is required to set new password' });
      }

      const [users] = await pool.query<RowDataPacket[]>(
        'SELECT password FROM users WHERE id = ?', [userId]
      );

      const isMatch = await bcrypt.compare(current_password, users[0].password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (contact_info !== undefined) { updates.push('contact_info = ?'); params.push(contact_info); }
    if (new_password) {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Verify token
router.get('/verify', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    valid: true, 
    user: { 
      userId: req.user?.userId, 
      email: req.user?.email, 
      role: req.user?.role 
    } 
  });
});

export default router;
