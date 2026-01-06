import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ChatbotService, ChatMessage, ChatResponse } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, 
    MatTooltipModule, MatChipsModule
  ],
  template: `
    <!-- Chat Toggle Button -->
    <button 
      class="chat-toggle" 
      [class.open]="isOpen"
      (click)="toggleChat()"
      matTooltip="Chat with SmartServe Assistant">
      @if (isOpen) {
        <mat-icon>close</mat-icon>
      } @else {
        <img src="assets/images/logo-chair.png" alt="SmartServe" class="chat-toggle-logo" width="36" height="36">
      }
    </button>

    <!-- Chat Window -->
    @if (isOpen) {
      <div class="chat-window">
        <div class="chat-header">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="header-logo" width="32" height="32">
          <span>SmartServe Assistant</span>
          <button mat-icon-button (click)="toggleChat()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="chat-messages" #messagesContainer>
          @for (msg of messages; track $index) {
            <div class="message" [class.user]="msg.isUser" [class.bot]="!msg.isUser">
              <div class="message-content">
                <p [innerHTML]="formatMessage(msg.text)"></p>
                <span class="timestamp">{{ msg.timestamp | date:'shortTime' }}</span>
              </div>
            </div>
            <!-- Quick replies after bot message -->
            @if (!msg.isUser && msg.quickReplies && msg.quickReplies.length > 0 && $index === messages.length - 1) {
              <div class="quick-replies">
                @for (reply of msg.quickReplies; track reply) {
                  <button mat-stroked-button class="quick-reply-btn" (click)="sendQuickMessage(reply)">
                    {{ reply }}
                  </button>
                }
              </div>
            }
          }
          @if (isLoading) {
            <div class="message bot">
              <div class="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          }
        </div>

        <div class="chat-input">
          <input 
            type="text" 
            [(ngModel)]="userInput" 
            (keyup.enter)="sendMessage()"
            placeholder="Type a message..."
            [disabled]="isLoading"
            #inputField>
          <button mat-icon-button color="primary" (click)="sendMessage()" [disabled]="!userInput.trim() || isLoading">
            <mat-icon>send</mat-icon>
          </button>
        </div>

        <!-- Default Quick Actions (shown when no context-specific replies) -->
        @if (!lastQuickReplies || lastQuickReplies.length === 0) {
          <div class="quick-actions">
            <button mat-stroked-button (click)="sendQuickMessage('Check available tables')">
              <mat-icon>table_restaurant</mat-icon> Tables
            </button>
            <button mat-stroked-button (click)="sendQuickMessage('Make reservation')">
              <mat-icon>event</mat-icon> Reserve
            </button>
            <button mat-stroked-button (click)="sendQuickMessage('Help')">
              <mat-icon>help</mat-icon> Help
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }

    .chat-toggle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1976d2, #2e7d32);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .chat-toggle:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }

    .chat-toggle.open {
      background: #f44336;
      transform: scale(1);
    }

    .chat-toggle.open:hover {
      transform: scale(1.1);
    }

    .chat-toggle-logo {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }

    .chat-window {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 360px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .chat-header {
      background: linear-gradient(135deg, #1976d2, #2e7d32);
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chat-header span {
      flex: 1;
      font-weight: 500;
    }

    .chat-header button {
      color: white;
    }

    .header-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f5f5f5;
    }

    .message {
      display: flex;
      max-width: 85%;
    }

    .message.user {
      align-self: flex-end;
    }

    .message.bot {
      align-self: flex-start;
    }

    .message-content {
      padding: 10px 14px;
      border-radius: 16px;
      position: relative;
    }

    .message.user .message-content {
      background: #1976d2;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.bot .message-content {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .message-content p {
      margin: 0;
      white-space: pre-line;
      line-height: 1.4;
    }

    .timestamp {
      font-size: 10px;
      opacity: 0.7;
      display: block;
      margin-top: 4px;
    }

    .typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }

    .typing span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }

    .typing span:nth-child(1) { animation-delay: -0.32s; }
    .typing span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .chat-input {
      display: flex;
      padding: 12px;
      gap: 8px;
      border-top: 1px solid #eee;
      background: white;
    }

    .chat-input input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 24px;
      padding: 10px 16px;
      outline: none;
      font-size: 14px;
    }

    .chat-input input:focus {
      border-color: #1976d2;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      padding: 8px 12px 12px;
      background: white;
      overflow-x: auto;
    }

    .quick-actions button {
      font-size: 11px;
      white-space: nowrap;
      padding: 4px 8px;
    }

    .quick-actions mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      align-self: flex-start;
    }

    .quick-reply-btn {
      font-size: 12px;
      padding: 4px 12px;
      min-height: 28px;
      line-height: 1;
      border-radius: 14px;
    }

    @media (max-width: 480px) {
      .chat-window {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        bottom: 70px;
        right: 0;
      }
    }
  `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen = false;
  isLoading = false;
  userInput = '';
  messages: ChatMessage[] = [];
  lastQuickReplies: string[] = [];

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Add welcome message with quick replies
    this.messages.push({
      text: `Hi ${this.authService.user()?.name || 'there'}! 👋 I'm your restaurant assistant. How can I help you today?`,
      isUser: false,
      timestamp: new Date(),
      quickReplies: ['Check tables', 'Make reservation', 'Join queue', 'Help']
    });
    this.lastQuickReplies = ['Check tables', 'Make reservation', 'Join queue', 'Help'];
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    // Add user message
    this.messages.push({
      text,
      isUser: true,
      timestamp: new Date()
    });

    // Clear quick replies from previous bot message
    if (this.messages.length > 1) {
      const prevBotMsg = this.messages[this.messages.length - 2];
      if (!prevBotMsg.isUser) {
        prevBotMsg.quickReplies = [];
      }
    }

    this.userInput = '';
    this.isLoading = true;
    this.lastQuickReplies = [];

    // Send to backend
    this.chatbotService.sendMessage(text).subscribe({
      next: (response) => {
        const quickReplies = response.quickReplies || [];
        this.messages.push({
          text: response.response,
          isUser: false,
          timestamp: new Date(),
          intent: response.intent,
          data: response.data,
          quickReplies
        });
        this.lastQuickReplies = quickReplies;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Chatbot error:', err);
        let errorMsg = "Sorry, I couldn't process your request. Please try again.";
        if (err.status === 401) {
          errorMsg = "Please log in to use the chat assistant.";
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }
        this.messages.push({
          text: errorMsg,
          isUser: false,
          timestamp: new Date(),
          quickReplies: ['Help', 'Check tables']
        });
        this.lastQuickReplies = ['Help', 'Check tables'];
        this.isLoading = false;
      }
    });
  }

  sendQuickMessage(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  formatMessage(text: string): string {
    // Convert newlines to <br> and handle bullet points
    return text
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;');
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
