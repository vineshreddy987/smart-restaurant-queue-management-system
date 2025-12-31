import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Customer' | 'Manager' | 'Admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// JWT payload structure
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  exp: number;  // Expiration timestamp
  iat: number;  // Issued at timestamp
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3001/api/auth';
  private currentUser = signal<User | null>(null);
  
  user = this.currentUser.asReadonly();
  isLoggedIn = computed(() => !!this.currentUser());
  isManager = computed(() => this.currentUser()?.role === 'Manager' || this.currentUser()?.role === 'Admin');
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  private loadUser() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    // Check if token exists and is valid
    if (token && userData) {
      if (this.isTokenValid(token)) {
        this.currentUser.set(JSON.parse(userData));
      } else {
        // Token expired - clear storage and don't auto-login
        console.log('Token expired, clearing session');
        this.clearStorage();
      }
    }
  }

  // Decode JWT token without external library
  private decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode base64 payload (second part)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Check if token is valid and not expired
  isTokenValid(token?: string | null): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return false;
    
    const payload = this.decodeToken(tokenToCheck);
    if (!payload || !payload.exp) return false;
    
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    
    // Token is valid if expiration time is in the future
    return expirationTime > now;
  }

  // Get time until token expires (in milliseconds)
  getTokenExpirationTime(): number | null {
    const token = this.getToken();
    if (!token) return null;
    
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return null;
    
    return (payload.exp * 1000) - Date.now();
  }

  private clearStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  register(data: { name: string; email: string; password: string; role: string; contact_info?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUser.set(response.user);
      })
    );
  }

  logout(showMessage: boolean = false) {
    this.clearStorage();
    if (showMessage) {
      // Store message to show on login page
      sessionStorage.setItem('authMessage', 'Your session has expired. Please log in again.');
    }
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Check authentication status (validates token)
  checkAuth(): boolean {
    const token = this.getToken();
    if (!token || !this.isTokenValid(token)) {
      if (token) {
        // Token exists but expired
        this.logout(true);
      }
      return false;
    }
    return true;
  }
}
