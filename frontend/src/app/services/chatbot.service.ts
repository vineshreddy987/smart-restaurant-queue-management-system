import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
  data?: any;
  quickReplies?: string[];
}

export interface ChatResponse {
  response: string;
  intent: string;
  confidence: number;
  data?: any;
  success: boolean;
  quickReplies?: string[];
  sessionStep?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private apiUrl = 'http://localhost:3001/api/chatbot';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/message`, { message });
  }
}
