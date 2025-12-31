import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RestaurantTable {
  id: number;
  table_number: number;
  capacity: number;
  type: 'Regular' | 'VIP';
  status: 'Available' | 'Occupied' | 'Reserved';
  current_customer_id?: number;
  customer_name?: string;
  reservation_time?: string;
  reservation_duration?: number;
  occupied_at?: string;
  is_enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableService {
  private apiUrl = 'http://localhost:3001/api/tables';

  constructor(private http: HttpClient) {}

  getTables(): Observable<RestaurantTable[]> {
    return this.http.get<RestaurantTable[]>(this.apiUrl);
  }

  getAvailableTables(capacity?: number, type?: string): Observable<RestaurantTable[]> {
    let url = `${this.apiUrl}/status/available`;
    const params: string[] = [];
    if (capacity) params.push(`capacity=${capacity}`);
    if (type && type !== '') params.push(`type=${type}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<RestaurantTable[]>(url);
  }

  addTable(table: { table_number: number; capacity: number; type: string }): Observable<any> {
    return this.http.post(this.apiUrl, table);
  }

  updateTable(id: number, table: Partial<RestaurantTable>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, table);
  }

  deleteTable(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateTableStatus(id: number, status: string, customerId?: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status, customer_id: customerId });
  }
}
