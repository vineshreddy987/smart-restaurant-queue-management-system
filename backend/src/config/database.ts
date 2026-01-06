import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'restaurant_queue_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const initDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'restaurant_queue_db'}`);
  await connection.end();

  // ============================================
  // TABLE 1: Users Table
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('Customer', 'Manager', 'Admin') DEFAULT 'Customer',
      contact_info VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add is_active column if not exists (for existing databases)
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
  } catch (e) { /* Column might already exist */ }

  // ============================================
  // TABLE 2: Tables & Reservations Table (Combined)
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_number INT NOT NULL UNIQUE,
      capacity INT NOT NULL,
      type ENUM('Regular', 'VIP') DEFAULT 'Regular',
      status ENUM('Available', 'Occupied', 'Reserved') DEFAULT 'Available',
      current_customer_id INT NULL,
      reservation_time DATETIME NULL,
      reservation_duration INT NULL DEFAULT 60,
      occupied_at DATETIME NULL,
      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (current_customer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add is_enabled column if not exists
  try {
    await pool.query(`ALTER TABLE restaurant_tables ADD COLUMN is_enabled BOOLEAN DEFAULT TRUE`);
  } catch (e) { /* Column might already exist */ }

  // Add reservation_duration column if not exists
  try {
    await pool.query(`ALTER TABLE restaurant_tables ADD COLUMN reservation_duration INT NULL DEFAULT 60`);
  } catch (e) { /* Column might already exist */ }

  // Add occupied_at column if not exists
  try {
    await pool.query(`ALTER TABLE restaurant_tables ADD COLUMN occupied_at DATETIME NULL`);
  } catch (e) { /* Column might already exist */ }

  // ============================================
  // AUXILIARY TABLE: Queue (for queue management)
  // Note: This is a supporting table for queue functionality
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      party_size INT NOT NULL,
      table_type ENUM('Regular', 'VIP') DEFAULT 'Regular',
      position INT NOT NULL,
      status ENUM('Waiting', 'Seated', 'Cancelled') DEFAULT 'Waiting',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ============================================
  // AUXILIARY TABLE: System Settings (for admin config)
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(50) UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // AUXILIARY TABLE: Reservation History (for booking history)
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservation_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      table_id INT NOT NULL,
      table_number INT NOT NULL,
      table_type ENUM('Regular', 'VIP') DEFAULT 'Regular',
      party_size INT DEFAULT 1,
      reservation_time DATETIME NOT NULL,
      reservation_duration INT DEFAULT 60,
      status ENUM('RESERVED', 'OCCUPIED', 'COMPLETED', 'CANCELLED', 'EXPIRED') DEFAULT 'RESERVED',
      created_by_id INT NULL,
      created_by_role ENUM('Customer', 'Manager', 'Admin') DEFAULT 'Customer',
      seated_by_id INT NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (seated_by_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // ============================================
  // AUXILIARY TABLE: Admin Logs (for audit trail)
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ============================================
  // AUXILIARY TABLE: Error Logs (for debugging)
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      error_type VARCHAR(50),
      message TEXT,
      stack_trace TEXT,
      user_id INT NULL,
      endpoint VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default system settings
  const defaultSettings = [
    ['queue_enabled', 'true'],
    ['reservation_enabled', 'true'],
    ['max_queue_size', '50'],
    ['max_reservation_days_ahead', '30'],
    ['default_reservation_duration', '60'],
    ['min_reservation_duration', '30'],
    ['max_reservation_duration', '180'],
    ['notification_minutes_before', '5']
  ];

  for (const [key, value] of defaultSettings) {
    await pool.query(
      `INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)`,
      [key, value]
    );
  }

  console.log('Database initialized successfully');
  console.log('Core Tables: users, restaurant_tables');
  console.log('Auxiliary Tables: queue, system_settings, admin_logs, error_logs, reservation_history');
};

// Error logging helper
export const logError = async (errorType: string, message: string, stackTrace?: string, userId?: number, endpoint?: string) => {
  try {
    await pool.query(
      'INSERT INTO error_logs (error_type, message, stack_trace, user_id, endpoint) VALUES (?, ?, ?, ?, ?)',
      [errorType, message, stackTrace || null, userId || null, endpoint || null]
    );
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};

export default pool;
