import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TableService, RestaurantTable } from '../../services/table.service';
import { ReservationService } from '../../services/reservation.service';
import { DatePipe, CommonModule } from '@angular/common';
import { TableVisualizationComponent } from '../table-visualization/table-visualization.component';

@Component({
  selector: 'app-reservation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    RouterLink,
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule, 
    MatSnackBarModule, 
    MatDatepickerModule, 
    MatNativeDateModule, 
    DatePipe, 
    TableVisualizationComponent
  ],
  template: `
    <h2>Make a Reservation</h2>
    
    @if (!reservationEnabled) {
      <mat-card class="disabled-notice">
        <mat-card-content>
          <mat-icon>block</mat-icon>
          <p>Reservation system is currently disabled. Please try again later or contact the restaurant.</p>
        </mat-card-content>
      </mat-card>
    }
    
    <div class="reservation-layout" [class.disabled]="!reservationEnabled">
      <mat-card class="reservation-form">
        <mat-card-header>
          <mat-card-title>Book a Table</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="makeReservation()">
            <mat-form-field class="full-width">
              <mat-label>Party Size</mat-label>
              <input matInput type="number" formControlName="party_size" min="1" max="20" (input)="onPartySizeChange()">
            </mat-form-field>
            
            <!-- Dynamic Table Visualization -->
            @if (form.get('party_size')?.value >= 1) {
              <div class="table-preview">
                <p class="preview-label">Table Preview ({{ form.get('party_size')?.value }} seats)</p>
                <app-table-visualization 
                  [capacity]="form.get('party_size')?.value" 
                  [size]="getTableSize(form.get('party_size')?.value)"
                  tableColor="#1976d2"
                  chairColor="#333">
                </app-table-visualization>
              </div>
            }
            
            <mat-form-field class="full-width">
              <mat-label>Table Type</mat-label>
              <mat-select formControlName="table_type" (selectionChange)="loadAvailableTables()">
                <mat-option value="">Any</mat-option>
                <mat-option value="Regular">Regular</mat-option>
                <mat-option value="VIP">VIP</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>Select Table</mat-label>
              <mat-select formControlName="table_id">
                @if (availableTables.length === 0) {
                  <mat-option disabled>No tables available for this party size</mat-option>
                }
                @for (table of availableTables; track table.id) {
                  <mat-option [value]="table.id">
                    Table #{{ table.table_number }} ({{ table.type }}, {{ table.capacity }} seats)
                  </mat-option>
                }
              </mat-select>
              @if (availableTables.length === 0) {
                <mat-hint class="error-hint">No available tables. Try a smaller party size.</mat-hint>
              }
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>Reservation Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date" [min]="minDate">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <div class="time-picker">
              <mat-form-field class="time-hour">
                <mat-label>Hour</mat-label>
                <mat-select formControlName="hour">
                  @for (h of hours; track h) {
                    <mat-option [value]="h">{{ h }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="time-minute">
                <mat-label>Minute</mat-label>
                <mat-select formControlName="minute">
                  @for (m of minutes; track m) {
                    <mat-option [value]="m">{{ m }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="time-period">
                <mat-label>AM/PM</mat-label>
                <mat-select formControlName="period">
                  <mat-option value="AM">AM</mat-option>
                  <mat-option value="PM">PM</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field class="full-width">
              <mat-label>Duration (minutes) - Optional</mat-label>
              <input matInput type="number" formControlName="duration" 
                     [min]="minDuration" [max]="maxDuration" [placeholder]="'Default: ' + defaultDuration + ' min'">
              <mat-hint>Leave empty for default ({{ defaultDuration }} min). Range: {{ minDuration }}-{{ maxDuration }} min</mat-hint>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" 
                    [disabled]="form.invalid || isSubmitting || availableTables.length === 0">
              @if (isSubmitting) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>event</mat-icon> Make Reservation
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="my-reservations">
        <mat-card-header>
          <mat-card-title>My Reservations</mat-card-title>
          <a mat-button routerLink="/reservations/history" class="history-link">
            <mat-icon>history</mat-icon> View History
          </a>
        </mat-card-header>
        <mat-card-content>
          @if (loadingReservations) {
            <mat-spinner diameter="30"></mat-spinner>
          } @else {
            @for (res of myReservations; track res.id) {
              <div class="reservation-item">
                <div>
                  <strong>Table #{{ res.table_number }}</strong> ({{ res.type }})
                  <p>{{ res.reservation_time | date:'medium' }}</p>
                </div>
                <button mat-icon-button color="warn" (click)="cancelReservation(res.id)">
                  <mat-icon>cancel</mat-icon>
                </button>
              </div>
            } @empty {
              <p>No reservations yet.</p>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reservation-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .reservation-layout.disabled { opacity: 0.5; pointer-events: none; }
    mat-form-field { margin-bottom: 16px; }
    .reservation-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; gap: 12px; flex-wrap: wrap; }
    mat-card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .history-link { margin-left: auto; }
    .table-preview { 
      background: #f5f5f5; 
      border-radius: 8px; 
      padding: 16px; 
      margin-bottom: 20px;
      text-align: center;
    }
    .preview-label {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
    .time-picker {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .time-hour, .time-minute { flex: 1; }
    .time-period { flex: 0.8; }
    .error-hint { color: #f44336; }
    button mat-spinner { display: inline-block; margin-right: 8px; }
    .disabled-notice {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      margin-bottom: 20px;
    }
    .disabled-notice mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .disabled-notice mat-icon { color: #ff9800; font-size: 32px; width: 32px; height: 32px; flex-shrink: 0; }
    .disabled-notice p { margin: 0; }
    
    /* Mobile Responsive */
    @media (max-width: 768px) { 
      .reservation-layout { grid-template-columns: 1fr; }
      .time-picker { flex-wrap: wrap; }
      .time-hour, .time-minute, .time-period { flex: 1 1 30%; min-width: 80px; }
    }
    
    @media (max-width: 480px) {
      .reservation-item { flex-direction: column; align-items: flex-start; }
      .reservation-item button { align-self: flex-end; }
      mat-card-header { flex-direction: column; align-items: flex-start; }
      .history-link { margin-left: 0; margin-top: 8px; }
    }
  `]
})
export class ReservationComponent implements OnInit {
  form: FormGroup;
  availableTables: RestaurantTable[] = [];
  myReservations: any[] = [];
  loadingReservations = true;
  isSubmitting = false;
  minDate = new Date();
  
  // Time picker options
  hours = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  minutes = ['00', '15', '30', '45'];
  
  // Duration settings from admin
  defaultDuration = 60;
  minDuration = 30;
  maxDuration = 180;
  reservationEnabled = true;

  constructor(
    private fb: FormBuilder,
    private tableService: TableService,
    private reservationService: ReservationService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      party_size: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      table_type: [''],
      table_id: [null, Validators.required],
      date: [null, Validators.required],
      hour: ['7', Validators.required],
      minute: ['00', Validators.required],
      period: ['PM', Validators.required],
      duration: [null] // Optional - uses default if not set
    });
  }

  ngOnInit() {
    this.loadAvailableTables();
    this.loadMyReservations();
    this.loadDurationSettings();
  }

  loadDurationSettings() {
    this.reservationService.getSettings().subscribe({
      next: (settings) => {
        this.defaultDuration = settings.default_duration;
        this.minDuration = settings.min_duration;
        this.maxDuration = settings.max_duration;
        this.reservationEnabled = settings.reservation_enabled;
      },
      error: () => {
        // Use defaults if settings fail to load
      }
    });
  }

  onPartySizeChange() {
    // Reset table selection when party size changes
    this.form.patchValue({ table_id: null });
    this.loadAvailableTables();
  }

  getTableSize(partySize: number): 'small' | 'medium' | 'large' {
    if (partySize <= 4) return 'small';
    if (partySize <= 8) return 'medium';
    return 'large';
  }

  loadAvailableTables() {
    const partySize = this.form.get('party_size')?.value;
    const tableType = this.form.get('table_type')?.value;
    
    this.tableService.getAvailableTables(partySize, tableType).subscribe({
      next: (tables) => {
        this.availableTables = tables;
        // If currently selected table is no longer available, reset selection
        const currentTableId = this.form.get('table_id')?.value;
        if (currentTableId && !tables.find(t => t.id === currentTableId)) {
          this.form.patchValue({ table_id: null });
        }
      },
      error: (err) => {
        console.error('Error loading tables:', err);
        this.snackBar.open('Failed to load available tables', 'Close', { duration: 3000 });
      }
    });
  }

  loadMyReservations() {
    this.reservationService.getMyReservations().subscribe({
      next: (res) => {
        this.myReservations = res;
        this.loadingReservations = false;
      },
      error: (err) => {
        console.error('Error loading reservations:', err);
        this.loadingReservations = false;
      }
    });
  }

  makeReservation() {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    const { table_id, date, hour, minute, period, party_size, duration } = this.form.value;

    // Validate table_id
    if (!table_id) {
      this.snackBar.open('Please select a table', 'Close', { duration: 3000 });
      return;
    }

    // Validate date
    if (!date) {
      this.snackBar.open('Please select a date', 'Close', { duration: 3000 });
      return;
    }

    // Validate duration if provided
    if (duration !== null && duration !== '') {
      const durationNum = Number(duration);
      if (durationNum < this.minDuration || durationNum > this.maxDuration) {
        this.snackBar.open(`Duration must be between ${this.minDuration} and ${this.maxDuration} minutes`, 'Close', { duration: 3000 });
        return;
      }
    }

    // Convert 12-hour to 24-hour format
    let hours24 = parseInt(hour);
    if (period === 'PM' && hours24 !== 12) {
      hours24 += 12;
    } else if (period === 'AM' && hours24 === 12) {
      hours24 = 0;
    }
    const mins = parseInt(minute);

    // Build reservation datetime properly using local time
    const selectedDate = new Date(date);
    const reservationDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours24,
      mins,
      0,
      0
    );

    // Check if reservation time is in the future
    const now = new Date();
    if (reservationDateTime <= now) {
      this.snackBar.open('Reservation time must be in the future', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;

    // Ensure table_id is a number
    const tableIdNum = Number(table_id);
    const partySizeNum = Number(party_size);
    const durationNum = duration ? Number(duration) : undefined;

    // Format datetime as local time string (YYYY-MM-DD HH:MM:SS) to avoid timezone issues
    const year = reservationDateTime.getFullYear();
    const month = String(reservationDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(reservationDateTime.getDate()).padStart(2, '0');
    const hrs = String(reservationDateTime.getHours()).padStart(2, '0');
    const min = String(reservationDateTime.getMinutes()).padStart(2, '0');
    const localDateTimeStr = `${year}-${month}-${day}T${hrs}:${min}:00`;

    console.log('Making reservation:', { 
      table_id: tableIdNum, 
      reservation_time: localDateTimeStr,
      display_time: `${hour}:${minute} ${period}`,
      party_size: partySizeNum,
      duration: durationNum || this.defaultDuration
    });

    this.reservationService.makeReservation(tableIdNum, localDateTimeStr, partySizeNum, durationNum).subscribe({
      next: (response) => {
        console.log('Reservation success:', response);
        const durationMsg = response.duration ? ` (${response.duration} min)` : '';
        this.snackBar.open(`Reservation made successfully!${durationMsg}`, 'Close', { duration: 3000 });
        this.loadMyReservations();
        this.loadAvailableTables();
        this.form.patchValue({ table_id: null, date: null, duration: null });
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Reservation error:', err);
        this.isSubmitting = false;
        
        let message = 'Failed to make reservation';
        if (err.status === 0) {
          message = 'Cannot connect to server. Is the backend running?';
        } else if (err.status === 401) {
          message = 'Session expired. Please login again.';
        } else if (err.status === 400) {
          message = err.error?.message || 'Invalid reservation data';
        } else if (err.status === 500) {
          message = err.error?.message || err.error?.error || 'Server error. Please try again.';
        } else if (err.error?.message) {
          message = err.error.message;
        }
        
        this.snackBar.open(message, 'Close', { duration: 5000 });
      }
    });
  }

  cancelReservation(tableId: number) {
    this.reservationService.cancelReservation(tableId).subscribe({
      next: () => {
        this.snackBar.open('Reservation cancelled', 'Close', { duration: 3000 });
        this.loadMyReservations();
        this.loadAvailableTables();
      },
      error: (err) => {
        console.error('Cancel error:', err);
        this.snackBar.open(err.error?.message || 'Failed to cancel', 'Close', { duration: 3000 });
      }
    });
  }
}
