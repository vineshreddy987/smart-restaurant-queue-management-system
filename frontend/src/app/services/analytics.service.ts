import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardAnalytics {
  tables: {
    total_tables: number;
    available_tables: number;
    occupied_tables: number;
    reserved_tables: number;
    total_capacity: number;
  };
  queue: {
    total_in_queue: number;
    total_people_waiting: number;
    avg_party_size: number;
  };
  today: {
    queue_joins_today: number;
    seated_today: number;
    cancelled_today: number;
  };
  users: {
    total_users: number;
    customers: number;
    managers: number;
    admins: number;
  };
  tableTypes: { type: string; count: number; total_capacity: number }[];
  queueActivity: { date: string; total: number; seated: number; cancelled: number }[];
  reservations: { active_reservations: number };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  contact_info: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private apiUrl = 'http://localhost:3001/api/analytics';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardAnalytics> {
    return this.http.get<DashboardAnalytics>(`${this.apiUrl}/dashboard`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
}
