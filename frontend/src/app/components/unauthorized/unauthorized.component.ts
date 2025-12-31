import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="unauthorized-container">
      <mat-card>
        <mat-card-content class="text-center">
          <mat-icon style="font-size: 64px; height: 64px; width: 64px; color: #f44336;">block</mat-icon>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <a mat-raised-button color="primary" routerLink="/tables">Go to Tables</a>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container { display: flex; justify-content: center; margin-top: 100px; }
    mat-card { padding: 40px; }
  `]
})
export class UnauthorizedComponent {}
