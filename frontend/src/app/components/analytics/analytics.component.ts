import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AnalyticsService, DashboardAnalytics, User } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTableModule, MatTabsModule, MatChipsModule, DatePipe, DecimalPipe],
  template: `
    <h2>Analytics Dashboard</h2>
    
    @if (loading) {
      <div class="text-center"><mat-spinner></mat-spinner></div>
    } @else if (analytics) {
      <!-- Summary Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon color="primary">table_restaurant</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.tables.total_tables }}</span>
              <span class="stat-label">Total Tables</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card available">
          <mat-card-content>
            <mat-icon>check_circle</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.tables.available_tables }}</span>
              <span class="stat-label">Available</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card occupied">
          <mat-card-content>
            <mat-icon>people</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.tables.occupied_tables }}</span>
              <span class="stat-label">Occupied</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card reserved">
          <mat-card-content>
            <mat-icon>event</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.tables.reserved_tables }}</span>
              <span class="stat-label">Reserved</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon color="accent">groups</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.queue.total_in_queue }}</span>
              <span class="stat-label">In Queue</span>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon color="primary">person</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ analytics.users.total_users }}</span>
              <span class="stat-label">Total Users</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-tab-group class="mt-20">
        <!-- Today's Activity -->
        <mat-tab label="Today's Activity">
          <div class="tab-content">
            <div class="stats-grid">
              <mat-card class="stat-card">
                <mat-card-content>
                  <mat-icon>login</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics.today.queue_joins_today }}</span>
                    <span class="stat-label">Queue Joins Today</span>
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card class="stat-card available">
                <mat-card-content>
                  <mat-icon>event_seat</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics.today.seated_today }}</span>
                    <span class="stat-label">Seated Today</span>
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card class="stat-card occupied">
                <mat-card-content>
                  <mat-icon>cancel</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics.today.cancelled_today }}</span>
                    <span class="stat-label">Cancelled Today</span>
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card class="stat-card reserved">
                <mat-card-content>
                  <mat-icon>bookmark</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics.reservations.active_reservations }}</span>
                    <span class="stat-label">Active Reservations</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Queue Activity (7 Days) -->
        <mat-tab label="Weekly Queue Report">
          <div class="tab-content">
            <table mat-table [dataSource]="analytics.queueActivity" class="full-width">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let row">{{ row.date | date:'mediumDate' }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total Joins</th>
                <td mat-cell *matCellDef="let row">{{ row.total }}</td>
              </ng-container>
              <ng-container matColumnDef="seated">
                <th mat-header-cell *matHeaderCellDef>Seated</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip class="status-available">{{ row.seated }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="cancelled">
                <th mat-header-cell *matHeaderCellDef>Cancelled</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip class="status-occupied">{{ row.cancelled }}</mat-chip>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="activityColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: activityColumns;"></tr>
            </table>
            @if (analytics.queueActivity.length === 0) {
              <p class="text-center mt-20">No queue activity in the last 7 days</p>
            }
          </div>
        </mat-tab>

        <!-- Table Distribution -->
        <mat-tab label="Table Distribution">
          <div class="tab-content">
            <div class="stats-grid">
              @for (type of analytics.tableTypes; track type.type) {
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon>{{ type.type === 'VIP' ? 'star' : 'table_restaurant' }}</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ type.count }}</span>
                      <span class="stat-label">{{ type.type }} Tables</span>
                      <span class="stat-sub">Capacity: {{ type.total_capacity }}</span>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
              <mat-card class="stat-card">
                <mat-card-content>
                  <mat-icon color="primary">people</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics.tables.total_capacity }}</span>
                    <span class="stat-label">Total Capacity</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- User Management (Admin Only) -->
        @if (authService.isAdmin()) {
          <mat-tab label="User Management">
            <div class="tab-content">
              <div class="stats-grid mb-20">
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon>person</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ analytics.users.customers }}</span>
                      <span class="stat-label">Customers</span>
                    </div>
                  </mat-card-content>
                </mat-card>
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon>manage_accounts</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ analytics.users.managers }}</span>
                      <span class="stat-label">Managers</span>
                    </div>
                  </mat-card-content>
                </mat-card>
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon>admin_panel_settings</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ analytics.users.admins }}</span>
                      <span class="stat-label">Admins</span>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
              
              <table mat-table [dataSource]="users" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let user">{{ user.name }}</td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let user">{{ user.email }}</td>
                </ng-container>
                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Role</th>
                  <td mat-cell *matCellDef="let user">
                    <mat-chip [class]="'role-' + user.role.toLowerCase()">{{ user.role }}</mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="created_at">
                  <th mat-header-cell *matHeaderCellDef>Joined</th>
                  <td mat-cell *matCellDef="let user">{{ user.created_at | date:'mediumDate' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: userColumns;"></tr>
              </table>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    }
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .stat-card mat-card-content { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .stat-card mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { color: #666; font-size: 14px; }
    .stat-sub { color: #999; font-size: 12px; }
    .stat-card.available mat-icon { color: #4caf50; }
    .stat-card.occupied mat-icon { color: #f44336; }
    .stat-card.reserved mat-icon { color: #ff9800; }
    .tab-content { padding: 20px; }
    .mb-20 { margin-bottom: 20px; }
    .role-customer { background-color: #e3f2fd !important; }
    .role-manager { background-color: #fff3e0 !important; }
    .role-admin { background-color: #fce4ec !important; }
  `]
})
export class AnalyticsComponent implements OnInit {
  analytics: DashboardAnalytics | null = null;
  users: User[] = [];
  loading = true;
  
  activityColumns = ['date', 'total', 'seated', 'cancelled'];
  userColumns = ['name', 'email', 'role', 'created_at'];

  constructor(private analyticsService: AnalyticsService, public authService: AuthService) {}

  ngOnInit() {
    this.loadAnalytics();
    if (this.authService.isAdmin()) {
      this.loadUsers();
    }
  }

  loadAnalytics() {
    this.analyticsService.getDashboard().subscribe({
      next: (data) => {
        this.analytics = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadUsers() {
    this.analyticsService.getUsers().subscribe({
      next: (users) => this.users = users
    });
  }
}
