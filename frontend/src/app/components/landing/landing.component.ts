import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="logo-icon" width="44" height="44">
          <span class="logo-text">SmartServe</span>
        </div>
        <nav class="nav-links">
          <a routerLink="/" class="nav-link active">Home</a>
          <a (click)="navigateTo('/tables')" class="nav-link clickable">Tables</a>
          <a (click)="navigateTo('/queue')" class="nav-link clickable">Queue</a>
          <a (click)="navigateTo('/reservation')" class="nav-link clickable">Reservation</a>
          @if (authService.isLoggedIn()) {
            <button mat-raised-button color="accent" (click)="authService.logout()">Logout</button>
          } @else {
            <a mat-raised-button color="accent" routerLink="/login">Login</a>
          }
        </nav>
        <button class="mobile-menu-btn" (click)="toggleMobileMenu()">
          <mat-icon>{{ mobileMenuOpen ? 'close' : 'menu' }}</mat-icon>
        </button>
      </div>
      
      <!-- Mobile Menu -->
      @if (mobileMenuOpen) {
        <div class="mobile-menu">
          <a routerLink="/" class="mobile-link" (click)="mobileMenuOpen = false">Home</a>
          <a class="mobile-link" (click)="navigateTo('/tables'); mobileMenuOpen = false">Tables</a>
          <a class="mobile-link" (click)="navigateTo('/queue'); mobileMenuOpen = false">Queue</a>
          <a class="mobile-link" (click)="navigateTo('/reservation'); mobileMenuOpen = false">Reservation</a>
          @if (authService.isLoggedIn()) {
            <a class="mobile-link" (click)="authService.logout(); mobileMenuOpen = false">Logout</a>
          } @else {
            <a routerLink="/login" class="mobile-link" (click)="mobileMenuOpen = false">Login</a>
          }
        </div>
      }
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <img src="assets/images/logo-chair.png" alt="SmartServe" class="hero-logo" width="150" height="150">
        <h1 class="hero-title">SmartServe</h1>
        <p class="hero-tagline">Smart Seating. Seamless Service.</p>
        <p class="hero-description">
          Manage restaurant seating, queues, and reservations effortlessly.
        </p>
        <button mat-raised-button class="cta-button" (click)="onBookTable()">
          <mat-icon>event_seat</mat-icon>
          Book a Table
        </button>
      </div>
      <div class="hero-scroll">
        <mat-icon>keyboard_arrow_down</mat-icon>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="section-header">
        <h2>Why Choose SmartServe?</h2>
        <p>Experience the future of restaurant management</p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <mat-icon>groups</mat-icon>
          </div>
          <h3>Smart Queue Management</h3>
          <p>Join virtual queues, track your position in real-time, and get notified when your table is ready.</p>
        </div>
        
        <div class="feature-card highlight">
          <div class="feature-icon">
            <img src="assets/images/logo-chair.png" alt="Smart Seating" class="feature-img" width="60" height="60">
          </div>
          <h3>Efficient Table Turnover</h3>
          <p>Optimize seating with smart duration tracking and automated notifications for seamless service.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <mat-icon>schedule</mat-icon>
          </div>
          <h3>Time-Based Reservations</h3>
          <p>Book tables in advance with flexible duration options. Never miss your dining experience.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <mat-icon>visibility</mat-icon>
          </div>
          <h3>Real-Time Availability</h3>
          <p>See live table status, capacity, and availability at a glance with our visual dashboard.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <mat-icon>notifications_active</mat-icon>
          </div>
          <h3>Instant Notifications</h3>
          <p>Receive timely alerts for queue updates, reservation confirmations, and table readiness.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <mat-icon>smart_toy</mat-icon>
          </div>
          <h3>Chat Assistant</h3>
          <p>Get help with bookings, check availability, and manage reservations through our smart chatbot.</p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works">
      <div class="section-header">
        <h2>How It Works</h2>
        <p>Three simple steps to your perfect dining experience</p>
      </div>
      
      <div class="steps-container">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-icon">
            <mat-icon>search</mat-icon>
          </div>
          <h3>Check Availability</h3>
          <p>Browse available tables, view capacity, and find the perfect spot for your party.</p>
        </div>
        
        <div class="step-connector"></div>
        
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-icon">
            <mat-icon>event</mat-icon>
          </div>
          <h3>Reserve or Join Queue</h3>
          <p>Book a table for later or join the virtual queue for immediate seating.</p>
        </div>
        
        <div class="step-connector"></div>
        
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-icon">
            <mat-icon>restaurant</mat-icon>
          </div>
          <h3>Dine & Enjoy</h3>
          <p>Get notified when ready, arrive at your table, and enjoy seamless service.</p>
        </div>
      </div>
    </section>

    <!-- Gallery Section -->
    <section class="gallery">
      <div class="section-header light">
        <h2>Experience Fine Dining</h2>
        <p>Where ambiance meets exceptional service</p>
      </div>
      
      <div class="gallery-grid">
        <div class="gallery-item large">
          <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800" alt="Restaurant Interior">
          <div class="gallery-overlay">
            <span>Elegant Interiors</span>
          </div>
        </div>
        <div class="gallery-item">
          <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600" alt="Fine Dining">
          <div class="gallery-overlay">
            <span>Exquisite Cuisine</span>
          </div>
        </div>
        <div class="gallery-item">
          <img src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600" alt="Table Setting">
          <div class="gallery-overlay">
            <span>Perfect Settings</span>
          </div>
        </div>
        <div class="gallery-item">
          <img src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600" alt="Bar Area">
          <div class="gallery-overlay">
            <span>Stylish Bar</span>
          </div>
        </div>
        <div class="gallery-item">
          <img src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600" alt="Outdoor Dining">
          <div class="gallery-overlay">
            <span>Al Fresco Dining</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>Ready to Experience SmartServe?</h2>
        <p>Join thousands of satisfied diners who enjoy seamless restaurant experiences.</p>
        <div class="cta-buttons">
          <button mat-raised-button class="cta-primary" (click)="onBookTable()">
            <mat-icon>event_seat</mat-icon>
            Book a Table Now
          </button>
          <a mat-stroked-button class="cta-secondary" routerLink="/register">
            <mat-icon>person_add</mat-icon>
            Create Account
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="footer-logo" width="70" height="70">
          <span class="footer-title">SmartServe</span>
          <p class="footer-tagline">Smart Seating. Seamless Service.</p>
        </div>
        
        <div class="footer-links">
          <h4>Quick Links</h4>
          <a routerLink="/tables">Tables</a>
          <a routerLink="/queue">Queue</a>
          <a routerLink="/reservation">Reservations</a>
        </div>
        
        <div class="footer-contact">
          <h4>Contact Us</h4>
          <p><mat-icon>email</mat-icon> info&#64;smartserve.com</p>
          <p><mat-icon>phone</mat-icon> +91 8247339967</p>
          <p><mat-icon>location_on</mat-icon> 123 Matrimony Complex, Food City</p>
        </div>
        
        <div class="footer-social">
          <h4>Follow Us</h4>
          <div class="social-icons">
            <a href="https://www.facebook.com/" class="social-icon" target="_blank" rel="noopener noreferrer"><mat-icon>facebook</mat-icon></a>
            <a href="https://www.instagram.com/" class="social-icon" target="_blank" rel="noopener noreferrer"><mat-icon>camera_alt</mat-icon></a>
            <a href="https://www.threads.com/" class="social-icon" target="_blank" rel="noopener noreferrer"><mat-icon>alternate_email</mat-icon></a>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2025 SmartServe. All rights reserved.</p>
      </div>
    </footer>
  `,
  styles: [`
    /* ==================== VARIABLES ==================== */
    :host {
      --primary-color: #1565c0;
      --primary-dark: #0d47a1;
      --accent-color: #00c853;
      --accent-dark: #00a844;
      --text-dark: #212121;
      --text-light: #ffffff;
      --text-muted: #757575;
      --bg-light: #f5f5f5;
      --bg-dark: #1a1a2e;
      display: block;
    }

    /* ==================== HEADER ==================== */
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      width: 44px;
      height: 44px;
      object-fit: contain;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .logo-text {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-link {
      padding: 8px 16px;
      color: var(--text-dark);
      text-decoration: none;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .nav-link:hover, .nav-link.active {
      background: rgba(21, 101, 192, 0.1);
      color: var(--primary-color);
    }

    .nav-link.clickable {
      cursor: pointer;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }

    .mobile-menu {
      display: none;
      flex-direction: column;
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #eee;
    }

    .mobile-link {
      padding: 12px 0;
      color: var(--text-dark);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid #eee;
    }

    /* ==================== HERO SECTION ==================== */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920') center/cover;
      opacity: 0.2;
    }

    .hero-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%);
    }

    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: 24px;
      animation: fadeInUp 1s ease;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hero-logo {
      width: 150px;
      height: 150px;
      margin-bottom: 24px;
      border-radius: 50%;
      box-shadow: 0 8px 40px rgba(0, 200, 83, 0.4);
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .hero-title {
      font-size: 72px;
      font-weight: 700;
      color: white;
      margin: 0 0 16px;
      text-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
    }

    .hero-tagline {
      font-size: 28px;
      color: var(--accent-color);
      margin: 0 0 16px;
      font-weight: 500;
    }

    .hero-description {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 32px;
      max-width: 500px;
    }

    .cta-button {
      padding: 16px 48px !important;
      font-size: 18px !important;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark)) !important;
      color: white !important;
      border-radius: 50px !important;
      box-shadow: 0 8px 30px rgba(0, 200, 83, 0.4) !important;
      transition: all 0.3s ease !important;
    }

    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0, 200, 83, 0.5) !important;
    }

    .hero-scroll {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
      40% { transform: translateX(-50%) translateY(-10px); }
      60% { transform: translateX(-50%) translateY(-5px); }
    }

    /* ==================== SECTIONS COMMON ==================== */
    .section-header {
      text-align: center;
      margin-bottom: 60px;
    }

    .section-header h2 {
      font-size: 42px;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0 0 12px;
    }

    .section-header p {
      font-size: 18px;
      color: var(--text-muted);
      margin: 0;
    }

    .section-header.light h2 { color: white; }
    .section-header.light p { color: rgba(255,255,255,0.7); }

    /* ==================== FEATURES SECTION ==================== */
    .features {
      padding: 100px 24px;
      background: var(--bg-light);
    }

    .features-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
    }

    .feature-card {
      background: white;
      padding: 40px 30px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
    }

    .feature-card.highlight {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: white;
    }

    .feature-card.highlight h3, .feature-card.highlight p {
      color: white;
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      border-radius: 20px;
    }

    .feature-card.highlight .feature-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .feature-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: white;
    }

    .feature-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 50%;
    }

    .feature-card h3 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text-dark);
    }

    .feature-card p {
      font-size: 15px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.6;
    }

    /* ==================== HOW IT WORKS ==================== */
    .how-it-works {
      padding: 100px 24px;
      background: white;
    }

    .steps-container {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 20px;
    }

    .step {
      flex: 1;
      text-align: center;
      position: relative;
    }

    .step-number {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 30px;
      background: var(--accent-color);
      color: white;
      border-radius: 50%;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .step-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .step:hover .step-icon {
      transform: scale(1.1);
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    }

    .step:hover .step-icon mat-icon {
      color: white;
    }

    .step-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--primary-color);
      transition: all 0.3s ease;
    }

    .step h3 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text-dark);
    }

    .step p {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.6;
    }

    .step-connector {
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
      margin-top: 50px;
      flex-shrink: 0;
    }

    /* ==================== GALLERY ==================== */
    .gallery {
      padding: 100px 24px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .gallery-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 200px);
      gap: 20px;
    }

    .gallery-item {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
    }

    .gallery-item.large {
      grid-column: span 2;
      grid-row: span 2;
    }

    .gallery-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    .gallery-item:hover img {
      transform: scale(1.1);
    }

    .gallery-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .gallery-item:hover .gallery-overlay {
      opacity: 1;
    }

    .gallery-overlay span {
      color: white;
      font-size: 16px;
      font-weight: 500;
    }

    /* ==================== CTA SECTION ==================== */
    .cta-section {
      padding: 100px 24px;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      text-align: center;
    }

    .cta-content h2 {
      font-size: 42px;
      font-weight: 700;
      color: white;
      margin: 0 0 16px;
    }

    .cta-content p {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 32px;
    }

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .cta-primary {
      padding: 16px 40px !important;
      font-size: 16px !important;
      background: var(--accent-color) !important;
      color: white !important;
      border-radius: 50px !important;
    }

    .cta-secondary {
      padding: 16px 40px !important;
      font-size: 16px !important;
      color: white !important;
      border-color: white !important;
      border-radius: 50px !important;
    }

    /* ==================== FOOTER ==================== */
    .footer {
      background: #0a0a14;
      color: white;
      padding: 60px 24px 0;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 40px;
      padding-bottom: 40px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .footer-logo {
      width: 70px;
      height: 70px;
      margin-bottom: 12px;
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0, 200, 83, 0.3);
    }

    .footer-title {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .footer-tagline {
      color: rgba(255,255,255,0.6);
      margin: 8px 0 0;
      font-size: 14px;
    }

    .footer-links h4, .footer-contact h4, .footer-social h4 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 20px;
      color: white;
    }

    .footer-links a {
      display: block;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      margin-bottom: 12px;
      transition: color 0.3s ease;
    }

    .footer-links a:hover {
      color: var(--accent-color);
    }

    .footer-contact p {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.6);
      margin: 0 0 12px;
      font-size: 14px;
    }

    .footer-contact mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-color);
    }

    .social-icons {
      display: flex;
      gap: 12px;
    }

    .social-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      color: white;
      transition: all 0.3s ease;
    }

    .social-icon:hover {
      background: var(--accent-color);
      transform: translateY(-3px);
    }

    .footer-bottom {
      text-align: center;
      padding: 20px 0;
    }

    .footer-bottom p {
      color: rgba(255,255,255,0.4);
      margin: 0;
      font-size: 14px;
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 1024px) {
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .gallery-grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(3, 180px);
      }
      .gallery-item.large {
        grid-column: span 2;
        grid-row: span 1;
      }
      .footer-content {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .nav-links { display: none; }
      .mobile-menu-btn { display: block; }
      .mobile-menu { display: flex; }
      
      .hero-title { font-size: 48px; }
      .hero-tagline { font-size: 20px; }
      .hero-logo { width: 100px; height: 100px; }
      
      .section-header h2 { font-size: 32px; }
      
      .features-grid { grid-template-columns: 1fr; }
      
      .steps-container { flex-direction: column; gap: 40px; }
      .step-connector { width: 2px; height: 40px; margin: 0 auto; }
      
      .gallery-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
      }
      .gallery-item, .gallery-item.large {
        grid-column: span 1;
        grid-row: span 1;
        height: 200px;
      }
      
      .cta-content h2 { font-size: 28px; }
      
      .footer-content { grid-template-columns: 1fr; text-align: center; }
      .footer-brand { align-items: center; }
    }
  `]
})
export class LandingComponent {
  mobileMenuOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  // Navigate to protected routes - stores URL if not logged in
  navigateTo(route: string) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([route]);
    } else {
      // Store the intended destination and redirect to login
      sessionStorage.setItem('redirectUrl', route);
      this.router.navigate(['/login']);
    }
  }

  onBookTable() {
    this.navigateTo('/reservation');
  }
}
