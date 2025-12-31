import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { QueueService, QueuePosition } from '../../services/queue.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-queue-management',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <h2>Queue Management</h2>
    
    @if (!queueEnabled) {
      <mat-card class="disabled-notice">
        <mat-card-content>
          <mat-icon>block</mat-icon>
          <p>Queue system is currently disabled. Please try again later or contact the restaurant.</p>
        </mat-card-content>
      </mat-card>
    }
    
    @if (loading) {
      <div class="text-center"><mat-spinner></mat-spinner></div>
    } @else if (queuePosition?.inQueue) {
      <mat-card class="queue-status-card">
        <mat-card-header>
          <mat-card-title>You're in the Queue!</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="queue-info">
            <div class="position-display">
              <span class="position-number">{{ queuePosition!.position }}</span>
              <span class="position-label">Your Position</span>
            </div>
            <div class="queue-details">
              <p><mat-icon>schedule</mat-icon> Estimated wait: ~{{ queuePosition!.estimatedWaitMinutes }} minutes</p>
              <p><mat-icon>people</mat-icon> Party size: {{ queuePosition!.partySize }}</p>
              <p><mat-icon>table_restaurant</mat-icon> Table type: {{ queuePosition!.tableType }}</p>
              <p><mat-icon>group</mat-icon> Total waiting: {{ queuePosition!.totalWaiting }}</p>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="warn" (click)="leaveQueue()">
            <mat-icon>exit_to_app</mat-icon> Leave Queue
          </button>
        </mat-card-actions>
      </mat-card>
    } @else {
      <mat-card [class.disabled]="!queueEnabled">
        <mat-card-header>
          <mat-card-title>Join the Waiting Queue</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="joinQueue()">
            <mat-form-field class="full-width">
              <mat-label>Party Size</mat-label>
              <input matInput type="number" formControlName="party_size" min="1">
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Table Type</mat-label>
              <mat-select formControlName="table_type">
                <mat-option value="Regular">Regular</mat-option>
                <mat-option value="VIP">VIP</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || !queueEnabled">
              <mat-icon>add</mat-icon> Join Queue
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .queue-status-card { max-width: 500px; margin: 0 auto; }
    .queue-info { display: flex; gap: 40px; align-items: center; padding: 20px 0; }
    .position-display { text-align: center; }
    .position-number { font-size: 72px; font-weight: bold; color: #3f51b5; display: block; }
    .position-label { color: #666; }
    .queue-details p { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    mat-card-actions { padding: 16px; }
    .disabled-notice {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      margin-bottom: 20px;
      max-width: 500px;
    }
    .disabled-notice mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .disabled-notice mat-icon { color: #ff9800; font-size: 32px; width: 32px; height: 32px; }
    .disabled-notice p { margin: 0; }
    mat-card.disabled { opacity: 0.5; pointer-events: none; }
  `]
})
export class QueueManagementComponent implements OnInit, OnDestroy {
  form: FormGroup;
  queuePosition: QueuePosition | null = null;
  loading = true;
  queueEnabled = true;
  private pollSubscription?: Subscription;

  constructor(private fb: FormBuilder, private queueService: QueueService, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      party_size: [2, [Validators.required, Validators.min(1)]],
      table_type: ['Regular', Validators.required]
    });
  }

  ngOnInit() {
    this.loadSettings();
    this.checkPosition();
    // Poll every 30 seconds for updates
    this.pollSubscription = interval(30000).subscribe(() => this.checkPosition());
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
  }

  loadSettings() {
    this.queueService.getSettings().subscribe({
      next: (settings) => {
        this.queueEnabled = settings.queue_enabled;
      },
      error: () => {
        // Default to enabled if error
      }
    });
  }

  checkPosition() {
    this.queueService.getMyPosition().subscribe({
      next: (pos) => {
        this.queuePosition = pos;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  joinQueue() {
    if (this.form.valid) {
      const { party_size, table_type } = this.form.value;
      this.queueService.joinQueue(party_size, table_type).subscribe({
        next: (res) => {
          this.snackBar.open(`Joined queue at position ${res.position}!`, 'Close', { duration: 3000 });
          this.checkPosition();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to join queue', 'Close', { duration: 3000 });
        }
      });
    }
  }

  leaveQueue() {
    this.queueService.leaveQueue().subscribe({
      next: () => {
        this.snackBar.open('Left the queue', 'Close', { duration: 3000 });
        this.queuePosition = { inQueue: false };
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to leave queue', 'Close', { duration: 3000 });
      }
    });
  }
}
