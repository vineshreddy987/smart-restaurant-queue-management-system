import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReservationSettings {
  default_duration: number;
  min_duration: number;
  max_duration: number;
  reservation_enabled: boolean;
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
}
