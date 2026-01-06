import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <!-- Mini Header -->
    <header class="login-header">
      <a routerLink="/" class="brand">
        <img src="assets/images/logo-chair.png" alt="SmartServe" class="brand-logo" width="40" height="40">
        <span class="brand-name">SmartServe</span>
      </a>
      <a routerLink="/" class="home-link">
        <mat-icon>home</mat-icon>
        Home
      </a>
    </header>

    <div class="login-container">
      <mat-card class="login-card">
        <div class="card-header">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="card-logo" width="80" height="80">
          <h1>Welcome Back</h1>
          <p class="tagline">Smart Seating. Seamless Service.</p>
        </div>
        
        <mat-card-content>
          @if (sessionMessage) {
            <div class="session-message">
              <mat-icon>info</mat-icon>
              {{ sessionMessage }}
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" placeholder="Enter your email">
              @if (form.get('email')?.hasError('required')) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email')) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput formControlName="password" type="password" placeholder="Enter your password">
              @if (form.get('password')?.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>
            
            <button mat-raised-button color="primary" type="submit" class="login-btn" [disabled]="form.invalid">
              <mat-icon>login</mat-icon>
              Login
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <p class="register-link">Don't have an account? <a routerLink="/register">Register</a></p>
          <a routerLink="/" class="back-home">
            <mat-icon>arrow_back</mat-icon>
            Back to Home
          </a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
    }

    /* Header */
    .login-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 32px;
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      background: linear-gradient(135deg, #1565c0, #00c853);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .home-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      color: #1565c0;
      text-decoration: none;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .home-link:hover {
      background: rgba(21, 101, 192, 0.1);
    }

    /* Login Container */
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 80px);
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
    }

    .card-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .card-logo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(0, 200, 83, 0.3);
      margin-bottom: 16px;
    }

    .card-header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 600;
      color: #212121;
    }

    .tagline {
      margin: 0;
      color: #757575;
      font-size: 14px;
    }

    /* Form */
    mat-form-field {
      margin-bottom: 8px;
    }

    mat-form-field mat-icon {
      color: #757575;
      margin-right: 8px;
    }

    .login-btn {
      width: 100%;
      padding: 12px !important;
      font-size: 16px !important;
      margin-top: 8px;
      border-radius: 8px !important;
    }

    .login-btn mat-icon {
      margin-right: 8px;
    }

    /* Session Message */
    .session-message {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff3cd;
      color: #856404;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border: 1px solid #ffc107;
    }

    .session-message mat-icon {
      color: #ffc107;
    }

    /* Actions */
    mat-card-actions {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #eee;
      margin-top: 16px;
    }

    .register-link {
      margin: 0 0 16px;
      color: #757575;
    }

    .register-link a {
      color: #1565c0;
      font-weight: 500;
      text-decoration: none;
    }

    .register-link a:hover {
      text-decoration: underline;
    }

    .back-home {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #00c853;
      text-decoration: none;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .back-home:hover {
      background: rgba(0, 200, 83, 0.1);
    }

    .back-home mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .login-header {
        padding: 12px 16px;
      }
      .brand-name {
        display: none;
      }
      .login-card {
        padding: 24px 20px;
      }
      .card-logo {
        width: 60px;
        height: 60px;
      }
      .card-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  sessionMessage: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Check for session expired message
    this.sessionMessage = sessionStorage.getItem('authMessage');
    if (this.sessionMessage) {
      sessionStorage.removeItem('authMessage');
    }
    
    // If already logged in with valid token, redirect appropriately
    if (this.authService.isLoggedIn() && this.authService.isTokenValid()) {
      const redirectUrl = sessionStorage.getItem('redirectUrl') || '/tables';
      sessionStorage.removeItem('redirectUrl');
      this.router.navigate([redirectUrl]);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const { email, password } = this.form.value;
      this.authService.login(email, password).subscribe({
        next: () => {
          this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
          
          // Redirect to stored URL or default to tables
          const redirectUrl = sessionStorage.getItem('redirectUrl') || '/tables';
          sessionStorage.removeItem('redirectUrl');
          this.router.navigate([redirectUrl]);
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Login failed', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
