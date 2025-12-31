import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ==================== USER MANAGEMENT ====================

// Get all users with filters
router.get('/users', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search } = req.query;
    let query = `SELECT id, name, email, role, contact_info, is_active, created_at FROM users WHERE 1=1`;
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status === 'active') {
      query += ' AND is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND is_active = 0';
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await pool.query<RowDataPacket[]>(query, params);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user
router.get('/users/:id', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, role, contact_info, is_active, created_at FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's activity stats
    const [stats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM queue WHERE customer_id = ?) as total_queue_joins,
        (SELECT COUNT(*) FROM restaurant_tables WHERE current_customer_id = ? AND status = 'Reserved') as active_reservations
    `, [id, id]);

    res.json({ ...users[0], stats: stats[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Create new user (Admin can create any role)
router.post('/users', authenticate, authorize('Admin'), [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Customer', 'Manager', 'Admin']).withMessage('Invalid role'),
  body('contact_info').optional().trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, role, contact_info } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password, role, contact_info, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, email, hashedPassword, role, contact_info || null]
    );

    // Log admin action
    await logAdminAction(req.user?.userId!, 'CREATE_USER', `Created user: ${email} with role: ${role}`);

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Update user
router.put('/users/:id', authenticate, authorize('Admin'), [
  body('name').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['Customer', 'Manager', 'Admin']),
  body('contact_info').optional().trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    const { name, email, role, contact_info } = req.body;

    // Prevent self-role change
    if (Number(id) === req.user?.userId && role && role !== req.user?.role) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Check email uniqueness
    if (email) {
      const [emailCheck] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

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
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAdminAction(req.user?.userId!, 'UPDATE_USER', `Updated user ID: ${id}`);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Activate/Deactivate user
router.patch('/users/:id/status', authenticate, authorize('Admin'), [
  body('is_active').isBoolean().withMessage('is_active must be boolean')
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (Number(id) === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAdminAction(req.user?.userId!, is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', `User ID: ${id}`);

    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Clear user's reservations first
    await pool.query(
      `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL 
       WHERE current_customer_id = ?`, [id]
    );

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAdminAction(req.user?.userId!, 'DELETE_USER', `Deleted user ID: ${id}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});


// ==================== TABLE OVERSIGHT ====================

// Get all tables with details
router.get('/tables', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT t.*, u.name as customer_name, u.email as customer_email
      FROM restaurant_tables t
      LEFT JOIN users u ON t.current_customer_id = u.id
      ORDER BY t.table_number
    `);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Error fetching tables' });
  }
});

// Enable/Disable table
router.patch('/tables/:id/status', authenticate, authorize('Admin'), [
  body('is_enabled').isBoolean().withMessage('is_enabled must be boolean')
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;

    // If disabling, clear any reservations
    if (!is_enabled) {
      await pool.query(
        `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL, is_enabled = 0 WHERE id = ?`,
        [id]
      );
    } else {
      await pool.query('UPDATE restaurant_tables SET is_enabled = 1 WHERE id = ?', [id]);
    }

    await logAdminAction(req.user?.userId!, is_enabled ? 'ENABLE_TABLE' : 'DISABLE_TABLE', `Table ID: ${id}`);

    res.json({ message: `Table ${is_enabled ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ message: 'Error updating table status' });
  }
});

// ==================== QUEUE & RESERVATION MONITORING ====================

// Get queue overview
router.get('/queue', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [queue] = await pool.query<RowDataPacket[]>(`
      SELECT q.*, u.name as customer_name, u.email, u.contact_info
      FROM queue q
      JOIN users u ON q.customer_id = u.id
      ORDER BY q.status = 'Waiting' DESC, q.position ASC, q.joined_at DESC
    `);

    const [stats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(CASE WHEN status = 'Waiting' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'Seated' THEN 1 END) as seated_today,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_today,
        AVG(CASE WHEN status = 'Waiting' THEN party_size END) as avg_party_size
      FROM queue WHERE DATE(joined_at) = CURDATE()
    `);

    res.json({ queue, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ message: 'Error fetching queue' });
  }
});

// Admin cancel queue entry
router.delete('/queue/:id', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE queue SET status = 'Cancelled' WHERE id = ?`, [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    await logAdminAction(req.user?.userId!, 'CANCEL_QUEUE', `Queue ID: ${id}, Reason: ${reason || 'Admin override'}`);

    res.json({ message: 'Queue entry cancelled' });
  } catch (error) {
    console.error('Error cancelling queue:', error);
    res.status(500).json({ message: 'Error cancelling queue entry' });
  }
});

// Get reservations overview
router.get('/reservations', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [reservations] = await pool.query<RowDataPacket[]>(`
      SELECT t.*, u.name as customer_name, u.email, u.contact_info
      FROM restaurant_tables t
      JOIN users u ON t.current_customer_id = u.id
      WHERE t.status IN ('Reserved', 'Occupied')
      ORDER BY t.reservation_time ASC
    `);

    const [stats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(CASE WHEN status = 'Reserved' THEN 1 END) as reserved_count,
        COUNT(CASE WHEN status = 'Occupied' THEN 1 END) as occupied_count
      FROM restaurant_tables
    `);

    res.json({ reservations, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// Admin cancel reservation
router.delete('/reservations/:tableId', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { reason } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL 
       WHERE id = ? AND status IN ('Reserved', 'Occupied')`, [tableId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    await logAdminAction(req.user?.userId!, 'CANCEL_RESERVATION', `Table ID: ${tableId}, Reason: ${reason || 'Admin override'}`);

    res.json({ message: 'Reservation cancelled' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ message: 'Error cancelling reservation' });
  }
});

// ==================== ANALYTICS & DASHBOARD ====================

// Get comprehensive dashboard stats
router.get('/dashboard', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    // User stats
    const [userStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'Customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN role = 'Manager' THEN 1 ELSE 0 END) as managers,
        SUM(CASE WHEN role = 'Admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
      FROM users
    `);

    // Table stats
    const [tableStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(capacity) as total_capacity,
        SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled_tables,
        SUM(CASE WHEN is_enabled = 0 THEN 1 ELSE 0 END) as disabled_tables
      FROM restaurant_tables
    `);

    // Queue stats
    const [queueStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(CASE WHEN status = 'Waiting' THEN 1 END) as current_waiting,
        SUM(CASE WHEN status = 'Waiting' THEN party_size ELSE 0 END) as people_waiting,
        COUNT(CASE WHEN DATE(joined_at) = CURDATE() AND status = 'Seated' THEN 1 END) as seated_today,
        COUNT(CASE WHEN DATE(joined_at) = CURDATE() THEN 1 END) as joins_today
      FROM queue
    `);

    // Reservation stats
    const [reservationStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as active_reservations,
        COUNT(CASE WHEN DATE(reservation_time) = CURDATE() THEN 1 END) as today_reservations
      FROM restaurant_tables WHERE status = 'Reserved'
    `);

    // Recent activity (last 7 days)
    const [dailyActivity] = await pool.query<RowDataPacket[]>(`
      SELECT 
        DATE(joined_at) as date,
        COUNT(*) as queue_joins,
        SUM(CASE WHEN status = 'Seated' THEN 1 ELSE 0 END) as seated
      FROM queue 
      WHERE joined_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(joined_at)
      ORDER BY date ASC
    `);

    // Peak hours analysis
    const [peakHours] = await pool.query<RowDataPacket[]>(`
      SELECT 
        HOUR(joined_at) as hour,
        COUNT(*) as count
      FROM queue 
      WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY HOUR(joined_at)
      ORDER BY count DESC
      LIMIT 5
    `);

    // Table utilization
    const [tableUtilization] = await pool.query<RowDataPacket[]>(`
      SELECT 
        type,
        COUNT(*) as total,
        SUM(CASE WHEN status != 'Available' THEN 1 ELSE 0 END) as in_use
      FROM restaurant_tables
      GROUP BY type
    `);

    res.json({
      users: userStats[0],
      tables: tableStats[0],
      queue: queueStats[0],
      reservations: reservationStats[0],
      dailyActivity,
      peakHours,
      tableUtilization
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});


// ==================== SYSTEM CONFIGURATION ====================

// Get system settings
router.get('/settings', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [settings] = await pool.query<RowDataPacket[]>('SELECT * FROM system_settings');
    
    // Convert to key-value object
    const settingsObj: Record<string, any> = {};
    settings.forEach((s: any) => {
      settingsObj[s.setting_key] = s.setting_value;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update system setting
router.put('/settings/:key', authenticate, authorize('Admin'), [
  body('value').notEmpty().withMessage('Value is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [key, value, value]
    );

    await logAdminAction(req.user?.userId!, 'UPDATE_SETTING', `${key} = ${value}`);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ message: 'Error updating setting' });
  }
});

// ==================== ADMIN LOGS ====================

// Get admin action logs
router.get('/logs', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, action_type } = req.query;
    
    let query = `
      SELECT al.*, u.name as admin_name, u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
    `;
    const params: any[] = [];

    if (action_type) {
      query += ' WHERE al.action_type = ?';
      params.push(action_type);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const [logs] = await pool.query<RowDataPacket[]>(query, params);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

// Get error logs
router.get('/errors', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [errors] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM error_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(errors);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ message: 'Error fetching error logs' });
  }
});

// ==================== SYSTEM STATUS ====================

router.get('/system-status', authenticate, authorize('Admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Database connection check
    const [dbCheck] = await pool.query<RowDataPacket[]>('SELECT 1 as connected');
    
    // Get table counts
    const [counts] = await pool.query<RowDataPacket[]>(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM restaurant_tables) as tables,
        (SELECT COUNT(*) FROM queue) as queue_entries
    `);

    res.json({
      status: 'healthy',
      database: {
        connected: dbCheck.length > 0,
        ...counts[0]
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ status: 'unhealthy', message: 'System check failed' });
  }
});

// Helper function to log admin actions
async function logAdminAction(adminId: number, actionType: string, details: string) {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action_type, details) VALUES (?, ?, ?)',
      [adminId, actionType, details]
    );
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

export default router;
