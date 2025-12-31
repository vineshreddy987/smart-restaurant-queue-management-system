import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueueEntry {
  id: number;
  customer_id: number;
  customer_name: string;
  party_size: number;
  table_type: 'Regular' | 'VIP';
  position: number;
  status: string;
  contact_info?: string;
}

export interface QueuePosition {
  inQueue: boolean;
  position?: number;
  totalWaiting?: number;
  estimatedWaitMinutes?: number;
  partySize?: number;
  tableType?: string;
  queueId?: number;
}

export interface QueueSettings {
  queue_enabled: boolean;
  max_queue_size: number;
}

@Injectable({ providedIn: 'root' })
export class QueueService {
  private apiUrl = 'http://localhost:3001/api/queue';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<QueueSettings> {
    return this.http.get<QueueSettings>(`${this.apiUrl}/settings`);
  }

  getQueue(): Observable<QueueEntry[]> {
    return this.http.get<QueueEntry[]>(this.apiUrl);
  }

  getMyPosition(): Observable<QueuePosition> {
    return this.http.get<QueuePosition>(`${this.apiUrl}/my-position`);
  }

  joinQueue(partySize: number, tableType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join`, { party_size: partySize, table_type: tableType });
  }

  leaveQueue(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/leave`);
  }

  seatCustomer(queueId: number, tableId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/seat/${queueId}`, { tableId });
  }
}
