export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'Customer' | 'Manager' | 'Admin';
  contact_info?: string;
  created_at?: Date;
}

export interface RestaurantTable {
  id: number;
  table_number: number;
  capacity: number;
  type: 'Regular' | 'VIP';
  status: 'Available' | 'Occupied' | 'Reserved';
  current_customer_id?: number | null;
  reservation_time?: Date | null;
  created_at?: Date;
}

export interface QueueEntry {
  id: number;
  customer_id: number;
  party_size: number;
  table_type: 'Regular' | 'VIP';
  position: number;
  status: 'Waiting' | 'Seated' | 'Cancelled';
  joined_at?: Date;
  customer_name?: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}
