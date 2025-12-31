import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService, User } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDialogModule, MatSnackBarModule, MatChipsModule, MatProgressSpinnerModule,
    MatSlideToggleModule, MatTooltipModule
  ],
  template: `
    <div class="admin-users">
      <div class="header">
        <h2>User Management</h2>
        <button mat-raised-button color="primary" (click)="openUserDialog()">
          <mat-icon>person_add</mat-icon> Add User
        </button>
      </div>

      <!-- Filters -->
      <mat-card class="filters">
        <mat-form-field>
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="filters.search" (input)="loadUsers()" placeholder="Name or email">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Role</mat-label>
          <mat-select [(ngModel)]="filters.role" (selectionChange)="loadUsers()">
            <mat-option value="">All Roles</mat-option>
            <mat-option value="Customer">Customer</mat-option>
            <mat-option value="Manager">Manager</mat-option>
            <mat-option value="Admin">Admin</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filters.status" (selectionChange)="loadUsers()">
            <mat-option value="">All</mat-option>
            <mat-option value="active">Active</mat-option>
            <mat-option value="inactive">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card>

      @if (loading) {
        <div class="loading"><mat-spinner></mat-spinner></div>
      } @else {
        <mat-card>
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

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let user">
                <mat-slide-toggle 
                  [checked]="user.is_active" 
                  (change)="toggleStatus(user)"
                  [matTooltip]="user.is_active ? 'Deactivate' : 'Activate'">
                </mat-slide-toggle>
              </td>
            </ng-container>

            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let user">{{ user.created_at | date:'short' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let user">
                <button mat-icon-button (click)="openUserDialog(user)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteUser(user)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (users.length === 0) {
            <p class="no-data">No users found</p>
          }
        </mat-card>
      }

      <!-- User Dialog -->
      @if (showDialog) {
        <div class="dialog-overlay" (click)="closeDialog()">
          <mat-card class="dialog" (click)="$event.stopPropagation()">
            <mat-card-header>
              <mat-card-title>{{ editingUser ? 'Edit User' : 'Add New User' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="userForm">
                <mat-form-field class="full-width">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name">
                </mat-form-field>
                <mat-form-field class="full-width">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email">
                </mat-form-field>
                @if (!editingUser) {
                  <mat-form-field class="full-width">
                    <mat-label>Password</mat-label>
                    <input matInput type="password" formControlName="password">
                  </mat-form-field>
                }
                <mat-form-field class="full-width">
                  <mat-label>Role</mat-label>
                  <mat-select formControlName="role">
                    <mat-option value="Customer">Customer</mat-option>
                    <mat-option value="Manager">Manager</mat-option>
                    <mat-option value="Admin">Admin</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="full-width">
                  <mat-label>Contact Info</mat-label>
                  <input matInput formControlName="contact_info">
                </mat-form-field>
              </form>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button (click)="closeDialog()">Cancel</button>
              <button mat-raised-button color="primary" (click)="saveUser()" [disabled]="userForm.invalid">
                {{ editingUser ? 'Update' : 'Create' }}
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-users { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .filters { display: flex; gap: 16px; padding: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .filters mat-form-field { min-width: 200px; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .full-width { width: 100%; }
    table { width: 100%; }
    .no-data { text-align: center; padding: 40px; color: #666; }
    
    .role-customer { background: #e3f2fd !important; }
    .role-manager { background: #fff3e0 !important; }
    .role-admin { background: #fce4ec !important; }
    
    .dialog-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog { width: 100%; max-width: 500px; margin: 20px; }
    .dialog mat-card-content { padding-top: 20px; }
    .dialog mat-form-field { margin-bottom: 16px; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  showDialog = false;
  editingUser: User | null = null;
  userForm: FormGroup;
  displayedColumns = ['name', 'email', 'role', 'status', 'created', 'actions'];
  filters = { search: '', role: '', status: '' };

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.minLength(6)],
      role: ['Customer', Validators.required],
      contact_info: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminService.getUsers(this.filters).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openUserDialog(user?: User) {
    this.editingUser = user || null;
    if (user) {
      this.userForm.patchValue(user);
      this.userForm.get('password')?.clearValidators();
    } else {
      this.userForm.reset({ role: 'Customer' });
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.userForm.get('password')?.updateValueAndValidity();
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
    this.editingUser = null;
  }

  saveUser() {
    if (this.userForm.invalid) return;

    const data = this.userForm.value;
    
    if (this.editingUser) {
      delete data.password;
      this.adminService.updateUser(this.editingUser.id, data).subscribe({
        next: () => {
          this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
          this.closeDialog();
          this.loadUsers();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error updating user', 'Close', { duration: 3000 })
      });
    } else {
      this.adminService.createUser(data).subscribe({
        next: () => {
          this.snackBar.open('User created successfully', 'Close', { duration: 3000 });
          this.closeDialog();
          this.loadUsers();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error creating user', 'Close', { duration: 3000 })
      });
    }
  }

  toggleStatus(user: User) {
    this.adminService.toggleUserStatus(user.id, !user.is_active).subscribe({
      next: () => {
        user.is_active = !user.is_active;
        this.snackBar.open(`User ${user.is_active ? 'activated' : 'deactivated'}`, 'Close', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error updating status', 'Close', { duration: 3000 })
    });
  }

  deleteUser(user: User) {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackBar.open('User deleted', 'Close', { duration: 3000 });
          this.loadUsers();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error deleting user', 'Close', { duration: 3000 })
      });
    }
  }
}
