import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Helper to check if queue is enabled
async function isQueueEnabled(): Promise<boolean> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'queue_enabled'`
    );
    return rows.length === 0 || rows[0].setting_value === 'true';
  } catch {
    return true; // Default to enabled if error
  }
}

// Get queue settings (for frontend)
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const queueEnabled = await isQueueEnabled();
    const [maxSizeResult] = await pool.query<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'max_queue_size'`
    );
    const maxQueueSize = maxSizeResult.length > 0 ? parseInt(maxSizeResult[0].setting_value) : 50;
    
    res.json({
      queue_enabled: queueEnabled,
      max_queue_size: maxQueueSize
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Get queue (all waiting entries)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [queue] = await pool.query<RowDataPacket[]>(`
      SELECT q.*, u.name as customer_name, u.contact_info
      FROM queue q
      JOIN users u ON q.customer_id = u.id
      WHERE q.status = 'Waiting'
      ORDER BY q.position ASC
    `);
    res.json(queue);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ message: 'Error fetching queue' });
  }
});

// Get customer's queue position
router.get('/my-position', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [entries] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, 
        (SELECT COUNT(*) FROM queue WHERE status = 'Waiting' AND position < q.position) + 1 as current_position,
        (SELECT COUNT(*) FROM queue WHERE status = 'Waiting') as total_waiting
      FROM queue q 
      WHERE q.customer_id = ? AND q.status = 'Waiting'`,
      [req.user?.userId]
    );

    if (entries.length === 0) {
      return res.json({ inQueue: false });
    }

    const entry = entries[0];
    const estimatedWait = entry.current_position * 15; // 15 min per party estimate

    res.json({
      inQueue: true,
      position: entry.current_position,
      totalWaiting: entry.total_waiting,
      estimatedWaitMinutes: estimatedWait,
      partySize: entry.party_size,
      tableType: entry.table_type,
      queueId: entry.id
    });
  } catch (error) {
    console.error('Error fetching queue position:', error);
    res.status(500).json({ message: 'Error fetching queue position' });
  }
});

// Join queue
router.post('/join', authenticate, [
  body('party_size').isInt({ min: 1, max: 20 }).withMessage('Party size must be between 1 and 20'),
  body('table_type').isIn(['Regular', 'VIP']).withMessage('Table type must be Regular or VIP')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if queue is enabled
    if (!(await isQueueEnabled())) {
      return res.status(403).json({ message: 'Queue system is currently disabled' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { party_size, table_type } = req.body;
    const customerId = req.user?.userId;

    // Check if already in queue
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM queue WHERE customer_id = ? AND status = 'Waiting'`,
      [customerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already in the queue' });
    }

    // Check max queue size
    const [settings] = await pool.query<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'max_queue_size'`
    );
    const maxQueueSize = settings.length > 0 ? parseInt(settings[0].setting_value) : 50;

    const [currentCount] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM queue WHERE status = 'Waiting'`
    );
    if (currentCount[0].count >= maxQueueSize) {
      return res.status(400).json({ message: `Queue is full (max ${maxQueueSize} parties)` });
    }

    // Get next position
    const [maxPos] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM queue WHERE status = 'Waiting'`
    );
    const nextPosition = maxPos[0].next_position;

    await pool.query(
      'INSERT INTO queue (customer_id, party_size, table_type, position) VALUES (?, ?, ?, ?)',
      [customerId, party_size, table_type, nextPosition]
    );

    res.status(201).json({ 
      message: 'Successfully joined the queue',
      position: nextPosition
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ message: 'Error joining queue' });
  }
});

// Leave queue
router.delete('/leave', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.user?.userId;

    // Get the position of the leaving customer
    const [leaving] = await pool.query<RowDataPacket[]>(
      `SELECT position FROM queue WHERE customer_id = ? AND status = 'Waiting'`,
      [customerId]
    );

    if (leaving.length === 0) {
      return res.status(404).json({ message: 'You are not in the queue' });
    }

    const leavingPosition = leaving[0].position;

    // Update status to cancelled
    await pool.query(
      `UPDATE queue SET status = 'Cancelled' WHERE customer_id = ? AND status = 'Waiting'`,
      [customerId]
    );

    // Auto-update positions: decrease position for all entries after the leaving one
    await pool.query(
      `UPDATE queue SET position = position - 1 WHERE status = 'Waiting' AND position > ?`,
      [leavingPosition]
    );

    res.json({ message: 'Successfully left the queue' });
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ message: 'Error leaving queue' });
  }
});

// Seat customer from queue (Manager only)
router.post('/seat/:queueId', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;
    const { tableId, duration } = req.body;

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID is required' });
    }

    // Get queue entry
    const [entries] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.name as customer_name FROM queue q
       JOIN users u ON q.customer_id = u.id
       WHERE q.id = ? AND q.status = 'Waiting'`, [queueId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    const entry = entries[0];

    // Check table availability
    const [tables] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM restaurant_tables WHERE id = ? AND status = 'Available' AND is_enabled = 1`, [tableId]
    );

    if (tables.length === 0) {
      return res.status(400).json({ message: 'Table not available or disabled' });
    }

    const table = tables[0];
    if (table.capacity < entry.party_size) {
      return res.status(400).json({ message: 'Table capacity insufficient for party size' });
    }

    // Get default duration from settings if not provided
    let seatDuration = duration;
    if (!seatDuration) {
      const [settings] = await pool.query<RowDataPacket[]>(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'default_reservation_duration'`
      );
      seatDuration = settings.length > 0 ? parseInt(settings[0].setting_value) : 60;
    }

    // Update queue entry
    await pool.query(`UPDATE queue SET status = 'Seated' WHERE id = ?`, [queueId]);

    // Auto-update positions for remaining queue entries
    await pool.query(
      `UPDATE queue SET position = position - 1 WHERE status = 'Waiting' AND position > ?`,
      [entry.position]
    );

    // Format current time for MySQL
    const now = new Date();
    const formatForMySQL = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };

    // Update table with occupied_at and duration
    await pool.query(
      `UPDATE restaurant_tables SET status = 'Occupied', current_customer_id = ?, occupied_at = ?, reservation_duration = ? WHERE id = ?`,
      [entry.customer_id, formatForMySQL(now), seatDuration, tableId]
    );

    // Schedule notification for table vacate
    const { scheduleVacateNotification } = await import('../services/notificationScheduler');
    await scheduleVacateNotification(
      parseInt(tableId),
      table.table_number,
      entry.customer_id,
      entry.customer_name,
      seatDuration
    );

    res.json({ 
      message: 'Customer seated successfully',
      duration: seatDuration,
      expectedVacateTime: new Date(now.getTime() + seatDuration * 60 * 1000)
    });
  } catch (error) {
    console.error('Error seating customer:', error);
    res.status(500).json({ message: 'Error seating customer' });
  }
});

export default router;
