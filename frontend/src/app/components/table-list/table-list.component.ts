import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { TableService, RestaurantTable } from '../../services/table.service';
import { TableVisualizationComponent } from '../table-visualization/table-visualization.component';

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, DatePipe, TableVisualizationComponent],
  template: `
    <h2>Available Tables</h2>
    @if (loading) {
      <div class="text-center"><mat-spinner></mat-spinner></div>
    } @else {
      <div class="card-grid">
        @for (table of tables; track table.id) {
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>Table #{{ table.table_number }}</mat-card-title>
              <mat-card-subtitle>{{ table.type }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <app-table-visualization 
                [capacity]="table.capacity" 
                size="small"
                [tableColor]="getTableColor(table.status)"
                [chairColor]="getTableColor(table.status)">
              </app-table-visualization>
              <p><mat-icon>people</mat-icon> Capacity: {{ table.capacity }}</p>
              <mat-chip [class]="'status-' + table.status.toLowerCase()">
                {{ table.status }}
              </mat-chip>
              @if (table.customer_name) {
                <p class="mt-20"><small>Customer: {{ table.customer_name }}</small></p>
              }
              @if (table.reservation_time) {
                <p><small>Reserved for: {{ table.reservation_time | date:'short' }}</small></p>
              }
            </mat-card-content>
          </mat-card>
        } @empty {
          <p>No tables available.</p>
        }
      </div>
    }
  `
})
export class TableListComponent implements OnInit {
  tables: RestaurantTable[] = [];
  loading = true;

  constructor(private tableService: TableService) {}

  ngOnInit() {
    this.loadTables();
  }

  loadTables() {
    this.tableService.getTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getTableColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'available': return '#4caf50';
      case 'occupied': return '#f44336';
      case 'reserved': return '#ff9800';
      default: return '#333';
    }
  }
}
