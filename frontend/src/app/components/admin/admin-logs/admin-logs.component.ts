import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, AdminLog } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <div class="admin-logs">
      <div class="header">
        <h2>Admin Activity Logs</h2>
        <button mat-raised-button (click)="loadLogs()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <mat-card class="filters">
        <mat-form-field>
          <mat-label>Action Type</mat-label>
          <mat-select [(ngModel)]="actionType" (selectionChange)="loadLogs()">
            <mat-option value="">All Actions</mat-option>
            <mat-option value="CREATE_USER">Create User</mat-option>
            <mat-option value="UPDATE_USER">Update User</mat-option>
            <mat-option value="DELETE_USER">Delete User</mat-option>
            <mat-option value="ACTIVATE_USER">Activate User</mat-option>
            <mat-option value="DEACTIVATE_USER">Deactivate User</mat-option>
            <mat-option value="ENABLE_TABLE">Enable Table</mat-option>
            <mat-option value="DISABLE_TABLE">Disable Table</mat-option>
            <mat-option value="CANCEL_QUEUE">Cancel Queue</mat-option>
            <mat-option value="CANCEL_RESERVATION">Cancel Reservation</mat-option>
            <mat-option value="UPDATE_SETTING">Update Setting</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Limit</mat-label>
          <mat-select [(ngModel)]="limit" (selectionChange)="loadLogs()">
            <mat-option [value]="25">25</mat-option>
            <mat-option [value]="50">50</mat-option>
            <mat-option [value]="100">100</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card>

      @if (loading) {
        <div class="loading"><mat-spinner></mat-spinner></div>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="logs" class="full-width">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef>Timestamp</th>
              <td mat-cell *matCellDef="let log">{{ log.created_at | date:'medium' }}</td>
            </ng-container>

            <ng-container matColumnDef="admin">
              <th mat-header-cell *matHeaderCellDef>Admin</th>
              <td mat-cell *matCellDef="let log">
                <div class="admin-info">
                  <span>{{ log.admin_name }}</span>
                  <small>{{ log.admin_email }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let log">
                <mat-chip [class]="getActionClass(log.action_type)">
                  {{ formatAction(log.action_type) }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="details">
              <th mat-header-cell *matHeaderCellDef>Details</th>
              <td mat-cell *matCellDef="let log">{{ log.details }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (logs.length === 0) {
            <p class="no-data">No logs found</p>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .admin-logs { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .filters { display: flex; gap: 16px; padding: 16px; margin-bottom: 20px; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .full-width { width: 100%; }
    .no-data { text-align: center; padding: 40px; color: #666; }
    
    .admin-info { display: flex; flex-direction: column; }
    .admin-info small { color: #666; }
    
    .action-create { background: #c8e6c9 !important; }
    .action-update { background: #fff3e0 !important; }
    .action-delete { background: #ffcdd2 !important; }
    .action-toggle { background: #e1f5fe !important; }
    .action-setting { background: #f3e5f5 !important; }
  `]
})
export class AdminLogsComponent implements OnInit {
  logs: AdminLog[] = [];
  loading = true;
  actionType = '';
  limit = 50;
  displayedColumns = ['timestamp', 'admin', 'action', 'details'];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading = true;
    this.adminService.getLogs(this.limit, this.actionType || undefined).subscribe({
      next: (logs) => {
        this.logs = logs;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  getActionClass(action: string): string {
    if (action.includes('CREATE')) return 'action-create';
    if (action.includes('UPDATE')) return 'action-update';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'action-delete';
    if (action.includes('ACTIVATE') || action.includes('ENABLE') || action.includes('DISABLE')) return 'action-toggle';
    if (action.includes('SETTING')) return 'action-setting';
    return '';
  }
}
