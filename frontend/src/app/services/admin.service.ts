import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Customer' | 'Manager' | 'Admin';
  contact_info?: string;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  users: {
    total_users: number;
    customers: number;
    managers: number;
    admins: number;
    active_users: number;
    inactive_users: number;
  };
  tables: {
    total_tables: number;
    available: number;
    occupied: number;
    reserved: number;
    total_capacity: number;
    enabled_tables: number;
    disabled_tables: number;
  };
  queue: {
    current_waiting: number;
    people_waiting: number;
    seated_today: number;
    joins_today: number;
  };
  reservations: {
    active_reservations: number;
    today_reservations: number;
  };
  dailyActivity: { date: string; queue_joins: number; seated: number }[];
  peakHours: { hour: number; count: number }[];
  tableUtilization: { type: string; total: number; in_use: number }[];
}

export interface SystemSettings {
  queue_enabled: string;
  reservation_enabled: string;
  max_queue_size: string;
  max_reservation_days_ahead: string;
  default_reservation_duration: string;
  min_reservation_duration: string;
  max_reservation_duration: string;
  notification_minutes_before: string;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  admin_name: string;
  admin_email: string;
  action_type: string;
  details: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = 'http://localhost:3001/api/admin';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }

  // User Management
  getUsers(filters?: { role?: string; status?: string; search?: string }): Observable<User[]> {
    let url = `${this.apiUrl}/users`;
    const params: string[] = [];
    if (filters?.role) params.push(`role=${filters.role}`);
    if (filters?.status) params.push(`status=${filters.status}`);
    if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<User[]>(url);
  }

  getUser(id: number): Observable<User & { stats: any }> {
    return this.http.get<User & { stats: any }>(`${this.apiUrl}/users/${id}`);
  }

  createUser(user: { name: string; email: string; password: string; role: string; contact_info?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, user);
  }

  updateUser(id: number, data: Partial<User>): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data);
  }

  toggleUserStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/status`, { is_active: isActive });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  // Table Management
  getTables(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tables`);
  }

  toggleTableStatus(id: number, isEnabled: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${id}/status`, { is_enabled: isEnabled });
  }

  // Queue Management
  getQueue(): Observable<{ queue: any[]; stats: any }> {
    return this.http.get<{ queue: any[]; stats: any }>(`${this.apiUrl}/queue`);
  }

  cancelQueueEntry(id: number, reason?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/queue/${id}`, { body: { reason } });
  }

  // Reservation Management
  getReservations(): Observable<{ reservations: any[]; stats: any }> {
    return this.http.get<{ reservations: any[]; stats: any }>(`${this.apiUrl}/reservations`);
  }

  cancelReservation(tableId: number, reason?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reservations/${tableId}`, { body: { reason } });
  }

  // System Settings
  getSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}/settings`);
  }

  updateSetting(key: string, value: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/settings/${key}`, { value });
  }

  // Logs
  getLogs(limit?: number, actionType?: string): Observable<AdminLog[]> {
    let url = `${this.apiUrl}/logs`;
    const params: string[] = [];
    if (limit) params.push(`limit=${limit}`);
    if (actionType) params.push(`action_type=${actionType}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<AdminLog[]>(url);
  }

  getErrorLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/errors`);
  }

  // System Status
  getSystemStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/system-status`);
  }
}
