import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, DashboardStats } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule, 
    MatIconModule, MatProgressSpinnerModule, MatTabsModule, MatChipsModule
  ],
  template: `
    <div class="admin-dashboard">
      <div class="header">
        <h2>Admin Dashboard</h2>
        <div class="header-actions">
          <button mat-raised-button color="primary" routerLink="/admin/users">
            <mat-icon>people</mat-icon> Manage Users
          </button>
          <button mat-raised-button routerLink="/admin/settings">
            <mat-icon>settings</mat-icon> Settings
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner></mat-spinner></div>
      } @else if (stats) {
        <!-- Stats Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card users">
            <mat-card-content>
              <mat-icon>people</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats.users.total_users }}</span>
                <span class="stat-label">Total Users</span>
              </div>
              <div class="stat-breakdown">
                <span>{{ stats.users.customers }} Customers</span>
                <span>{{ stats.users.managers }} Managers</span>
                <span>{{ stats.users.admins }} Admins</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card tables">
            <mat-card-content>
              <mat-icon>table_restaurant</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats.tables.total_tables }}</span>
                <span class="stat-label">Total Tables</span>
              </div>
              <div class="stat-breakdown">
                <mat-chip class="available">{{ stats.tables.available }} Available</mat-chip>
                <mat-chip class="occupied">{{ stats.tables.occupied }} Occupied</mat-chip>
                <mat-chip class="reserved">{{ stats.tables.reserved }} Reserved</mat-chip>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card queue">
            <mat-card-content>
              <mat-icon>queue</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats.queue.current_waiting }}</span>
                <span class="stat-label">In Queue</span>
              </div>
              <div class="stat-breakdown">
                <span>{{ stats.queue.people_waiting || 0 }} people waiting</span>
                <span>{{ stats.queue.seated_today }} seated today</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card reservations">
            <mat-card-content>
              <mat-icon>event</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats.reservations.active_reservations }}</span>
                <span class="stat-label">Active Reservations</span>
              </div>
              <div class="stat-breakdown">
                <span>{{ stats.reservations.today_reservations }} for today</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Quick Actions -->
        <div class="section">
          <h3>Quick Actions</h3>
          <div class="quick-actions">
            <button mat-stroked-button routerLink="/admin/users">
              <mat-icon>person_add</mat-icon> Add User
            </button>
            <button mat-stroked-button routerLink="/admin/tables">
              <mat-icon>table_restaurant</mat-icon> View Tables
            </button>
            <button mat-stroked-button routerLink="/admin/queue">
              <mat-icon>format_list_numbered</mat-icon> Queue Monitor
            </button>
            <button mat-stroked-button routerLink="/admin/logs">
              <mat-icon>history</mat-icon> View Logs
            </button>
          </div>
        </div>

        <!-- Activity & Analytics -->
        <div class="analytics-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Peak Hours (Last 30 Days)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (peak of stats.peakHours; track peak.hour) {
                <div class="peak-item">
                  <span class="hour">{{ formatHour(peak.hour) }}</span>
                  <div class="bar" [style.width.%]="getBarWidth(peak.count)"></div>
                  <span class="count">{{ peak.count }}</span>
                </div>
              } @empty {
                <p>No data available</p>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Table Utilization</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (util of stats.tableUtilization; track util.type) {
                <div class="util-item">
                  <span class="type">{{ util.type }}</span>
                  <div class="util-bar">
                    <div class="fill" [style.width.%]="(util.in_use / util.total) * 100"></div>
                  </div>
                  <span class="ratio">{{ util.in_use }}/{{ util.total }}</span>
                </div>
              } @empty {
                <p>No tables configured</p>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>User Status</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="user-status">
                <div class="status-item active">
                  <mat-icon>check_circle</mat-icon>
                  <span>{{ stats.users.active_users }} Active</span>
                </div>
                <div class="status-item inactive">
                  <mat-icon>cancel</mat-icon>
                  <span>{{ stats.users.inactive_users }} Inactive</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-dashboard { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h2 { margin: 0; }
    .header-actions { display: flex; gap: 12px; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card mat-card-content { display: flex; flex-direction: column; align-items: center; padding: 20px; }
    .stat-card mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.7; }
    .stat-info { text-align: center; margin: 12px 0; }
    .stat-value { font-size: 36px; font-weight: bold; display: block; }
    .stat-label { color: #666; }
    .stat-breakdown { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; font-size: 12px; }
    .stat-breakdown span { background: #f5f5f5; padding: 4px 8px; border-radius: 4px; }
    
    .stat-card.users mat-icon { color: #1976d2; }
    .stat-card.tables mat-icon { color: #388e3c; }
    .stat-card.queue mat-icon { color: #f57c00; }
    .stat-card.reservations mat-icon { color: #7b1fa2; }
    
    mat-chip.available { background: #c8e6c9 !important; }
    mat-chip.occupied { background: #ffcdd2 !important; }
    mat-chip.reserved { background: #fff3e0 !important; }
    
    .section { margin-bottom: 30px; }
    .section h3 { margin-bottom: 16px; color: #333; }
    .quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .quick-actions button { display: flex; align-items: center; gap: 8px; }
    
    .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    
    .peak-item { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .peak-item .hour { width: 60px; font-size: 14px; }
    .peak-item .bar { height: 20px; background: linear-gradient(90deg, #1976d2, #42a5f5); border-radius: 4px; }
    .peak-item .count { font-weight: bold; }
    
    .util-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .util-item .type { width: 80px; }
    .util-bar { flex: 1; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .util-bar .fill { height: 100%; background: #4caf50; }
    .util-item .ratio { font-weight: bold; width: 50px; text-align: right; }
    
    .user-status { display: flex; gap: 24px; justify-content: center; padding: 20px; }
    .status-item { display: flex; align-items: center; gap: 8px; }
    .status-item.active mat-icon { color: #4caf50; }
    .status-item.inactive mat-icon { color: #f44336; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;
  maxPeakCount = 0;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.adminService.getDashboard().subscribe({
      next: (data) => {
        this.stats = data;
        this.maxPeakCount = Math.max(...(data.peakHours?.map(p => p.count) || [1]));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  formatHour(hour: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  }

  getBarWidth(count: number): number {
    return (count / this.maxPeakCount) * 100;
  }
}
