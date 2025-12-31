import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AdminService, SystemSettings } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="admin-settings">
      <h2>System Settings</h2>

      @if (loading) {
        <div class="loading"><mat-spinner></mat-spinner></div>
      } @else {
        <div class="settings-grid">
          <!-- Feature Toggles -->
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>toggle_on</mat-icon>
              <mat-card-title>Feature Toggles</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Queue System</span>
                  <span class="setting-desc">Enable/disable the queue feature</span>
                </div>
                <mat-slide-toggle 
                  [checked]="settings.queue_enabled === 'true'"
                  (change)="updateSetting('queue_enabled', $event.checked ? 'true' : 'false')">
                </mat-slide-toggle>
              </div>
              <mat-divider></mat-divider>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Reservation System</span>
                  <span class="setting-desc">Enable/disable reservations</span>
                </div>
                <mat-slide-toggle 
                  [checked]="settings.reservation_enabled === 'true'"
                  (change)="updateSetting('reservation_enabled', $event.checked ? 'true' : 'false')">
                </mat-slide-toggle>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Queue Settings -->
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>queue</mat-icon>
              <mat-card-title>Queue Settings</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field class="full-width">
                <mat-label>Maximum Queue Size</mat-label>
                <input matInput type="number" [(ngModel)]="settings.max_queue_size" min="1">
                <mat-hint>Maximum number of parties in queue</mat-hint>
              </mat-form-field>
              <button mat-stroked-button (click)="updateSetting('max_queue_size', settings.max_queue_size)">
                <mat-icon>save</mat-icon> Save
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Reservation Settings -->
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>event</mat-icon>
              <mat-card-title>Reservation Settings</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field class="full-width">
                <mat-label>Max Days Ahead</mat-label>
                <input matInput type="number" [(ngModel)]="settings.max_reservation_days_ahead" min="1">
                <mat-hint>How far in advance can reservations be made</mat-hint>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>Default Duration (minutes)</mat-label>
                <input matInput type="number" [(ngModel)]="settings.default_reservation_duration" min="15" step="15">
                <mat-hint>Default reservation duration when customer doesn't specify</mat-hint>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>Minimum Duration (minutes)</mat-label>
                <input matInput type="number" [(ngModel)]="settings.min_reservation_duration" min="15" step="15">
                <mat-hint>Minimum allowed reservation duration</mat-hint>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>Maximum Duration (minutes)</mat-label>
                <input matInput type="number" [(ngModel)]="settings.max_reservation_duration" min="30" step="30">
                <mat-hint>Maximum allowed reservation duration</mat-hint>
              </mat-form-field>
              <mat-form-field class="full-width">
                <mat-label>Notification Before Vacate (minutes)</mat-label>
                <input matInput type="number" [(ngModel)]="settings.notification_minutes_before" min="1" max="30">
                <mat-hint>Minutes before expected vacate time to notify manager</mat-hint>
              </mat-form-field>
              <button mat-stroked-button (click)="saveReservationSettings()">
                <mat-icon>save</mat-icon> Save
              </button>
            </mat-card-content>
          </mat-card>

          <!-- System Status -->
          <mat-card>
            <mat-card-header>
              <mat-icon mat-card-avatar>monitor_heart</mat-icon>
              <mat-card-title>System Status</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (systemStatus) {
                <div class="status-grid">
                  <div class="status-item">
                    <mat-icon [class.healthy]="systemStatus.status === 'healthy'">
                      {{ systemStatus.status === 'healthy' ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span>{{ systemStatus.status | titlecase }}</span>
                  </div>
                  <div class="status-detail">
                    <span>Database:</span>
                    <span>{{ systemStatus.database?.connected ? 'Connected' : 'Disconnected' }}</span>
                  </div>
                  <div class="status-detail">
                    <span>Users:</span>
                    <span>{{ systemStatus.database?.users }}</span>
                  </div>
                  <div class="status-detail">
                    <span>Tables:</span>
                    <span>{{ systemStatus.database?.tables }}</span>
                  </div>
                  <div class="status-detail">
                    <span>Uptime:</span>
                    <span>{{ formatUptime(systemStatus.server?.uptime) }}</span>
                  </div>
                  <div class="status-detail">
                    <span>Node Version:</span>
                    <span>{{ systemStatus.server?.nodeVersion }}</span>
                  </div>
                </div>
              }
              <button mat-stroked-button (click)="loadSystemStatus()">
                <mat-icon>refresh</mat-icon> Refresh
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-settings { padding: 20px; }
    h2 { margin-bottom: 24px; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
    
    mat-card-header mat-icon { font-size: 24px; }
    mat-card-content { padding-top: 16px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    
    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
    .setting-info { display: flex; flex-direction: column; }
    .setting-label { font-weight: 500; }
    .setting-desc { font-size: 12px; color: #666; }
    
    .status-grid { margin-bottom: 16px; }
    .status-item { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 18px; }
    .status-item mat-icon.healthy { color: #4caf50; }
    .status-detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .status-detail span:first-child { color: #666; }
  `]
})
export class AdminSettingsComponent implements OnInit {
  settings: SystemSettings = {
    queue_enabled: 'true',
    reservation_enabled: 'true',
    max_queue_size: '50',
    max_reservation_days_ahead: '30',
    default_reservation_duration: '60',
    min_reservation_duration: '30',
    max_reservation_duration: '180',
    notification_minutes_before: '5'
  };
  systemStatus: any = null;
  loading = true;

  constructor(private adminService: AdminService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadSettings();
    this.loadSystemStatus();
  }

  loadSettings() {
    this.adminService.getSettings().subscribe({
      next: (settings) => {
        this.settings = { ...this.settings, ...settings };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadSystemStatus() {
    this.adminService.getSystemStatus().subscribe({
      next: (status) => this.systemStatus = status,
      error: () => this.systemStatus = { status: 'unhealthy' }
    });
  }

  updateSetting(key: string, value: string) {
    this.adminService.updateSetting(key, value).subscribe({
      next: () => {
        // Update local state to reflect the change
        (this.settings as any)[key] = value;
        this.snackBar.open('Setting updated', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error updating setting:', err);
        // Reload settings to get correct state
        this.loadSettings();
        this.snackBar.open('Error updating setting', 'Close', { duration: 3000 });
      }
    });
  }

  saveReservationSettings() {
    this.updateSetting('max_reservation_days_ahead', this.settings.max_reservation_days_ahead);
    this.updateSetting('default_reservation_duration', this.settings.default_reservation_duration);
    this.updateSetting('min_reservation_duration', this.settings.min_reservation_duration);
    this.updateSetting('max_reservation_duration', this.settings.max_reservation_duration);
    this.updateSetting('notification_minutes_before', this.settings.notification_minutes_before);
  }

  formatUptime(seconds: number): string {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
