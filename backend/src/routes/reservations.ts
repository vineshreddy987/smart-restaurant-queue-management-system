import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Reservation status constants
const ReservationStatus = {
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

// Helper to get system setting
async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    return rows.length > 0 ? rows[0].setting_value : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to check if reservations are enabled
async function isReservationEnabled(): Promise<boolean> {
  const value = await getSetting('reservation_enabled', 'true');
  return value === 'true';
}

// Get default reservation duration (for frontend)
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const defaultDuration = await getSetting('default_reservation_duration', '60');
    const minDuration = await getSetting('min_reservation_duration', '30');
    const maxDuration = await getSetting('max_reservation_duration', '180');
    const reservationEnabled = await getSetting('reservation_enabled', 'true');
    
    res.json({
      default_duration: parseInt(defaultDuration),
      min_duration: parseInt(minDuration),
      max_duration: parseInt(maxDuration),
      reservation_enabled: reservationEnabled === 'true'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Get all reservations (Manager)
router.get('/', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [reservations] = await pool.query<RowDataPacket[]>(`
      SELECT t.*, u.name as customer_name, u.contact_info
      FROM restaurant_tables t
      JOIN users u ON t.current_customer_id = u.id
      WHERE t.status = 'Reserved' AND t.reservation_time IS NOT NULL
      ORDER BY t.reservation_time ASC
    `);
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// Get customer's reservations
router.get('/my-reservations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [reservations] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM restaurant_tables 
       WHERE current_customer_id = ? AND status = 'Reserved'
       ORDER BY reservation_time ASC`,
      [req.user?.userId]
    );
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// ==================== BOOKING HISTORY ENDPOINTS ====================

// Get booking history (role-based)
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { status, startDate, endDate, tableId, customerId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT rh.*, 
             u.name as customer_name, u.email as customer_email, u.contact_info,
             cb.name as created_by_name, cb.role as created_by_user_role,
             sb.name as seated_by_name
      FROM reservation_history rh
      JOIN users u ON rh.customer_id = u.id
      LEFT JOIN users cb ON rh.created_by_id = cb.id
      LEFT JOIN users sb ON rh.seated_by_id = sb.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based filtering
    if (userRole === 'Customer') {
      // Customers can only see their own history
      query += ' AND rh.customer_id = ?';
      params.push(userId);
    } else if (userRole === 'Manager') {
      // Managers can see all customer reservations and their own actions
      // No additional filter needed - they see all
    }
    // Admin sees everything - no filter

    // Apply filters
    if (status) {
      query += ' AND rh.status = ?';
      params.push(status);
    }
    if (startDate) {
      query += ' AND DATE(rh.reservation_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(rh.reservation_time) <= ?';
      params.push(endDate);
    }
    if (tableId) {
      query += ' AND rh.table_id = ?';
      params.push(tableId);
    }
    if (customerId && userRole !== 'Customer') {
      query += ' AND rh.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY rh.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [history] = await pool.query<RowDataPacket[]>(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM reservation_history rh WHERE 1=1`;
    const countParams: any[] = [];

    if (userRole === 'Customer') {
      countQuery += ' AND rh.customer_id = ?';
      countParams.push(userId);
    }
    if (status) {
      countQuery += ' AND rh.status = ?';
      countParams.push(status);
    }
    if (startDate) {
      countQuery += ' AND DATE(rh.reservation_time) >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND DATE(rh.reservation_time) <= ?';
      countParams.push(endDate);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);

    res.json({
      history,
      total: countResult[0].total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Error fetching reservation history:', error);
    res.status(500).json({ message: 'Error fetching reservation history' });
  }
});

// Get history statistics (for dashboard)
router.get('/history/stats', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate) {
      dateFilter += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    const [stats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_reservations,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as active_reserved,
        SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as currently_occupied,
        AVG(reservation_duration) as avg_duration,
        AVG(party_size) as avg_party_size
      FROM reservation_history
      WHERE 1=1 ${dateFilter}
    `, params);

    // Daily breakdown for last 7 days
    const [dailyStats] = await pool.query<RowDataPacket[]>(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM reservation_history
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      summary: stats[0],
      dailyBreakdown: dailyStats
    });
  } catch (error) {
    console.error('Error fetching history stats:', error);
    res.status(500).json({ message: 'Error fetching history statistics' });
  }
});

// Make reservation
router.post('/', authenticate, [
  body('table_id').isInt({ min: 1 }).withMessage('Valid table ID is required'),
  body('reservation_time').notEmpty().withMessage('Valid reservation time is required'),
  body('party_size').isInt({ min: 1, max: 20 }).withMessage('Party size must be between 1 and 20'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if reservations are enabled
    if (!(await isReservationEnabled())) {
      return res.status(403).json({ message: 'Reservation system is currently disabled' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { table_id, reservation_time, party_size, duration } = req.body;
    const customerId = req.user?.userId;

    if (!customerId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get duration settings
    const defaultDuration = parseInt(await getSetting('default_reservation_duration', '60'));
    const minDuration = parseInt(await getSetting('min_reservation_duration', '30'));
    const maxDuration = parseInt(await getSetting('max_reservation_duration', '180'));

    // Use provided duration or default
    let reservationDuration = duration ? parseInt(duration) : defaultDuration;

    // Validate duration range
    if (reservationDuration < minDuration) {
      return res.status(400).json({ message: `Minimum reservation duration is ${minDuration} minutes` });
    }
    if (reservationDuration > maxDuration) {
      return res.status(400).json({ message: `Maximum reservation duration is ${maxDuration} minutes` });
    }

    // Check if table exists, is available, and is enabled
    const [tables] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM restaurant_tables WHERE id = ? AND status = 'Available' AND is_enabled = 1`,
      [table_id]
    );

    if (tables.length === 0) {
      return res.status(400).json({ message: 'Table not available for reservation' });
    }

    const table = tables[0];
    
    // Validate capacity
    if (table.capacity < party_size) {
      return res.status(400).json({ message: `Table capacity (${table.capacity}) is insufficient for party size (${party_size})` });
    }

    // Parse the reservation time
    const reservationDate = new Date(reservation_time);
    
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({ message: 'Invalid reservation time format' });
    }

    const now = new Date();
    
    if (reservationDate <= now) {
      return res.status(400).json({ message: 'Reservation time must be in the future' });
    }

    // Check reservation is not too far in advance
    const maxDaysAhead = parseInt(await getSetting('max_reservation_days_ahead', '30'));
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDaysAhead);
    
    if (reservationDate > maxDate) {
      return res.status(400).json({ message: `Reservations can only be made up to ${maxDaysAhead} days in advance` });
    }

    // Calculate end time for conflict checking
    const reservationEndTime = new Date(reservationDate.getTime() + reservationDuration * 60 * 1000);

    // Format for MySQL comparison
    const formatForMySQL = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };

    // Check for conflicting reservations (overlapping time windows)
    const [conflicts] = await pool.query<RowDataPacket[]>(
      `SELECT id, reservation_time, reservation_duration FROM restaurant_tables 
       WHERE id = ? AND status = 'Reserved' 
       AND reservation_time IS NOT NULL`,
      [table_id]
    );

    for (const conflict of conflicts) {
      const existingStart = new Date(conflict.reservation_time);
      const existingDuration = conflict.reservation_duration || defaultDuration;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

      // Check if time windows overlap
      if (reservationDate < existingEnd && reservationEndTime > existingStart) {
        return res.status(400).json({ message: 'This table has a conflicting reservation at that time' });
      }
    }

    // Check if customer already has a reservation at this time
    const [customerReservations] = await pool.query<RowDataPacket[]>(
      `SELECT id, reservation_time, reservation_duration FROM restaurant_tables 
       WHERE current_customer_id = ? AND status = 'Reserved' 
       AND reservation_time IS NOT NULL`,
      [customerId]
    );

    for (const existing of customerReservations) {
      const existingStart = new Date(existing.reservation_time);
      const existingDuration = existing.reservation_duration || defaultDuration;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

      if (reservationDate < existingEnd && reservationEndTime > existingStart) {
        return res.status(400).json({ message: 'You already have a reservation at this time' });
      }
    }

    // Convert to MySQL datetime format
    const mysqlDateTime = formatForMySQL(reservationDate);

    console.log('Saving reservation:', { 
      table_id, 
      customerId, 
      reservation_time: mysqlDateTime,
      duration: reservationDuration
    });

    // Make reservation with duration
    await pool.query(
      `UPDATE restaurant_tables 
       SET status = 'Reserved', current_customer_id = ?, reservation_time = ?, reservation_duration = ?
       WHERE id = ?`,
      [customerId, mysqlDateTime, reservationDuration, table_id]
    );

    // Save to reservation history
    await pool.query(
      `INSERT INTO reservation_history 
       (customer_id, table_id, table_number, table_type, party_size, reservation_time, reservation_duration, status, created_by_id, created_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'RESERVED', ?, ?)`,
      [customerId, table_id, table.table_number, table.type, party_size, mysqlDateTime, reservationDuration, customerId, req.user?.role || 'Customer']
    );

    res.status(201).json({ 
      message: 'Reservation made successfully',
      duration: reservationDuration
    });
  } catch (error) {
    console.error('Error making reservation:', error);
    res.status(500).json({ message: 'Error making reservation' });
  }
});

// Cancel reservation
router.delete('/:tableId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const customerId = req.user?.userId;
    const userRole = req.user?.role;

    // Get reservation details before cancelling
    const [reservationDetails] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM restaurant_tables WHERE id = ? AND status = 'Reserved'`,
      [tableId]
    );

    if (reservationDetails.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const reservation = reservationDetails[0];

    // Customers can only cancel their own reservations
    if (userRole === 'Customer' && reservation.current_customer_id !== customerId) {
      return res.status(403).json({ message: 'Not authorized to cancel this reservation' });
    }

    // Update table status
    await pool.query(
      `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL, reservation_duration = NULL WHERE id = ?`,
      [tableId]
    );

    // Update reservation history
    const formatForMySQL = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };

    await pool.query(
      `UPDATE reservation_history 
       SET status = 'CANCELLED', completed_at = ?
       WHERE table_id = ? AND customer_id = ? AND status = 'RESERVED'
       ORDER BY created_at DESC LIMIT 1`,
      [formatForMySQL(new Date()), tableId, reservation.current_customer_id]
    );

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ message: 'Error cancelling reservation' });
  }
});

// Confirm reservation (seat customer) - Manager only
router.post('/confirm/:tableId', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const seatedById = req.user?.userId;

    // Get reservation details including duration and customer info
    const [reservations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, u.name as customer_name 
       FROM restaurant_tables t
       LEFT JOIN users u ON t.current_customer_id = u.id
       WHERE t.id = ? AND t.status = 'Reserved'`,
      [tableId]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const reservation = reservations[0];
    const duration = reservation.reservation_duration || 60;

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

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE restaurant_tables 
       SET status = 'Occupied', reservation_time = NULL, occupied_at = ?
       WHERE id = ? AND status = 'Reserved'`,
      [formatForMySQL(now), tableId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Update reservation history to OCCUPIED status
    await pool.query(
      `UPDATE reservation_history 
       SET status = 'OCCUPIED', seated_by_id = ?
       WHERE table_id = ? AND customer_id = ? AND status = 'RESERVED'
       ORDER BY created_at DESC LIMIT 1`,
      [seatedById, tableId, reservation.current_customer_id]
    );

    // Schedule notification for table vacate
    const { scheduleVacateNotification } = await import('../services/notificationScheduler');
    await scheduleVacateNotification(
      parseInt(tableId),
      reservation.table_number,
      reservation.current_customer_id,
      reservation.customer_name || 'Customer',
      duration
    );

    res.json({ 
      message: 'Customer seated from reservation',
      duration,
      expectedVacateTime: new Date(now.getTime() + duration * 60 * 1000)
    });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(500).json({ message: 'Error confirming reservation' });
  }
});

// Complete reservation (when table is vacated) - Manager only
router.post('/complete/:tableId', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;

    // Get current table info
    const [tables] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM restaurant_tables WHERE id = ? AND status = 'Occupied'`,
      [tableId]
    );

    if (tables.length === 0) {
      return res.status(404).json({ message: 'Occupied table not found' });
    }

    const table = tables[0];

    const formatForMySQL = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };

    // Update reservation history to COMPLETED
    if (table.current_customer_id) {
      await pool.query(
        `UPDATE reservation_history 
         SET status = 'COMPLETED', completed_at = ?
         WHERE table_id = ? AND customer_id = ? AND status = 'OCCUPIED'
         ORDER BY created_at DESC LIMIT 1`,
        [formatForMySQL(new Date()), tableId, table.current_customer_id]
      );
    }

    res.json({ message: 'Reservation marked as completed' });
  } catch (error) {
    console.error('Error completing reservation:', error);
    res.status(500).json({ message: 'Error completing reservation' });
  }
});

export default router;
