import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

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

    let query = `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL WHERE id = ? AND status = 'Reserved'`;
    const params: any[] = [tableId];

    // Customers can only cancel their own reservations
    if (userRole === 'Customer') {
      query += ' AND current_customer_id = ?';
      params.push(customerId);
    }

    const [result] = await pool.query<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found or not authorized' });
    }

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

export default router;
