import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get all tables
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT t.*, u.name as customer_name 
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

// Get single table by ID
router.get('/:id', authenticate, [
  param('id').isInt().withMessage('Valid table ID is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT t.*, u.name as customer_name 
      FROM restaurant_tables t 
      LEFT JOIN users u ON t.current_customer_id = u.id
      WHERE t.id = ?
    `, [id]);

    if (tables.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(tables[0]);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ message: 'Error fetching table' });
  }
});

// Get available tables
router.get('/status/available', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { capacity, type } = req.query;
    let query = `SELECT * FROM restaurant_tables WHERE status = 'Available'`;
    const params: any[] = [];

    if (capacity) {
      query += ' AND capacity >= ?';
      params.push(Number(capacity));
    }
    if (type && type !== '') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY table_number';

    const [tables] = await pool.query<RowDataPacket[]>(query, params);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    res.status(500).json({ message: 'Error fetching available tables' });
  }
});

// Add table (Manager only)
router.post('/', authenticate, authorize('Manager', 'Admin'), [
  body('table_number').isInt({ min: 1 }).withMessage('Valid table number is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('type').isIn(['Regular', 'VIP']).withMessage('Type must be Regular or VIP')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { table_number, capacity, type } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM restaurant_tables WHERE table_number = ?', [table_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    await pool.query(
      'INSERT INTO restaurant_tables (table_number, capacity, type) VALUES (?, ?, ?)',
      [table_number, capacity, type]
    );

    res.status(201).json({ message: 'Table added successfully' });
  } catch (error) {
    console.error('Error adding table:', error);
    res.status(500).json({ message: 'Error adding table' });
  }
});

// Update table (Manager only)
router.put('/:id', authenticate, authorize('Manager', 'Admin'), [
  param('id').isInt().withMessage('Valid table ID is required'),
  body('table_number').isInt({ min: 1 }).withMessage('Table number must be a positive integer'),
  body('capacity').isInt({ min: 1, max: 50 }).withMessage('Capacity must be between 1 and 50'),
  body('type').isIn(['Regular', 'VIP']).withMessage('Type must be Regular or VIP'),
  body('status').isIn(['Available', 'Occupied', 'Reserved']).withMessage('Invalid status')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { id } = req.params;
    const { table_number, capacity, type, status } = req.body;

    // Check if table exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM restaurant_tables WHERE id = ?', [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Check table number uniqueness (if changing)
    if (table_number !== existing[0].table_number) {
      const [duplicate] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM restaurant_tables WHERE table_number = ? AND id != ?', [table_number, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ message: 'Table number already exists' });
      }
    }

    // Validate status transition
    const currentStatus = existing[0].status;
    const validTransitions: Record<string, string[]> = {
      'Available': ['Occupied', 'Reserved'],
      'Occupied': ['Available'],
      'Reserved': ['Available', 'Occupied']
    };

    if (status !== currentStatus && !validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    // Clear customer data if setting to Available
    let query = 'UPDATE restaurant_tables SET table_number = ?, capacity = ?, type = ?, status = ?';
    const params: any[] = [table_number, capacity, type, status];

    if (status === 'Available') {
      query += ', current_customer_id = NULL, reservation_time = NULL, occupied_at = NULL, reservation_duration = NULL';
      
      // Mark any active reservation as completed in history
      if (existing[0].current_customer_id) {
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
           SET status = 'COMPLETED', completed_at = ?
           WHERE table_id = ? AND customer_id = ? AND status IN ('RESERVED', 'OCCUPIED')
           ORDER BY created_at DESC LIMIT 1`,
          [formatForMySQL(new Date()), id, existing[0].current_customer_id]
        );
      }
      
      // Cancel any scheduled notification for this table
      const { cancelNotification } = await import('../services/notificationScheduler');
      cancelNotification(parseInt(id));
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    res.json({ message: 'Table updated successfully' });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ message: 'Error updating table' });
  }
});

// Delete table (Manager only)
router.delete('/:id', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM restaurant_tables WHERE id = ?', [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ message: 'Error deleting table' });
  }
});

// Update table status (Manager only) - with valid transitions
router.patch('/:id/status', authenticate, authorize('Manager', 'Admin'), [
  param('id').isInt().withMessage('Valid table ID is required'),
  body('status').isIn(['Available', 'Occupied', 'Reserved']).withMessage('Invalid status')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    const { status, customer_id } = req.body;

    // Get current table status
    const [tables] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM restaurant_tables WHERE id = ?', [id]
    );

    if (tables.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const currentStatus = tables[0].status;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'Available': ['Occupied', 'Reserved'],
      'Occupied': ['Available'],
      'Reserved': ['Available', 'Occupied']
    };

    if (status !== currentStatus && !validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    let query = 'UPDATE restaurant_tables SET status = ?';
    const params: any[] = [status];

    if (status === 'Available') {
      query += ', current_customer_id = NULL, reservation_time = NULL, occupied_at = NULL, reservation_duration = NULL';
      
      // Mark any active reservation as completed in history
      if (tables[0].current_customer_id) {
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
           SET status = 'COMPLETED', completed_at = ?
           WHERE table_id = ? AND customer_id = ? AND status IN ('RESERVED', 'OCCUPIED')
           ORDER BY created_at DESC LIMIT 1`,
          [formatForMySQL(new Date()), id, tables[0].current_customer_id]
        );
      }
      
      // Cancel any scheduled notification for this table
      const { cancelNotification } = await import('../services/notificationScheduler');
      cancelNotification(parseInt(id));
    } else if (customer_id) {
      // Validate customer exists
      const [customers] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ?', [customer_id]
      );
      if (customers.length === 0) {
        return res.status(400).json({ message: 'Customer not found' });
      }
      query += ', current_customer_id = ?';
      params.push(customer_id);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    res.json({ message: 'Table status updated successfully' });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ message: 'Error updating table status' });
  }
});

export default router;
