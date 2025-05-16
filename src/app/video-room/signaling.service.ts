import { Injectable } from '@angular/core';
import { environment } from '../app.config';

@Injectable()
export class SignalingService {
  private socket: WebSocket | null = null;

  private serverUrl = `${environment.websocketUrl}/ws`; // 替换为你的 Spring Boot WebSocket 服务地址
  public userId: string = "";

  public onUserJoined: (userId: string) => void = () => {};
  public onUserLeft: (userId: string) => void = () => {};
  public onSignal: (fromId: string, data: any) => void = () => {};
  public onChat: (fromId: string, data: any) => void = () => {};
  public onReply: (fromId: string, data: any) => void = () => {};

  connect() {
    this.socket = new WebSocket(this.serverUrl);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, from, payload } = message;

      if (type === 'user-joined') {
        this.onUserJoined(from);
      } else if (type === 'user-left') {
        this.onUserLeft(from);
      } else if (type === 'signal') {
        this.onSignal(from, payload);
      } else if(type == 'chat'){
        this.onChat(from, payload);
      } else if(type == 'reply'){
        this.onReply(from, payload);
      }
    };
  }

  join(roomId: string, password: string) {
    this.send({ type: 'join', roomId, from: this.userId, password });
  }

  create(roomId: string, password: string) {
    this.send({ type: 'create', roomId, password, from: this.userId });
  }

  sendSignal(toId: string, payload: any) {
    this.send({ type: 'signal', to: toId, from: this.userId, payload });
  }

  sendChat(message: string){
    this.send({ type: 'chat', from: this.userId, message: message});
  }

  private send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      setTimeout(() => this.send(message), 100); // 等待连接完成
    }
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  getUserId() {
    return this.userId;
  }
}
