import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

// In-memory store for scheduled notifications
interface ScheduledNotification {
  tableId: number;
  tableNumber: number;
  customerId: number;
  customerName: string;
  expectedVacateTime: Date;
  notifyAt: Date;
  timeoutId: NodeJS.Timeout;
}

// Store for active notifications
const scheduledNotifications: Map<number, ScheduledNotification> = new Map();

// Store for triggered notifications (to be fetched by managers)
interface ManagerNotification {
  id: number;
  tableId: number;
  tableNumber: number;
  customerName: string;
  expectedVacateTime: Date;
  message: string;
  createdAt: Date;
  read: boolean;
}

let notificationIdCounter = 1;
const managerNotifications: ManagerNotification[] = [];

// Get system setting
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

// Schedule a notification for table vacate
export async function scheduleVacateNotification(
  tableId: number,
  tableNumber: number,
  customerId: number,
  customerName: string,
  durationMinutes: number
): Promise<void> {
  // Cancel any existing notification for this table
  cancelNotification(tableId);

  const notifyMinutesBefore = parseInt(await getSetting('notification_minutes_before', '5'));
  
  const now = new Date();
  const expectedVacateTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const notifyAt = new Date(expectedVacateTime.getTime() - notifyMinutesBefore * 60 * 1000);

  // If notification time is in the past, notify immediately
  const delay = Math.max(0, notifyAt.getTime() - now.getTime());

  console.log(`[Scheduler] Scheduling notification for Table #${tableNumber}`);
  console.log(`  - Duration: ${durationMinutes} minutes`);
  console.log(`  - Expected vacate: ${expectedVacateTime.toLocaleTimeString()}`);
  console.log(`  - Notify at: ${notifyAt.toLocaleTimeString()} (in ${Math.round(delay / 1000 / 60)} minutes)`);

  const timeoutId = setTimeout(() => {
    triggerNotification(tableId);
  }, delay);

  scheduledNotifications.set(tableId, {
    tableId,
    tableNumber,
    customerId,
    customerName,
    expectedVacateTime,
    notifyAt,
    timeoutId
  });
}

// Trigger the notification
function triggerNotification(tableId: number): void {
  const scheduled = scheduledNotifications.get(tableId);
  if (!scheduled) return;

  const vacateTime = scheduled.expectedVacateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  const notification: ManagerNotification = {
    id: notificationIdCounter++,
    tableId: scheduled.tableId,
    tableNumber: scheduled.tableNumber,
    customerName: scheduled.customerName,
    expectedVacateTime: scheduled.expectedVacateTime,
    message: `Table #${scheduled.tableNumber} will be vacated at ${vacateTime} (in 5 minutes). Customer: ${scheduled.customerName}`,
    createdAt: new Date(),
    read: false
  };

  managerNotifications.unshift(notification);
  
  // Keep only last 50 notifications
  if (managerNotifications.length > 50) {
    managerNotifications.pop();
  }

  console.log(`[Notification] ${notification.message}`);
  
  // Remove from scheduled
  scheduledNotifications.delete(tableId);
}

// Cancel a scheduled notification
export function cancelNotification(tableId: number): void {
  const scheduled = scheduledNotifications.get(tableId);
  if (scheduled) {
    clearTimeout(scheduled.timeoutId);
    scheduledNotifications.delete(tableId);
    console.log(`[Scheduler] Cancelled notification for Table #${scheduled.tableNumber}`);
  }
}

// Get all manager notifications
export function getManagerNotifications(unreadOnly: boolean = false): ManagerNotification[] {
  if (unreadOnly) {
    return managerNotifications.filter(n => !n.read);
  }
  return [...managerNotifications];
}

// Mark notification as read
export function markNotificationRead(notificationId: number): boolean {
  const notification = managerNotifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

// Mark all notifications as read
export function markAllNotificationsRead(): void {
  managerNotifications.forEach(n => n.read = true);
}

// Get tables nearing vacate time
export async function getTablesNearingVacate(): Promise<any[]> {
  const notifyMinutesBefore = parseInt(await getSetting('notification_minutes_before', '5'));
  const now = new Date();
  
  const result: any[] = [];
  
  scheduledNotifications.forEach(scheduled => {
    const minutesUntilVacate = Math.round(
      (scheduled.expectedVacateTime.getTime() - now.getTime()) / 1000 / 60
    );
    
    if (minutesUntilVacate <= notifyMinutesBefore + 5 && minutesUntilVacate > 0) {
      result.push({
        tableId: scheduled.tableId,
        tableNumber: scheduled.tableNumber,
        customerName: scheduled.customerName,
        expectedVacateTime: scheduled.expectedVacateTime,
        minutesRemaining: minutesUntilVacate
      });
    }
  });
  
  return result.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
}

// Get count of unread notifications
export function getUnreadCount(): number {
  return managerNotifications.filter(n => !n.read).length;
}
