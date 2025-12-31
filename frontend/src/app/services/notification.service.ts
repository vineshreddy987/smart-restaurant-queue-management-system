import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

export interface ManagerNotification {
  id: number;
  tableId: number;
  tableNumber: number;
  customerName: string;
  expectedVacateTime: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface TableNearingVacate {
  tableId: number;
  tableNumber: number;
  customerName: string;
  expectedVacateTime: string;
  minutesRemaining: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = 'http://localhost:3001/api/notifications';
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {}

  // Get unread count as observable
  get unreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // Get all notifications
  getNotifications(unreadOnly: boolean = false): Observable<{ notifications: ManagerNotification[]; unreadCount: number }> {
    const url = unreadOnly ? `${this.apiUrl}?unread=true` : this.apiUrl;
    return this.http.get<{ notifications: ManagerNotification[]; unreadCount: number }>(url).pipe(
      tap(res => this.unreadCount$.next(res.unreadCount))
    );
  }

  // Get tables nearing vacate time
  getTablesNearingVacate(): Observable<TableNearingVacate[]> {
    return this.http.get<TableNearingVacate[]>(`${this.apiUrl}/tables-nearing-vacate`);
  }

  // Get unread count
  fetchUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(res => this.unreadCount$.next(res.count))
    );
  }

  // Mark notification as read
  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/read`, {});
  }

  // Mark all as read
  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => this.unreadCount$.next(0))
    );
  }

  // Start polling for notifications (call in manager dashboard)
  startPolling(intervalMs: number = 30000): Observable<{ notifications: ManagerNotification[]; unreadCount: number }> {
    return interval(intervalMs).pipe(
      switchMap(() => this.getNotifications())
    );
  }
}
