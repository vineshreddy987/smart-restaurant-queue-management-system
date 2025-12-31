import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import {
  getManagerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getTablesNearingVacate,
  getUnreadCount
} from '../services/notificationScheduler';

const router = Router();

// Get all notifications for manager
router.get('/', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = getManagerNotifications(unreadOnly);
    const unreadCount = getUnreadCount();
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Get tables nearing vacate time
router.get('/tables-nearing-vacate', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const tables = await getTablesNearingVacate();
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables nearing vacate:', error);
    res.status(500).json({ message: 'Error fetching tables' });
  }
});

// Get unread count
router.get('/unread-count', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    res.json({ count: getUnreadCount() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = markNotificationRead(parseInt(id));
    
    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Mark all as read
router.patch('/read-all', authenticate, authorize('Manager', 'Admin'), async (req: AuthRequest, res: Response) => {
  try {
    markAllNotificationsRead();
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

export default router;
