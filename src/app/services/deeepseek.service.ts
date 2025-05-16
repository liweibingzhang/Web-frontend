import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../app.config';

@Injectable({
  providedIn: 'root',
})
export class DeepSeekService {
  private apiUrl = environment.deepseekApiUrl;
  private apiKey = environment.deepseekApiKey; // 替换为你的 API Key

  constructor(private http: HttpClient) {}

  chatCompletion(messages: any[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    });

    const body = {
      model: 'deepseek-chat',
      messages,
      stream: false,
    };

    return this.http.post(this.apiUrl, body, { headers });
  }
}
