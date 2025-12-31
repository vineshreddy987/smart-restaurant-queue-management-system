import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="register-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Register</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email">
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password">
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                <mat-option value="Customer">Customer</mat-option>
                <mat-option value="Manager">Restaurant Manager</mat-option>
                <mat-option value="Admin">Admin</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Contact Info (optional)</mat-label>
              <input matInput formControlName="contact_info">
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="form.invalid">Register</button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <p>Already have an account? <a routerLink="/login">Login</a></p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container { display: flex; justify-content: center; margin-top: 50px; }
    mat-card { width: 400px; padding: 20px; }
    mat-form-field { margin-bottom: 16px; }
    mat-card-actions { text-align: center; }
  `]
})
export class RegisterComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Customer', Validators.required],
      contact_info: ['']
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.authService.register(this.form.value).subscribe({
        next: () => {
          this.snackBar.open('Registration successful! Please login.', 'Close', { duration: 3000 });
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Registration failed', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
