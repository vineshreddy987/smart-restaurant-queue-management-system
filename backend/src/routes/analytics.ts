import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get dashboard analytics (Admin/Manager)
router.get('/dashboard', authenticate, authorize('Admin', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    // Table statistics
    const [tableStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_tables,
        SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_tables,
        SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved_tables,
        SUM(capacity) as total_capacity
      FROM restaurant_tables
    `);

    // Queue statistics
    const [queueStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_in_queue,
        SUM(party_size) as total_people_waiting,
        AVG(party_size) as avg_party_size
      FROM queue WHERE status = 'Waiting'
    `);

    // Today's activity
    const [todayStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM queue WHERE DATE(joined_at) = CURDATE()) as queue_joins_today,
        (SELECT COUNT(*) FROM queue WHERE DATE(joined_at) = CURDATE() AND status = 'Seated') as seated_today,
        (SELECT COUNT(*) FROM queue WHERE DATE(joined_at) = CURDATE() AND status = 'Cancelled') as cancelled_today
    `);

    // User statistics
    const [userStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'Customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN role = 'Manager' THEN 1 ELSE 0 END) as managers,
        SUM(CASE WHEN role = 'Admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Table type distribution
    const [tableTypes] = await pool.query<RowDataPacket[]>(`
      SELECT type, COUNT(*) as count, SUM(capacity) as total_capacity
      FROM restaurant_tables GROUP BY type
    `);

    // Recent queue activity (last 7 days)
    const [queueActivity] = await pool.query<RowDataPacket[]>(`
      SELECT 
        DATE(joined_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Seated' THEN 1 ELSE 0 END) as seated,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM queue 
      WHERE joined_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(joined_at)
      ORDER BY date ASC
    `);

    // Current reservations count
    const [reservationStats] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as active_reservations
      FROM restaurant_tables WHERE status = 'Reserved'
    `);

    res.json({
      tables: tableStats[0],
      queue: queueStats[0],
      today: todayStats[0],
      users: userStats[0],
      tableTypes,
      queueActivity,
      reservations: reservationStats[0]
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// ==================== USER MANAGEMENT (Admin Only) ====================

// Get all users
router.get('/users', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, contact_info, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user by ID
router.get('/users/:id', authenticate, authorize('Admin'), [
  param('id').isInt().withMessage('Valid user ID is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, contact_info, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user (Admin only)
router.put('/users/:id', authenticate, authorize('Admin'), [
  param('id').isInt().withMessage('Valid user ID is required'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['Customer', 'Manager', 'Admin']).withMessage('Invalid role'),
  body('contact_info').optional()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, role, contact_info } = req.body;

    // Check if user exists
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check email uniqueness if changing email
    if (email) {
      const [emailCheck] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (contact_info !== undefined) { updates.push('contact_info = ?'); params.push(contact_info); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Update user role (Admin only)
router.patch('/users/:id/role', authenticate, authorize('Admin'), [
  param('id').isInt().withMessage('Valid user ID is required'),
  body('role').isIn(['Customer', 'Manager', 'Admin']).withMessage('Invalid role')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (Number(id) === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET role = ? WHERE id = ?', [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticate, authorize('Admin'), [
  param('id').isInt().withMessage('Valid user ID is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (Number(id) === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check if user has active reservations or queue entries
    const [activeReservations] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM restaurant_tables WHERE current_customer_id = ? AND status IN ("Reserved", "Occupied")',
      [id]
    );

    if (activeReservations.length > 0) {
      return res.status(400).json({ message: 'Cannot delete user with active reservations. Cancel reservations first.' });
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// ==================== QUEUE MANAGEMENT (Admin Only) ====================

// Get all queue entries (including history)
router.get('/queue/all', authenticate, authorize('Admin', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT q.*, u.name as customer_name, u.email, u.contact_info
      FROM queue q
      JOIN users u ON q.customer_id = u.id
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE q.status = ?';
      params.push(status);
    }

    query += ' ORDER BY q.joined_at DESC';

    const [queue] = await pool.query<RowDataPacket[]>(query, params);
    res.json(queue);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ message: 'Error fetching queue' });
  }
});

// Remove customer from queue (Admin/Manager)
router.delete('/queue/:id', authenticate, authorize('Admin', 'Manager'), [
  param('id').isInt().withMessage('Valid queue ID is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE queue SET status = "Cancelled" WHERE id = ? AND status = "Waiting"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Queue entry not found or already processed' });
    }

    res.json({ message: 'Customer removed from queue' });
  } catch (error) {
    console.error('Error removing from queue:', error);
    res.status(500).json({ message: 'Error removing from queue' });
  }
});

// ==================== RESERVATION MANAGEMENT (Admin Only) ====================

// Get all reservations with filters
router.get('/reservations/all', authenticate, authorize('Admin', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT t.*, u.name as customer_name, u.email, u.contact_info
      FROM restaurant_tables t
      LEFT JOIN users u ON t.current_customer_id = u.id
      WHERE t.status IN ('Reserved', 'Occupied')
    `;
    const params: any[] = [];

    if (date) {
      query += ' AND DATE(t.reservation_time) = ?';
      params.push(date);
    }

    if (status) {
      query = query.replace("IN ('Reserved', 'Occupied')", '= ?');
      params.unshift(status);
    }

    query += ' ORDER BY t.reservation_time ASC';

    const [reservations] = await pool.query<RowDataPacket[]>(query, params);
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// ==================== SYSTEM STATS (Admin Only) ====================

// Get system overview
router.get('/system', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [dbStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM restaurant_tables) as total_tables,
        (SELECT COUNT(*) FROM queue) as total_queue_entries,
        (SELECT COUNT(*) FROM queue WHERE status = 'Waiting') as active_queue,
        (SELECT COUNT(*) FROM restaurant_tables WHERE status = 'Reserved') as active_reservations
    `);

    res.json({
      database: dbStats[0],
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ message: 'Error fetching system stats' });
  }
});

export default router;
