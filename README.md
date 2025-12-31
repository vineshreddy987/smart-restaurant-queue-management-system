# SmartServe - Smart Restaurant Queue & Table Management System

**Smart Seating. Seamless Service.**

A full-stack web application for managing restaurant seating, waiting queues, and reservations with role-based access control.

## 🎨 Branding

- **Brand Name:** SmartServe
- **Tagline:** Smart Seating. Seamless Service.
- **Colors:** Blue (#1565c0) & Green (#00c853)
- **Logo:** Chair with circular arrows and clock icon

## 🛠️ Technology Stack

| Layer            | Technology Used                         |
|------------------|-----------------------------------------|
| Frontend         | Angular 17 + Angular Material           |
| Backend          | Node.js + Express + TypeScript          |
| Database         | MySQL                                   |
| Authentication   | JWT (JSON Web Tokens)                   |

## 🏠 Landing Page

The application features a professional landing page at `/` with:

- **Header:** Sticky navigation with SmartServe logo and links
- **Hero Section:** Full-screen with animated logo, tagline, and CTA button
- **Features Section:** 6 feature cards highlighting key capabilities
- **How It Works:** 3-step process visualization
- **Gallery:** Restaurant ambiance images with hover effects
- **CTA Section:** Call-to-action for booking
- **Footer:** Contact info, quick links, and social icons

### Navigation Flow
- "Book a Table" button → Redirects to `/reservation` (if logged in) or `/login` (if not)
- Protected routes require authentication
- Landing page is public (no login required)
- Redirect URL stored in sessionStorage for post-login navigation

## 🔧 UI/UX Features

### Toolbar Navigation
- SmartServe logo (clickable, navigates to home)
- Home icon button with tooltip
- Role-based menu items
- User menu with logout option

### Login Page
- Mini header with SmartServe branding
- "Back to Home" link for easy navigation
- Session expired message display
- Consistent branding with landing page

### Favicon
- Custom SmartServe chair logo as browser tab icon
- Configured in `index.html` as PNG favicon

## Features

### Customer Features
- View available tables with visual representation
- Join waiting queue with party size and table preference
- Make table reservations with date/time selection (dropdown-based)
- View and cancel own reservations
- Real-time queue position tracking
- Chatbot assistant for natural language interactions

### Manager Features
- Dashboard with table overview and notifications
- Manage tables (add, edit, delete)
- Seat customers from queue
- Confirm/cancel reservations
- Update table status (Available/Occupied/Reserved)
- Alert bar for tables nearing vacate time
- Notifications tab with history

### Admin Features
- User management (create, edit, activate/deactivate, delete)
- System settings configuration (queue/reservation toggles)
- Queue and reservation monitoring
- Activity logs and analytics
- System health monitoring
- Configurable reservation duration limits

## Authentication & Security

### JWT Token Management
- Tokens are issued with 24-hour expiration
- Token validation occurs on every protected route
- Expired tokens are automatically rejected with HTTP 401

### Frontend Token Handling
- Token stored in localStorage
- On app load: token is decoded and expiration checked
- Expired tokens are cleared automatically
- Users redirected to login with "Session expired" message

### Auth Guard Protection
- All private routes protected by Angular Route Guards
- Guards verify both token presence AND validity
- Invalid/expired tokens trigger automatic logout

### Session Flow
1. User logs in → JWT issued (24h expiry)
2. Token stored in localStorage
3. On subsequent visits:
   - Token decoded and expiration checked
   - If valid → auto-login allowed
   - If expired → cleared, redirect to login
4. API calls with expired token → 401 → auto-logout

### Logout
- Explicit logout clears token and user data
- Redirects to login page
- Session expired shows friendly message

## Database Schema

### Core Tables

**Users Table**
- id, name, email, password, role (Customer/Manager/Admin)
- contact_info, is_active, created_at

**Restaurant Tables**
- id, table_number, capacity, type (Regular/VIP)
- status (Available/Occupied/Reserved)
- current_customer_id (nullable), reservation_time (nullable)
- reservation_duration (minutes), occupied_at (datetime)
- is_enabled, created_at

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Angular CLI 17+

### 1. Backend Setup
```bash
cd backend
npm install

# Configure .env file:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=restaurant_queue_db
# PORT=3001
# JWT_SECRET=your_secret_key

npm run dev
```
Server runs on http://localhost:3001

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
App runs on http://localhost:4200

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update profile

### Tables
- `GET /api/tables` - Get all tables
- `GET /api/tables/status/available` - Get available tables
- `POST /api/tables` - Add table (Manager)
- `PUT /api/tables/:id` - Update table (Manager)
- `DELETE /api/tables/:id` - Delete table (Manager)
- `PATCH /api/tables/:id/status` - Update status (Manager)

### Queue
- `GET /api/queue` - Get waiting queue
- `GET /api/queue/my-position` - Get user's position
- `POST /api/queue/join` - Join queue
- `DELETE /api/queue/leave` - Leave queue
- `POST /api/queue/seat/:id` - Seat customer (Manager)

### Reservations
- `GET /api/reservations/settings` - Get duration settings
- `GET /api/reservations` - Get all reservations (Manager)
- `GET /api/reservations/my-reservations` - Get user's reservations
- `POST /api/reservations` - Make reservation (with optional duration)
- `DELETE /api/reservations/:id` - Cancel reservation
- `POST /api/reservations/confirm/:id` - Confirm reservation (Manager)

### Notifications
- `GET /api/notifications` - Get manager notifications
- `GET /api/notifications/tables-nearing-vacate` - Get tables nearing vacate time
- `GET /api/notifications/unread-count` - Get unread notification count
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `PATCH /api/admin/users/:id/status` - Toggle user status
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings/:key` - Update setting
- `GET /api/admin/logs` - Get activity logs

## Role-Based Access Control

| Route                | Customer | Manager | Admin |
| -------------------- | -------- | ------- | ----- |
| `/tables`            | ✓        | ✓       | ✓    |
| `/queue`             | ✓        | ✓       | ✓    |
| `/reservation`       | ✓        | ✓       | ✓    |
| `/manager/dashboard` | ✗        | ✓       | ✓    |
| `/analytics`         | ✗        | ✓       | ✓    |
| `/admin/*`           | ✗        | ✗       | ✓    |


## Validation Rules

- Table number: Required, positive integer, unique
- Capacity: Required, 1-50
- Party size: 1-20
- Reservation time: Must be in future, max 30 days ahead (configurable)
- Reservation duration: Optional, 30-180 minutes (configurable by admin)
- Status transitions: Available ↔ Occupied ↔ Reserved (valid paths only)
- Queue position: Auto-updates when customers leave or are seated
- Business hours: 10 AM - 10 PM (for chatbot time slot generation)

## Reservation Time Selection

The reservation form uses a user-friendly dropdown-based time selection:
- Hour dropdown (1-12)
- Minute dropdown (00, 15, 30, 45)
- AM/PM selector
- Avoids timezone conversion issues with ISO strings
- Time sent to backend as local time string

## Reservation Duration & Notifications

### Custom Reservation Duration
- Customers can optionally specify reservation duration (30-180 minutes)
- If not specified, system uses admin-configured default (60 minutes)
- Duration limits are configurable by admin in System Settings

### Manager Notifications
- Managers receive notifications 5 minutes before a table is expected to be vacated
- Notification timing is configurable by admin
- Manager dashboard shows:
  - Alert bar when tables are nearing vacate time
  - Highlighted table cards for tables nearing vacate
  - Notifications tab with history and quick actions
- Notifications are automatically scheduled when:
  - Manager seats a customer from reservation
  - Manager seats a customer from queue
- Notifications are cancelled when:
  - Table is vacated early
  - Reservation is cancelled

### Admin Configuration
System settings for reservation duration:
- `default_reservation_duration`: Default duration in minutes (default: 60)
- `min_reservation_duration`: Minimum allowed duration (default: 30)
- `max_reservation_duration`: Maximum allowed duration (default: 180)
- `notification_minutes_before`: Minutes before vacate to notify (default: 5)
- `queue_enabled`: Enable/disable queue feature (default: true)
- `reservation_enabled`: Enable/disable reservation feature (default: true)

## Table Visualization

Dynamic SVG-based table visualization with:
- Circular tables with chairs arranged around them
- Chair count matches party size/table capacity
- Color-coded by status (green=available, red=occupied, orange=reserved)
- Responsive design

## Error Handling

- Global error handler for unhandled exceptions
- Errors logged to database
- User-friendly messages via snackbar
- Appropriate HTTP status codes (400, 401, 403, 404, 500)



## Chatbot Feature

The application includes a context-aware, rule-based chatbot assistant branded as "SmartServe Assistant".

### Chatbot Branding
- Toggle button displays SmartServe logo with gradient background
- Header shows "SmartServe Assistant" with branded styling
- Hover animation with subtle rotation effect

### Session State Management
The chatbot maintains conversation context using in-memory session storage:
- Sessions are keyed by user ID
- 5-minute session timeout for inactive conversations
- Multi-step reservation flow with state tracking

### Conversation Flow States
| State                     | Description                                   |
|---------------------------|-----------------------------------------------|
| IDLE                      | Default state, ready for new commands         |
| AWAITING_CAPACITY         | Waiting for party size input                  |
| AWAITING_TABLE_SELECTION  | Waiting for table selection from the list     |
| AWAITING_DATE             | Waiting for reservation date                  |
| AWAITING_TIME             | Waiting for time slot selection               |
| AWAITING_CONFIRMATION     | Waiting for yes/no confirmation               |


### Chatbot Capabilities

| Intent             | Example Phrases                      | Roles          |
|--------------------|--------------------------------------|----------------|
| Check Tables       | "Is a table available for 4?"        | All            |
| Queue Position     | "What's my queue position?"          | All            |
| Join Queue         | "Add me to the queue for 3 people"   | Customer       |
| Leave Queue        | "Remove me from queue"               | Customer       |
| Make Reservation   | "Book a table for tomorrow at 7 PM"  | Customer       |
| View Reservations  | "Show my reservations"               | All            |
| Cancel Reservation | "Cancel my reservation"              | All            |
| Manager Stats      | "Show today's stats"                 | Manager, Admin |
| Help               | "What can you do?"                   | All            |
### Quick Replies
The chatbot provides context-aware quick reply buttons:
- Dynamically generated based on conversation state
- Time slots shown as clickable buttons (30-min intervals)
- Table numbers shown as quick selection options
- Global actions: Cancel, Help

### Time Slot Selection
- Business hours: 10 AM - 10 PM
- 30-minute intervals
- Past times automatically filtered for same-day bookings
- Validation ensures time is within business hours

### Global Commands
These commands work at any point in the conversation:
- "cancel", "stop", "exit", "start over", "reset", "quit", "nevermind", "abort"

### Chatbot API

```
POST /api/chatbot/message
Body: { "message": "Is a table available for 4?" }
Response: {
  "response": "Great news! I found 2 tables...",
  "intent": "CHECK_TABLE",
  "confidence": 2,
  "data": [...],
  "success": true,
  "quickReplies": ["Table 1", "Table 2", "Cancel"],
  "sessionStep": "AWAITING_TABLE_SELECTION"
}
```

### How It Works

1. User sends a message via the chat widget
2. Session state is retrieved/created for the user
3. Global cancel commands are checked first
4. If in a multi-step flow, context-aware processing occurs
5. Otherwise, intent detection via keyword matching
6. Role-based access control validates permission
7. Intent handler executes business logic
8. Response with quick replies returned to user

### Supported Date/Time Formats

- Dates: "today", "tomorrow", "day after tomorrow", "Friday", "next Monday"
- Times: "7 PM", "7:30 PM", "19:00", "6:30 pm"
- Quick replies: Clickable time slot buttons
