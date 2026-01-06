import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { DatePipe } from '@angular/common';
import { TableService, RestaurantTable } from '../../services/table.service';
import { QueueService, QueueEntry } from '../../services/queue.service';
import { ReservationService } from '../../services/reservation.service';
import { NotificationService, ManagerNotification, TableNearingVacate } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTabsModule, MatTableModule, MatChipsModule, MatDialogModule, MatSnackBarModule, MatBadgeModule, DatePipe],
  template: `
    <h2>Manager Dashboard</h2>
    
    <!-- Notifications Alert Bar -->
    @if (tablesNearingVacate.length > 0) {
      <div class="alert-bar">
        <mat-icon>warning</mat-icon>
        <span>{{ tablesNearingVacate.length }} table(s) nearing vacate time!</span>
        <button mat-button (click)="selectedTabIndex = 3">View</button>
      </div>
    }
    
    <mat-tab-group [(selectedIndex)]="selectedTabIndex">
      <!-- Tables Tab -->
      <mat-tab label="Tables">
        <div class="tab-content">
          <mat-card class="add-table-card">
            <mat-card-header>
              <mat-card-title>{{ editingTable ? 'Edit Table' : 'Add New Table' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="tableForm" (ngSubmit)="saveTable()">
                <mat-form-field>
                  <mat-label>Table Number</mat-label>
                  <input matInput type="number" formControlName="table_number">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Capacity</mat-label>
                  <input matInput type="number" formControlName="capacity">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Type</mat-label>
                  <mat-select formControlName="type">
                    <mat-option value="Regular">Regular</mat-option>
                    <mat-option value="VIP">VIP</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (editingTable) {
                  <mat-form-field>
                    <mat-label>Status</mat-label>
                    <mat-select formControlName="status">
                      <mat-option value="Available">Available</mat-option>
                      <mat-option value="Occupied">Occupied</mat-option>
                      <mat-option value="Reserved">Reserved</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
                <button mat-raised-button color="primary" type="submit">{{ editingTable ? 'Update' : 'Add' }}</button>
                @if (editingTable) {
                  <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
                }
              </form>
            </mat-card-content>
          </mat-card>

          <div class="card-grid mt-20">
            @for (table of tables; track table.id) {
              <mat-card class="table-card" [class.nearing-vacate]="isTableNearingVacate(table.id)">
                <mat-card-header>
                  <mat-card-title>Table #{{ table.table_number }}</mat-card-title>
                  @if (isTableNearingVacate(table.id)) {
                    <mat-icon class="warning-icon">schedule</mat-icon>
                  }
                </mat-card-header>
                <mat-card-content>
                  <p>Capacity: {{ table.capacity }} | Type: {{ table.type }}</p>
                  <mat-chip [class]="'status-' + table.status.toLowerCase()">{{ table.status }}</mat-chip>
                  @if (table.customer_name) {
                    <p><small>Customer: {{ table.customer_name }}</small></p>
                  }
                  @if (table.reservation_duration && table.status === 'Occupied') {
                    <p><small>Duration: {{ table.reservation_duration }} min</small></p>
                  }
                </mat-card-content>
                <mat-card-actions>
                  <button mat-icon-button (click)="editTable(table)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteTable(table.id)"><mat-icon>delete</mat-icon></button>
                  @if (table.status === 'Occupied') {
                    <button mat-button color="accent" (click)="vacateTable(table.id)">Vacate</button>
                  }
                </mat-card-actions>
              </mat-card>
            }
          </div>
        </div>
      </mat-tab>

      <!-- Queue Tab -->
      <mat-tab label="Queue">
        <div class="tab-content">
          <table mat-table [dataSource]="queue" class="full-width">
            <ng-container matColumnDef="position">
              <th mat-header-cell *matHeaderCellDef>Position</th>
              <td mat-cell *matCellDef="let entry">{{ entry.position }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let entry">{{ entry.customer_name }}</td>
            </ng-container>
            <ng-container matColumnDef="party_size">
              <th mat-header-cell *matHeaderCellDef>Party Size</th>
              <td mat-cell *matCellDef="let entry">{{ entry.party_size }}</td>
            </ng-container>
            <ng-container matColumnDef="table_type">
              <th mat-header-cell *matHeaderCellDef>Table Type</th>
              <td mat-cell *matCellDef="let entry">{{ entry.table_type }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let entry">
                <button mat-raised-button color="primary" (click)="openSeatDialog(entry)">Seat</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="queueColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: queueColumns;"></tr>
          </table>
          @if (queue.length === 0) {
            <p class="text-center mt-20">No customers in queue</p>
          }
        </div>
      </mat-tab>

      <!-- Reservations Tab -->
      <mat-tab label="Reservations">
        <div class="tab-content">
          <div class="tab-header">
            <h3>Active Reservations</h3>
            <a mat-stroked-button routerLink="/manager/history">
              <mat-icon>history</mat-icon> View Full History
            </a>
          </div>
          <table mat-table [dataSource]="reservations" class="full-width">
            <ng-container matColumnDef="table">
              <th mat-header-cell *matHeaderCellDef>Table</th>
              <td mat-cell *matCellDef="let res">#{{ res.table_number }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let res">{{ res.customer_name }}</td>
            </ng-container>
            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let res">{{ res.reservation_time | date:'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef>Duration</th>
              <td mat-cell *matCellDef="let res">{{ res.reservation_duration || 60 }} min</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let res">
                <button mat-raised-button color="primary" (click)="confirmReservation(res.id)">Seat</button>
                <button mat-button color="warn" (click)="cancelReservation(res.id)">Cancel</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="reservationColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: reservationColumns;"></tr>
          </table>
          @if (reservations.length === 0) {
            <p class="text-center mt-20">No reservations</p>
          }
        </div>
      </mat-tab>

      <!-- Notifications Tab -->
      <mat-tab>
        <ng-template mat-tab-label>
          <span [matBadge]="unreadCount" [matBadgeHidden]="unreadCount === 0" matBadgeColor="warn">
            Notifications
          </span>
        </ng-template>
        <div class="tab-content">
          <div class="notifications-header">
            <h3>Table Vacate Notifications</h3>
            @if (notifications.length > 0) {
              <button mat-button (click)="markAllRead()">Mark All Read</button>
            }
          </div>

          <!-- Tables Nearing Vacate -->
          @if (tablesNearingVacate.length > 0) {
            <mat-card class="warning-card">
              <mat-card-header>
                <mat-icon mat-card-avatar color="warn">schedule</mat-icon>
                <mat-card-title>Tables Nearing Vacate Time</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @for (table of tablesNearingVacate; track table.tableId) {
                  <div class="vacate-item">
                    <mat-icon color="warn">table_restaurant</mat-icon>
                    <div class="vacate-info">
                      <strong>Table #{{ table.tableNumber }}</strong>
                      <span>{{ table.customerName }} - {{ table.minutesRemaining }} min remaining</span>
                    </div>
                    <button mat-stroked-button color="primary" (click)="vacateTable(table.tableId)">
                      Vacate Now
                    </button>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Notification History -->
          <div class="notifications-list">
            @for (notif of notifications; track notif.id) {
              <mat-card class="notification-card" [class.unread]="!notif.read">
                <mat-card-content>
                  <div class="notification-content">
                    <mat-icon>{{ notif.read ? 'notifications_none' : 'notifications_active' }}</mat-icon>
                    <div class="notification-text">
                      <p>{{ notif.message }}</p>
                      <small>{{ notif.createdAt | date:'short' }}</small>
                    </div>
                    @if (!notif.read) {
                      <button mat-icon-button (click)="markRead(notif.id)">
                        <mat-icon>check</mat-icon>
                      </button>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            } @empty {
              <p class="text-center mt-20">No notifications yet</p>
            }
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>

    <!-- Seat Dialog -->
    @if (showSeatDialog) {
      <div class="dialog-overlay" (click)="closeSeatDialog()">
        <mat-card class="seat-dialog" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-card-title>Seat {{ selectedQueueEntry?.customer_name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field class="full-width">
              <mat-label>Select Table</mat-label>
              <mat-select [(value)]="selectedTableId">
                @for (table of availableTables; track table.id) {
                  <mat-option [value]="table.id">
                    Table #{{ table.table_number }} ({{ table.capacity }} seats)
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="seatCustomer()" [disabled]="!selectedTableId">Confirm</button>
            <button mat-button (click)="closeSeatDialog()">Cancel</button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .tab-content { padding: 20px; }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .tab-header h3 { margin: 0; }
    .add-table-card form { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .add-table-card mat-form-field { width: 150px; }
    mat-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 16px; }
    .seat-dialog { width: 400px; max-width: 100%; padding: 20px; }
    
    .alert-bar { 
      background: #fff3e0; 
      border-left: 4px solid #ff9800; 
      padding: 12px 16px; 
      margin-bottom: 16px; 
      display: flex; 
      align-items: center; 
      gap: 12px;
      border-radius: 4px;
      flex-wrap: wrap;
    }
    .alert-bar mat-icon { color: #ff9800; }
    .alert-bar span { flex: 1; min-width: 150px; }
    
    .table-card.nearing-vacate { border: 2px solid #ff9800; }
    .warning-icon { color: #ff9800; margin-left: auto; }
    
    .notifications-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .notifications-header h3 { margin: 0; }
    
    .warning-card { background: #fff8e1; margin-bottom: 20px; }
    .warning-card mat-icon { color: #ff9800; }
    
    .vacate-item { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      padding: 12px 0; 
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
    }
    .vacate-item:last-child { border-bottom: none; }
    .vacate-info { flex: 1; display: flex; flex-direction: column; min-width: 150px; }
    .vacate-info span { font-size: 12px; color: #666; }
    
    .notifications-list { display: flex; flex-direction: column; gap: 12px; }
    .notification-card { transition: all 0.2s; }
    .notification-card.unread { background: #e3f2fd; border-left: 4px solid #1976d2; }
    .notification-content { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .notification-text { flex: 1; min-width: 200px; }
    .notification-text p { margin: 0 0 4px 0; }
    .notification-text small { color: #666; }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .tab-content { padding: 12px; }
      .add-table-card form { flex-direction: column; align-items: stretch; }
      .add-table-card mat-form-field { width: 100%; }
      .seat-dialog { width: 100%; padding: 16px; }
      .alert-bar { padding: 10px 12px; }
      .vacate-item { flex-direction: column; align-items: flex-start; gap: 8px; }
      .vacate-item button { width: 100%; }
    }
    
    @media (max-width: 600px) {
      .tab-content { padding: 8px; }
      mat-card-actions { flex-direction: column; }
      mat-card-actions button { width: 100%; }
      .notification-content { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  tables: RestaurantTable[] = [];
  queue: QueueEntry[] = [];
  reservations: any[] = [];
  availableTables: RestaurantTable[] = [];
  
  tableForm: FormGroup;
  editingTable: RestaurantTable | null = null;
  
  queueColumns = ['position', 'customer', 'party_size', 'table_type', 'actions'];
  reservationColumns = ['table', 'customer', 'time', 'duration', 'actions'];
  
  showSeatDialog = false;
  selectedQueueEntry: QueueEntry | null = null;
  selectedTableId: number | null = null;
  
  // Notifications
  notifications: ManagerNotification[] = [];
  tablesNearingVacate: TableNearingVacate[] = [];
  unreadCount = 0;
  selectedTabIndex = 0;
  
  private pollSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private tableService: TableService,
    private queueService: QueueService,
    private reservationService: ReservationService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {
    this.tableForm = this.fb.group({
      table_number: ['', [Validators.required, Validators.min(1)]],
      capacity: ['', [Validators.required, Validators.min(1)]],
      type: ['Regular', Validators.required],
      status: ['Available']
    });
  }

  ngOnInit() {
    this.loadAll();
    this.loadNotifications();
    this.startPolling();
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
  }

  startPolling() {
    // Poll for notifications every 30 seconds
    this.pollSubscription = interval(30000).pipe(
      switchMap(() => this.notificationService.getNotifications())
    ).subscribe({
      next: (res) => {
        const newUnread = res.unreadCount - this.unreadCount;
        if (newUnread > 0) {
          this.snackBar.open(`${newUnread} new notification(s)`, 'View', { duration: 5000 })
            .onAction().subscribe(() => this.selectedTabIndex = 3);
        }
        this.notifications = res.notifications;
        this.unreadCount = res.unreadCount;
        this.loadTablesNearingVacate();
      }
    });
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.notifications;
        this.unreadCount = res.unreadCount;
      }
    });
    this.loadTablesNearingVacate();
  }

  loadTablesNearingVacate() {
    this.notificationService.getTablesNearingVacate().subscribe({
      next: (tables) => this.tablesNearingVacate = tables
    });
  }

  isTableNearingVacate(tableId: number): boolean {
    return this.tablesNearingVacate.some(t => t.tableId === tableId);
  }

  markRead(id: number) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        const notif = this.notifications.find(n => n.id === id);
        if (notif) notif.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
      }
    });
  }

  loadAll() {
    this.tableService.getTables().subscribe(t => this.tables = t);
    this.queueService.getQueue().subscribe(q => this.queue = q);
    this.reservationService.getReservations().subscribe(r => this.reservations = r);
  }

  saveTable() {
    if (this.tableForm.valid) {
      const data = this.tableForm.value;
      const obs = this.editingTable 
        ? this.tableService.updateTable(this.editingTable.id, data)
        : this.tableService.addTable(data);
      
      obs.subscribe({
        next: () => {
          this.snackBar.open(this.editingTable ? 'Table updated' : 'Table added', 'Close', { duration: 3000 });
          this.loadAll();
          this.cancelEdit();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 3000 })
      });
    }
  }

  editTable(table: RestaurantTable) {
    this.editingTable = table;
    this.tableForm.patchValue(table);
  }

  cancelEdit() {
    this.editingTable = null;
    this.tableForm.reset({ type: 'Regular', status: 'Available' });
  }

  deleteTable(id: number) {
    this.tableService.deleteTable(id).subscribe({
      next: () => {
        this.snackBar.open('Table deleted', 'Close', { duration: 3000 });
        this.loadAll();
      }
    });
  }

  vacateTable(id: number) {
    this.tableService.updateTableStatus(id, 'Available').subscribe({
      next: () => {
        this.snackBar.open('Table vacated', 'Close', { duration: 3000 });
        this.loadAll();
      }
    });
  }

  openSeatDialog(entry: QueueEntry) {
    this.selectedQueueEntry = entry;
    this.tableService.getAvailableTables(entry.party_size, entry.table_type).subscribe(t => {
      this.availableTables = t;
      this.showSeatDialog = true;
    });
  }

  closeSeatDialog() {
    this.showSeatDialog = false;
    this.selectedQueueEntry = null;
    this.selectedTableId = null;
  }

  seatCustomer() {
    if (this.selectedQueueEntry && this.selectedTableId) {
      this.queueService.seatCustomer(this.selectedQueueEntry.id, this.selectedTableId).subscribe({
        next: () => {
          this.snackBar.open('Customer seated!', 'Close', { duration: 3000 });
          this.closeSeatDialog();
          this.loadAll();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 3000 })
      });
    }
  }

  confirmReservation(tableId: number) {
    this.reservationService.confirmReservation(tableId).subscribe({
      next: () => {
        this.snackBar.open('Customer seated from reservation', 'Close', { duration: 3000 });
        this.loadAll();
      }
    });
  }

  cancelReservation(tableId: number) {
    this.reservationService.cancelReservation(tableId).subscribe({
      next: () => {
        this.snackBar.open('Reservation cancelled', 'Close', { duration: 3000 });
        this.loadAll();
      }
    });
  }
}
