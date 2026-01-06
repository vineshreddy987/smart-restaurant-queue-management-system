import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReservationSettings {
  default_duration: number;
  min_duration: number;
  max_duration: number;
  reservation_enabled: boolean;
}

export interface ReservationHistory {
  id: number;
  customer_id: number;
  table_id: number;
  table_number: number;
  table_type: 'Regular' | 'VIP';
  party_size: number;
  reservation_time: string;
  reservation_duration: number;
  status: 'RESERVED' | 'OCCUPIED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  created_by_id: number | null;
  created_by_role: string;
  seated_by_id: number | null;
  completed_at: string | null;
  created_at: string;
  customer_name: string;
  customer_email: string;
  contact_info: string | null;
  created_by_name: string | null;
  seated_by_name: string | null;
}

export interface HistoryResponse {
  history: ReservationHistory[];
  total: number;
  limit: number;
  offset: number;
}

export interface HistoryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  tableId?: number;
  customerId?: number;
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  summary: {
    total_reservations: number;
    completed: number;
    cancelled: number;
    expired: number;
    active_reserved: number;
    currently_occupied: number;
    avg_duration: number;
    avg_party_size: number;
  };
  dailyBreakdown: { date: string; total: number; completed: number; cancelled: number }[];
}

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private apiUrl = 'http://localhost:3001/api/reservations';

  constructor(private http: HttpClient) {}

  // Get reservation settings (duration limits)
  getSettings(): Observable<ReservationSettings> {
    return this.http.get<ReservationSettings>(`${this.apiUrl}/settings`);
  }

  getReservations(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getMyReservations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-reservations`);
  }

  makeReservation(tableId: number, reservationTime: string, partySize: number, duration?: number): Observable<any> {
    const body: any = { 
      table_id: Number(tableId), 
      reservation_time: reservationTime, 
      party_size: Number(partySize) 
    };
    if (duration) {
      body.duration = Number(duration);
    }
    return this.http.post(this.apiUrl, body);
  }

  cancelReservation(tableId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${tableId}`);
  }

  confirmReservation(tableId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm/${tableId}`, {});
  }

  // ==================== BOOKING HISTORY ====================

  getHistory(filters?: HistoryFilters): Observable<HistoryResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.tableId) params = params.set('tableId', filters.tableId.toString());
      if (filters.customerId) params = params.set('customerId', filters.customerId.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.offset) params = params.set('offset', filters.offset.toString());
    }
    return this.http.get<HistoryResponse>(`${this.apiUrl}/history`, { params });
  }

  getHistoryStats(startDate?: string, endDate?: string): Observable<HistoryStats> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<HistoryStats>(`${this.apiUrl}/history/stats`, { params });
  }
}
