import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ReservationService, ReservationHistory, HistoryFilters, HistoryStats } from '../../services/reservation.service';
import { TableService } from '../../services/table.service';

@Component({
  selector: 'app-manager-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatPaginatorModule,
    MatSortModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, MatTabsModule, DatePipe
  ],
  template: `
    <div class="history-container">
      <h2>Reservation History</h2>
      
      <!-- Stats Summary -->
      @if (stats) {
        <div class="stats-grid">
          <mat-card class="stat-card completed">
            <mat-card-content>
              <mat-icon>check_circle</mat-icon>
              <div class="stat-value">{{ stats.summary.completed || 0 }}</div>
              <div class="stat-label">Completed</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card cancelled">
            <mat-card-content>
              <mat-icon>cancel</mat-icon>
              <div class="stat-value">{{ stats.summary.cancelled || 0 }}</div>
              <div class="stat-label">Cancelled</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card expired">
            <mat-card-content>
              <mat-icon>schedule</mat-icon>
              <div class="stat-value">{{ stats.summary.expired || 0 }}</div>
              <div class="stat-label">Expired</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card total">
            <mat-card-content>
              <mat-icon>event</mat-icon>
              <div class="stat-value">{{ stats.summary.total_reservations || 0 }}</div>
              <div class="stat-label">Total</div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field>
              <mat-label>Status</mat-label>
              <mat-select [(value)]="filters.status" (selectionChange)="applyFilters()">
                <mat-option value="">All</mat-option>
                <mat-option value="COMPLETED">Completed</mat-option>
                <mat-option value="CANCELLED">Cancelled</mat-option>
                <mat-option value="EXPIRED">Expired</mat-option>
                <mat-option value="RESERVED">Reserved</mat-option>
                <mat-option value="OCCUPIED">Occupied</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Table</mat-label>
              <mat-select [(value)]="filters.tableId" (selectionChange)="applyFilters()">
                <mat-option [value]="null">All Tables</mat-option>
                @for (table of tables; track table.id) {
                  <mat-option [value]="table.id">#{{ table.table_number }} ({{ table.type }})</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" (dateChange)="applyFilters()">
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field>
              <mat-label>End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" (dateChange)="applyFilters()">
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <button mat-stroked-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon> Clear
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- History Table -->
      <mat-card class="table-card">
        @if (loading) {
          <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
        } @else {
          <table mat-table [dataSource]="history" matSort (matSortChange)="sortData($event)">
            <ng-container matColumnDef="customer_name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Customer</th>
              <td mat-cell *matCellDef="let row">
                <div class="customer-info">
                  <strong>{{ row.customer_name }}</strong>
                  <small>{{ row.customer_email }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="table_number">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Table</th>
              <td mat-cell *matCellDef="let row">#{{ row.table_number }}</td>
            </ng-container>

            <ng-container matColumnDef="table_type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [class]="row.table_type === 'VIP' ? 'vip-chip' : ''">
                  {{ row.table_type }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="reservation_time">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Reservation Time</th>
              <td mat-cell *matCellDef="let row">{{ row.reservation_time | date:'medium' }}</td>
            </ng-container>

            <ng-container matColumnDef="reservation_duration">
              <th mat-header-cell *matHeaderCellDef>Duration</th>
              <td mat-cell *matCellDef="let row">{{ row.reservation_duration }} min</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [class]="'status-' + row.status.toLowerCase()">
                  {{ row.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="seated_by_name">
              <th mat-header-cell *matHeaderCellDef>Seated By</th>
              <td mat-cell *matCellDef="let row">{{ row.seated_by_name || '-' }}</td>
            </ng-container>

            <ng-container matColumnDef="created_at">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Booked On</th>
              <td mat-cell *matCellDef="let row">{{ row.created_at | date:'short' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (history.length === 0) {
            <div class="empty-state">
              <mat-icon>history</mat-icon>
              <p>No reservation history found</p>
              <span>Past reservations will appear here</span>
            </div>
          }

          <mat-paginator
            [length]="totalRecords"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .history-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
    
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
      gap: 16px; 
      margin-bottom: 20px; 
    }
    .stat-card mat-card-content { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      padding: 16px; 
    }
    .stat-card mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #666; }
    .stat-card.completed mat-icon { color: #4caf50; }
    .stat-card.cancelled mat-icon { color: #f44336; }
    .stat-card.expired mat-icon { color: #ff9800; }
    .stat-card.total mat-icon { color: #2196f3; }
    
    .filters-card { margin-bottom: 20px; }
    .filters-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .filters-row mat-form-field { min-width: 150px; flex: 1; }
    
    .table-card { overflow: hidden; }
    table { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    
    .customer-info { display: flex; flex-direction: column; }
    .customer-info small { color: #666; font-size: 11px; }
    
    .empty-state { 
      text-align: center; 
      padding: 60px 20px; 
      color: #666;
    }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; }
    .empty-state p { font-size: 18px; margin: 16px 0 8px; }
    
    .status-completed { background: #c8e6c9 !important; color: #2e7d32 !important; }
    .status-cancelled { background: #ffcdd2 !important; color: #c62828 !important; }
    .status-expired { background: #fff3e0 !important; color: #ef6c00 !important; }
    .status-reserved { background: #e3f2fd !important; color: #1565c0 !important; }
    .status-occupied { background: #f3e5f5 !important; color: #7b1fa2 !important; }
    .vip-chip { background: #ffd700 !important; color: #333 !important; }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .history-container { padding: 12px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-card mat-icon { font-size: 24px; width: 24px; height: 24px; }
      .stat-value { font-size: 20px; }
      .filters-row { flex-direction: column; }
      .filters-row mat-form-field { width: 100%; min-width: unset; }
    }
    
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class ManagerHistoryComponent implements OnInit {
  history: ReservationHistory[] = [];
  tables: any[] = [];
  stats: HistoryStats | null = null;
  loading = true;
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  
  filters: HistoryFilters = {};
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  displayedColumns = ['customer_name', 'table_number', 'table_type', 'reservation_time', 'reservation_duration', 'status', 'seated_by_name', 'created_at'];

  constructor(
    private reservationService: ReservationService,
    private tableService: TableService
  ) {}

  ngOnInit() {
    this.loadTables();
    this.loadHistory();
    this.loadStats();
  }

  loadTables() {
    this.tableService.getTables().subscribe({
      next: (tables) => this.tables = tables
    });
  }

  loadStats() {
    this.reservationService.getHistoryStats().subscribe({
      next: (stats) => this.stats = stats
    });
  }

  loadHistory() {
    this.loading = true;
    const filters: HistoryFilters = {
      ...this.filters,
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize
    };
    
    if (this.startDate) {
      filters.startDate = this.formatDate(this.startDate);
    }
    if (this.endDate) {
      filters.endDate = this.formatDate(this.endDate);
    }

    this.reservationService.getHistory(filters).subscribe({
      next: (res) => {
        this.history = res.history;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.currentPage = 0;
    this.loadHistory();
  }

  clearFilters() {
    this.filters = {};
    this.startDate = null;
    this.endDate = null;
    this.currentPage = 0;
    this.loadHistory();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadHistory();
  }

  sortData(sort: Sort) {
    if (!sort.active || sort.direction === '') return;
    this.history = [...this.history].sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'customer_name': return this.compare(a.customer_name, b.customer_name, isAsc);
        case 'table_number': return this.compare(a.table_number, b.table_number, isAsc);
        case 'reservation_time': return this.compare(a.reservation_time, b.reservation_time, isAsc);
        case 'status': return this.compare(a.status, b.status, isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
