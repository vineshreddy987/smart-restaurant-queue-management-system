import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { RowDataPacket } from 'mysql2';

const router = Router();

// ==================== SESSION STATE MANAGEMENT ====================

// Conversation state interface
interface ConversationState {
  currentIntent: string | null;
  step: 'IDLE' | 'AWAITING_CAPACITY' | 'AWAITING_TABLE_SELECTION' | 'AWAITING_DATE' | 'AWAITING_TIME' | 'AWAITING_CONFIRMATION';
  capacity: number | null;
  tableType: 'Regular' | 'VIP' | null;
  availableTables: any[];
  selectedTable: any | null;
  reservationDate: Date | null;
  reservationTime: string | null;
  lastUpdated: Date;
}

// In-memory session store (keyed by userId)
const sessions: Map<number, ConversationState> = new Map();

// Session timeout (5 minutes)
const SESSION_TIMEOUT = 5 * 60 * 1000;

// Get or create session for user
function getSession(userId: number): ConversationState {
  let session = sessions.get(userId);
  
  // Check if session exists and is not expired
  if (session && (Date.now() - session.lastUpdated.getTime()) < SESSION_TIMEOUT) {
    return session;
  }
  
  // Create new session
  session = {
    currentIntent: null,
    step: 'IDLE',
    capacity: null,
    tableType: null,
    availableTables: [],
    selectedTable: null,
    reservationDate: null,
    reservationTime: null,
    lastUpdated: new Date()
  };
  sessions.set(userId, session);
  return session;
}

// Update session
function updateSession(userId: number, updates: Partial<ConversationState>): void {
  const session = getSession(userId);
  Object.assign(session, updates, { lastUpdated: new Date() });
  sessions.set(userId, session);
}

// Clear session
function clearSession(userId: number): void {
  sessions.delete(userId);
}

// ==================== INTENT DEFINITIONS ====================

const INTENTS = {
  CHECK_TABLE: {
    keywords: ['table', 'available', 'free', 'seat', 'capacity'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  QUEUE_POSITION: {
    keywords: ['queue', 'position', 'wait', 'waiting', 'line', 'turn'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  JOIN_QUEUE: {
    keywords: ['join', 'add', 'queue', 'wait', 'line'],
    roles: ['Customer']
  },
  LEAVE_QUEUE: {
    keywords: ['leave', 'exit', 'queue', 'remove'],
    roles: ['Customer']
  },
  MAKE_RESERVATION: {
    keywords: ['book', 'reserve', 'reservation'],
    roles: ['Customer']
  },
  VIEW_RESERVATION: {
    keywords: ['my', 'reservation', 'booking', 'show', 'view'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  CANCEL_RESERVATION: {
    keywords: ['cancel', 'delete', 'remove', 'reservation', 'booking'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  MANAGER_STATS: {
    keywords: ['stats', 'statistics', 'dashboard', 'overview', 'report'],
    roles: ['Manager', 'Admin']
  },
  HELP: {
    keywords: ['help', 'what', 'can', 'do', 'commands', 'options'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  GREETING: {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  CONFIRM: {
    keywords: ['yes', 'confirm', 'ok', 'sure', 'proceed', 'go ahead'],
    roles: ['Customer', 'Manager', 'Admin']
  },
  CANCEL: {
    keywords: ['no', 'cancel', 'stop', 'nevermind', 'abort'],
    roles: ['Customer', 'Manager', 'Admin']
  }
};

// ==================== HELPER FUNCTIONS ====================

// Check if message is a global cancel/reset command
function isGlobalCancelCommand(message: string): boolean {
  const cancelCommands = ['cancel', 'stop', 'exit', 'start over', 'reset', 'quit', 'nevermind', 'never mind', 'abort'];
  const lowerMsg = message.toLowerCase().trim();
  return cancelCommands.some(cmd => lowerMsg === cmd || lowerMsg.includes(cmd));
}

// Get step-specific help message
function getStepHelpMessage(step: string): string {
  switch (step) {
    case 'AWAITING_CAPACITY':
      return `Please enter the number of people (1-20), or type "cancel" to stop.`;
    case 'AWAITING_TABLE_SELECTION':
      return `Please select a table number from the list, or type "cancel" to stop.`;
    case 'AWAITING_DATE':
      return `Please specify a date like "today", "tomorrow", or "Friday", or type "cancel" to stop.`;
    case 'AWAITING_TIME':
      return `Please select a time slot from the options, or type "cancel" to stop.`;
    case 'AWAITING_CONFIRMATION':
      return `Please say "yes" to confirm or "no" to cancel.`;
    default:
      return `Type "help" for available commands or "cancel" to start over.`;
  }
}

// Generate available time slots based on business hours
function generateTimeSlots(date: Date): { slots: string[], quickReplies: string[] } {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // Business hours: 10 AM to 10 PM (22:00)
  const openHour = 10;
  const closeHour = 22;
  const intervalMinutes = 30;
  
  const slots: string[] = [];
  const quickReplies: string[] = [];
  
  for (let hour = openHour; hour < closeHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      // Skip past times if today
      if (isToday) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, minute, 0, 0);
        // Add 30 min buffer for reservations
        if (slotTime.getTime() <= now.getTime() + 30 * 60 * 1000) {
          continue;
        }
      }
      
      // Format time for display
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayMinute = minute.toString().padStart(2, '0');
      const timeStr = `${displayHour}:${displayMinute} ${ampm}`;
      
      slots.push(timeStr);
    }
  }
  
  // Pick 4-6 evenly distributed slots for quick replies
  if (slots.length > 0) {
    const step = Math.max(1, Math.floor(slots.length / 5));
    for (let i = 0; i < slots.length && quickReplies.length < 5; i += step) {
      quickReplies.push(slots[i]);
    }
  }
  quickReplies.push('Cancel');
  
  return { slots, quickReplies };
}

// Extract all numbers from message
function extractNumbers(message: string): number[] {
  const matches = message.match(/\d+/g);
  return matches ? matches.map(n => parseInt(n)) : [];
}

// Extract single number
function extractNumber(message: string): number | null {
  const numbers = extractNumbers(message);
  return numbers.length > 0 ? numbers[0] : null;
}

// Extract table number from message (handles "table 1", "table #1", "#1", "1")
function extractTableNumber(message: string): number | null {
  const lowerMsg = message.toLowerCase();
  
  // Match "table 1", "table #1", "table number 1"
  const tableMatch = lowerMsg.match(/table\s*#?\s*(\d+)/);
  if (tableMatch) return parseInt(tableMatch[1]);
  
  // Match just "#1"
  const hashMatch = message.match(/#(\d+)/);
  if (hashMatch) return parseInt(hashMatch[1]);
  
  // If message is just a number, return it
  const justNumber = message.trim().match(/^(\d+)$/);
  if (justNumber) return parseInt(justNumber[1]);
  
  return null;
}

// Extract time from message
function extractTime(message: string): string | null {
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})/
  ];

  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase() || match[2]?.toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

// Extract date from message
function extractDate(message: string): Date | null {
  const today = new Date();
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('today')) return today;
  
  if (lowerMsg.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  if (lowerMsg.includes('day after tomorrow')) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter;
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lowerMsg.includes(days[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      return targetDate;
    }
  }

  return null;
}

// Extract table type
function extractTableType(message: string): 'Regular' | 'VIP' | null {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('vip')) return 'VIP';
  if (lowerMsg.includes('regular')) return 'Regular';
  return null;
}

// Detect intent from message
function detectIntent(message: string, session: ConversationState): { intent: string; confidence: number } {
  const lowerMsg = message.toLowerCase();
  let bestIntent = 'UNKNOWN';
  let bestScore = 0;

  for (const [intentName, intentData] of Object.entries(INTENTS)) {
    let score = 0;
    for (const keyword of intentData.keywords) {
      if (lowerMsg.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intentName;
    }
  }

  return { intent: bestIntent, confidence: bestScore };
}

// Check permission
function hasPermission(role: string, intent: string): boolean {
  const intentData = INTENTS[intent as keyof typeof INTENTS];
  if (!intentData) return false;
  return intentData.roles.includes(role);
}

// Format table list for display
function formatTableList(tables: any[]): string {
  return tables.map((t, i) => `${i + 1}. Table #${t.table_number} (${t.type}, ${t.capacity} seats)`).join('\n');
}


// ==================== MAIN CHATBOT ENDPOINT ====================

router.post('/message', authenticate, [
  body('message').notEmpty().trim().withMessage('Message is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Please enter a message' });
    }

    const { message } = req.body;
    const userId = req.user?.userId!;
    const userRole = req.user?.role || 'Customer';

    // Get user's session
    const session = getSession(userId);
    
    // Detect intent
    let { intent, confidence } = detectIntent(message, session);
    
    let response = '';
    let data: any = null;
    let quickReplies: string[] = [];

    // ==================== CONTEXT-AWARE PROCESSING ====================
    
    // Handle global cancel/reset commands at ANY step
    if (isGlobalCancelCommand(message)) {
      const wasInProgress = session.step !== 'IDLE';
      clearSession(userId);
      
      if (wasInProgress) {
        return res.json({
          response: "❌ Process cancelled. How can I help you now?",
          intent: 'CANCEL',
          success: true,
          quickReplies: ['Check tables', 'Make reservation', 'Join queue', 'Help']
        });
      }
      // If already idle, treat as regular message
    }

    // Process based on current conversation state
    switch (session.step) {
      // ==================== AWAITING TABLE SELECTION ====================
      case 'AWAITING_TABLE_SELECTION': {
        const tableNumber = extractTableNumber(message);
        
        if (tableNumber !== null) {
          // Find the table in available tables
          const selectedTable = session.availableTables.find(t => t.table_number === tableNumber);
          
          if (selectedTable) {
            updateSession(userId, { selectedTable });
            
            if (session.currentIntent === 'MAKE_RESERVATION') {
              // Continue to date selection for reservations
              updateSession(userId, { step: 'AWAITING_DATE' });
              response = `✅ Table #${selectedTable.table_number} selected (${selectedTable.type}, ${selectedTable.capacity} seats).\n\n` +
                `When would you like to reserve? Please specify a date like "tomorrow" or "Friday".`;
              quickReplies = ['Today', 'Tomorrow', 'Cancel'];
            } else {
              // For CHECK_TABLE, just show table info and offer to reserve
              clearSession(userId);
              response = `✅ Table #${selectedTable.table_number} is available!\n` +
                `• Type: ${selectedTable.type}\n` +
                `• Capacity: ${selectedTable.capacity} seats\n\n` +
                `Would you like to make a reservation for this table?`;
              quickReplies = ['Make reservation', 'Check other tables', 'Help'];
            }
          } else {
            // Table not in available list
            const availableNumbers = session.availableTables.map(t => t.table_number).join(', ');
            response = `⚠️ Table #${tableNumber} is not in the available list.\n\nPlease choose from these tables: ${availableNumbers}\n\nOr type "cancel" to start over.`;
            quickReplies = session.availableTables.slice(0, 3).map(t => `Table ${t.table_number}`);
            quickReplies.push('Cancel');
          }
        } else {
          // Could not extract table number - provide helpful guidance
          response = `I didn't catch the table number. ${getStepHelpMessage(session.step)}\n\nAvailable tables: ${session.availableTables.map(t => `#${t.table_number}`).join(', ')}`;
          quickReplies = session.availableTables.slice(0, 3).map(t => `Table ${t.table_number}`);
          quickReplies.push('Cancel');
        }
        
        return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
      }

      // ==================== AWAITING DATE ====================
      case 'AWAITING_DATE': {
        const date = extractDate(message);
        
        if (date) {
          updateSession(userId, { reservationDate: date, step: 'AWAITING_TIME' });
          const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          
          // Generate available time slots
          const { slots, quickReplies: timeQuickReplies } = generateTimeSlots(date);
          
          if (slots.length === 0) {
            clearSession(userId);
            response = `⚠️ Sorry, no available time slots for ${dateStr}. The restaurant may be closed or fully booked.\n\nWould you like to try a different date?`;
            quickReplies = ['Tomorrow', 'Make reservation', 'Cancel'];
          } else {
            response = `📅 Date set to ${dateStr}.\n\n🕐 Available time slots:\n${slots.slice(0, 12).join(' • ')}\n${slots.length > 12 ? `...and ${slots.length - 12} more slots` : ''}\n\nPlease select a time:`;
            quickReplies = timeQuickReplies;
          }
        } else {
          response = `I didn't understand that date. ${getStepHelpMessage(session.step)}`;
          quickReplies = ['Today', 'Tomorrow', 'Cancel'];
        }
        
        return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
      }

      // ==================== AWAITING TIME ====================
      case 'AWAITING_TIME': {
        const time = extractTime(message);
        
        if (time) {
          // Validate time is within business hours (10 AM - 10 PM)
          const [hours, mins] = time.split(':').map(Number);
          if (hours < 10 || hours >= 22) {
            const { quickReplies: timeQuickReplies } = generateTimeSlots(session.reservationDate!);
            response = `⚠️ Sorry, we're only open from 10 AM to 10 PM. Please select a time within business hours:`;
            quickReplies = timeQuickReplies;
            return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
          }
          
          // Check if time is in the past for today
          if (session.reservationDate) {
            const slotTime = new Date(session.reservationDate);
            slotTime.setHours(hours, mins, 0, 0);
            const now = new Date();
            if (slotTime.getTime() <= now.getTime() + 30 * 60 * 1000) {
              const { quickReplies: timeQuickReplies } = generateTimeSlots(session.reservationDate);
              response = `⚠️ That time has already passed or is too soon. Please select a later time:`;
              quickReplies = timeQuickReplies;
              return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
            }
          }
          
          updateSession(userId, { reservationTime: time, step: 'AWAITING_CONFIRMATION' });
          
          const timeStr = new Date(0, 0, 0, hours, mins).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const dateStr = session.reservationDate!.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          
          response = `📋 Reservation Summary:\n` +
            `• Table: #${session.selectedTable.table_number} (${session.selectedTable.type}, ${session.selectedTable.capacity} seats)\n` +
            `• Date: ${dateStr}\n` +
            `• Time: ${timeStr}\n` +
            `• Party size: ${session.capacity}\n\n` +
            `Would you like to confirm this reservation? Say "yes" to confirm or "no" to cancel.`;
          quickReplies = ['Yes, confirm', 'No, cancel'];
        } else {
          const { quickReplies: timeQuickReplies } = generateTimeSlots(session.reservationDate!);
          response = `I didn't understand that time. ${getStepHelpMessage(session.step)}\n\nPlease select from the available slots:`;
          quickReplies = timeQuickReplies;
        }
        
        return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
      }

      // ==================== AWAITING CONFIRMATION ====================
      case 'AWAITING_CONFIRMATION': {
        if (intent === 'CONFIRM') {
          // Safety check: ensure we have all required data
          if (!session.reservationDate || !session.reservationTime || !session.selectedTable) {
            // Missing required data - provide specific feedback
            const missing: string[] = [];
            if (!session.selectedTable) missing.push('table selection');
            if (!session.reservationDate) missing.push('date');
            if (!session.reservationTime) missing.push('time');
            
            clearSession(userId);
            response = `⚠️ I'm missing some information: ${missing.join(', ')}.\n\nLet's start over. Would you like to make a reservation?`;
            return res.json({ response, intent: 'MAKE_RESERVATION', success: false, quickReplies: ['Make reservation', 'Help'] });
          }

          // Complete the reservation
          const resDate = new Date(session.reservationDate);
          const [hours, mins] = session.reservationTime.split(':').map(Number);
          resDate.setHours(hours, mins, 0, 0);

          if (resDate <= new Date()) {
            clearSession(userId);
            response = `⚠️ That time has already passed. Please start a new reservation with a future date and time.`;
            return res.json({ response, intent: 'MAKE_RESERVATION', success: false, quickReplies: ['Make reservation', 'Help'] });
          }

          // Format for MySQL
          const year = resDate.getFullYear();
          const month = String(resDate.getMonth() + 1).padStart(2, '0');
          const day = String(resDate.getDate()).padStart(2, '0');
          const hrs = String(resDate.getHours()).padStart(2, '0');
          const min = String(resDate.getMinutes()).padStart(2, '0');
          const mysqlDateTime = `${year}-${month}-${day} ${hrs}:${min}:00`;

          await pool.query(
            `UPDATE restaurant_tables SET status = 'Reserved', current_customer_id = ?, reservation_time = ? WHERE id = ?`,
            [userId, mysqlDateTime, session.selectedTable.id]
          );

          const dateStr = resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          const timeStr = resDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          
          response = `🎉 Reservation confirmed!\n\n` +
            `• Table #${session.selectedTable.table_number} (${session.selectedTable.type})\n` +
            `• ${dateStr} at ${timeStr}\n` +
            `• Party size: ${session.capacity}\n\n` +
            `See you then!`;
          
          data = { table: session.selectedTable, date: resDate };
          clearSession(userId);
          quickReplies = ['View reservations', 'Help'];
        } else {
          clearSession(userId);
          response = `No problem! Reservation cancelled. How else can I help you?`;
          quickReplies = ['Check tables', 'Make reservation', 'Help'];
        }
        
        return res.json({ response, intent: 'MAKE_RESERVATION', data, success: true, quickReplies });
      }

      // ==================== AWAITING CAPACITY ====================
      case 'AWAITING_CAPACITY': {
        const capacity = extractNumber(message);
        
        if (capacity && capacity >= 1 && capacity <= 20) {
          // Search for tables with this capacity
          const tableType = session.tableType;
          let query = `SELECT * FROM restaurant_tables WHERE status = 'Available' AND is_enabled = 1 AND capacity >= ?`;
          const params: any[] = [capacity];
          
          if (tableType) {
            query += ' AND type = ?';
            params.push(tableType);
          }
          query += ' ORDER BY capacity ASC LIMIT 5';

          const [tables] = await pool.query<RowDataPacket[]>(query, params);

          if (tables.length === 0) {
            response = `Sorry, no ${tableType || ''} tables available for ${capacity} people right now. Would you like to join the waiting queue?`;
            quickReplies = ['Join queue', 'Try different size', 'Cancel'];
            updateSession(userId, { capacity, step: 'IDLE' });
          } else {
            updateSession(userId, { 
              capacity, 
              availableTables: tables, 
              step: 'AWAITING_TABLE_SELECTION' 
            });
            
            response = `Found ${tables.length} table(s) for ${capacity} people:\n\n${formatTableList(tables)}\n\n` +
              `Which table would you like? (Say "Table 1" or just the number)`;
            quickReplies = tables.slice(0, 3).map(t => `Table ${t.table_number}`);
            quickReplies.push('Cancel');
            data = tables;
          }
        } else if (capacity && (capacity < 1 || capacity > 20)) {
          response = `⚠️ Party size must be between 1 and 20 people. ${getStepHelpMessage(session.step)}`;
          quickReplies = ['2', '4', '6', 'Cancel'];
        } else {
          response = `I didn't catch the party size. ${getStepHelpMessage(session.step)}`;
          quickReplies = ['2', '4', '6', 'Cancel'];
        }
        
        return res.json({ response, intent: session.currentIntent, data, success: true, quickReplies, sessionStep: session.step });
      }
    }


    // ==================== IDLE STATE - PROCESS NEW INTENTS ====================
    
    // Check permission
    if (intent !== 'UNKNOWN' && !hasPermission(userRole, intent)) {
      return res.json({
        response: "Sorry, you don't have permission to perform this action.",
        intent,
        success: false
      });
    }

    switch (intent) {
      case 'GREETING': {
        const greetings = [
          `Hello! Welcome to our restaurant. How can I help you today?`,
          `Hi there! I'm your restaurant assistant. What can I do for you?`,
          `Hey! Ready to help you with tables, reservations, or queue. What do you need?`
        ];
        response = greetings[Math.floor(Math.random() * greetings.length)];
        quickReplies = ['Check tables', 'Make reservation', 'Join queue', 'Help'];
        break;
      }

      case 'HELP': {
        if (userRole === 'Customer') {
          response = `Here's what I can help you with:\n` +
            `• Check table availability - "Is a table available for 4?"\n` +
            `• Make a reservation - "Book a table for 4"\n` +
            `• Join the queue - "Add me to the queue"\n` +
            `• Check queue position - "What's my queue position?"\n` +
            `• View reservations - "Show my reservations"\n` +
            `• Cancel reservation - "Cancel my reservation"`;
        } else {
          response = `Manager commands:\n` +
            `• Check tables - "Show available tables"\n` +
            `• View stats - "Show today's stats"\n` +
            `• View reservations - "Show all reservations"`;
        }
        quickReplies = ['Check tables', 'Make reservation', 'View reservations'];
        break;
      }

      case 'CHECK_TABLE':
      case 'MAKE_RESERVATION': {
        const capacity = extractNumber(message);
        const tableType = extractTableType(message);
        
        // Start reservation/check flow
        updateSession(userId, { 
          currentIntent: intent,
          tableType
        });

        if (capacity && capacity >= 1 && capacity <= 20) {
          // We have capacity, search for tables
          let query = `SELECT * FROM restaurant_tables WHERE status = 'Available' AND is_enabled = 1 AND capacity >= ?`;
          const params: any[] = [capacity];
          
          if (tableType) {
            query += ' AND type = ?';
            params.push(tableType);
          }
          query += ' ORDER BY capacity ASC LIMIT 5';

          const [tables] = await pool.query<RowDataPacket[]>(query, params);

          if (tables.length === 0) {
            response = `Sorry, no ${tableType || ''} tables available for ${capacity} people right now. Would you like to join the waiting queue?`;
            quickReplies = ['Join queue', 'Try different size', 'Cancel'];
            clearSession(userId);
          } else {
            updateSession(userId, { 
              capacity, 
              availableTables: tables, 
              step: 'AWAITING_TABLE_SELECTION' 
            });
            
            if (intent === 'MAKE_RESERVATION') {
              response = `Found ${tables.length} table(s) for ${capacity} people:\n\n${formatTableList(tables)}\n\n` +
                `Which table would you like to reserve? (Say "Table 1" or just the number)`;
            } else {
              response = `Great news! Found ${tables.length} table(s) for ${capacity} people:\n\n${formatTableList(tables)}\n\n` +
                `Would you like to reserve one? Just say the table number.`;
            }
            quickReplies = tables.slice(0, 3).map(t => `Table ${t.table_number}`);
            quickReplies.push('Cancel');
            data = tables;
          }
        } else {
          // Ask for capacity
          updateSession(userId, { step: 'AWAITING_CAPACITY' });
          response = `How many people will be dining? (1-20)`;
          quickReplies = ['2', '4', '6', '8'];
        }
        break;
      }

      case 'QUEUE_POSITION': {
        const [queueEntries] = await pool.query<RowDataPacket[]>(
          `SELECT q.*, 
            (SELECT COUNT(*) FROM queue WHERE status = 'Waiting' AND position < q.position) + 1 as current_position,
            (SELECT COUNT(*) FROM queue WHERE status = 'Waiting') as total_waiting
          FROM queue q 
          WHERE q.customer_id = ? AND q.status = 'Waiting'`,
          [userId]
        );

        if (queueEntries.length === 0) {
          response = `You're not currently in the queue. Would you like to join?`;
          quickReplies = ['Join queue', 'Check tables'];
        } else {
          const entry = queueEntries[0];
          const waitTime = entry.current_position * 15;
          response = `You're #${entry.current_position} in the queue (${entry.total_waiting} total waiting).\n` +
            `Estimated wait: ~${waitTime} minutes. Party size: ${entry.party_size}.`;
          quickReplies = ['Leave queue', 'Check tables'];
          data = entry;
        }
        break;
      }

      case 'JOIN_QUEUE': {
        const [existing] = await pool.query<RowDataPacket[]>(
          `SELECT id FROM queue WHERE customer_id = ? AND status = 'Waiting'`,
          [userId]
        );

        if (existing.length > 0) {
          response = `You're already in the queue! Say "What's my queue position?" to check your status.`;
          quickReplies = ['Queue position', 'Leave queue'];
        } else {
          const partySize = extractNumber(message) || 2;
          const queueTableType = extractTableType(message) || 'Regular';

          const [maxPos] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM queue WHERE status = 'Waiting'`
          );
          const nextPosition = maxPos[0].next_position;

          await pool.query(
            'INSERT INTO queue (customer_id, party_size, table_type, position) VALUES (?, ?, ?, ?)',
            [userId, partySize, queueTableType, nextPosition]
          );

          const waitTime = nextPosition * 15;
          response = `✅ You've been added to the queue!\n` +
            `Position: #${nextPosition}\n` +
            `Party size: ${partySize}\n` +
            `Estimated wait: ~${waitTime} minutes`;
          quickReplies = ['Queue position', 'Leave queue'];
          data = { position: nextPosition, partySize, waitTime };
        }
        break;
      }

      case 'LEAVE_QUEUE': {
        const [leaveEntry] = await pool.query<RowDataPacket[]>(
          `SELECT position FROM queue WHERE customer_id = ? AND status = 'Waiting'`,
          [userId]
        );

        if (leaveEntry.length === 0) {
          response = `You're not currently in the queue.`;
          quickReplies = ['Join queue', 'Check tables'];
        } else {
          const leavingPosition = leaveEntry[0].position;
          await pool.query(
            `UPDATE queue SET status = 'Cancelled' WHERE customer_id = ? AND status = 'Waiting'`,
            [userId]
          );
          await pool.query(
            `UPDATE queue SET position = position - 1 WHERE status = 'Waiting' AND position > ?`,
            [leavingPosition]
          );
          response = `You've been removed from the queue. Hope to see you again!`;
          quickReplies = ['Check tables', 'Make reservation'];
        }
        break;
      }

      case 'VIEW_RESERVATION': {
        const [reservations] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM restaurant_tables WHERE current_customer_id = ? AND status = 'Reserved' ORDER BY reservation_time ASC`,
          [userId]
        );

        if (reservations.length === 0) {
          response = `You don't have any active reservations. Would you like to make one?`;
          quickReplies = ['Make reservation', 'Check tables'];
        } else {
          const resList = reservations.map(r => {
            const resDateTime = new Date(r.reservation_time);
            return `• Table #${r.table_number} on ${resDateTime.toLocaleDateString()} at ${resDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
          }).join('\n');
          response = `Your reservations:\n${resList}`;
          quickReplies = ['Cancel reservation', 'Make another'];
          data = reservations;
        }
        break;
      }

      case 'CANCEL_RESERVATION': {
        const [userRes] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM restaurant_tables WHERE current_customer_id = ? AND status = 'Reserved' LIMIT 1`,
          [userId]
        );

        if (userRes.length === 0) {
          response = `You don't have any reservations to cancel.`;
          quickReplies = ['Make reservation', 'Check tables'];
        } else {
          await pool.query(
            `UPDATE restaurant_tables SET status = 'Available', current_customer_id = NULL, reservation_time = NULL WHERE id = ?`,
            [userRes[0].id]
          );
          response = `Your reservation for Table #${userRes[0].table_number} has been cancelled.`;
          quickReplies = ['Make reservation', 'Check tables'];
        }
        break;
      }

      case 'MANAGER_STATS': {
        const [tableStats] = await pool.query<RowDataPacket[]>(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
            SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved
          FROM restaurant_tables WHERE is_enabled = 1
        `);

        const [queueStats] = await pool.query<RowDataPacket[]>(`
          SELECT COUNT(*) as waiting FROM queue WHERE status = 'Waiting'
        `);

        const stats = tableStats[0];
        response = `📊 Current Status:\n` +
          `• Tables: ${stats.available} available, ${stats.occupied} occupied, ${stats.reserved} reserved (${stats.total} total)\n` +
          `• Queue: ${queueStats[0].waiting} parties waiting`;
        data = { tables: stats, queue: queueStats[0] };
        break;
      }

      case 'CONFIRM': {
        // User said confirm but not in a confirmation flow
        response = `There's nothing to confirm right now. Would you like to:\n` +
          `• Make a reservation\n` +
          `• Check available tables\n` +
          `• Join the queue`;
        quickReplies = ['Make reservation', 'Check tables', 'Join queue'];
        break;
      }

      case 'CANCEL': {
        // User said cancel but not in any flow
        response = `There's nothing to cancel. How can I help you?`;
        quickReplies = ['Check tables', 'Make reservation', 'Help'];
        break;
      }

      default: {
        response = `I'm not sure what you mean. Try saying:\n` +
          `• "Book a table for 4"\n` +
          `• "Check available tables"\n` +
          `• "Join the queue"\n` +
          `• "Help" for more options`;
        quickReplies = ['Check tables', 'Make reservation', 'Help'];
      }
    }

    res.json({
      response,
      intent,
      confidence,
      data,
      success: true,
      quickReplies,
      sessionStep: session.step
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      response: "Sorry, I encountered an error. Please try again.",
      success: false
    });
  }
});

// Clear session endpoint (optional - for testing)
router.post('/clear-session', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId!;
  clearSession(userId);
  res.json({ message: 'Session cleared', success: true });
});

export default router;
