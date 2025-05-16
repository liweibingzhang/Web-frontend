import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnInit } from '@angular/core';
import { SignalingService } from './signaling.service';
import { PeerService } from './peer.service';
import { CommonModule } from '@angular/common';
import { materialModules } from '../shared/material';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-room',
  standalone: true,
  imports: [CommonModule, ...materialModules, FormsModule],
  templateUrl: './video-room.component.html',
  styleUrls: ['./video-room.component.css'],
  providers: [SignalingService, PeerService],
})
export class VideoRoomComponent implements OnInit {
  @ViewChild('local', { static: false }) localVideo!: ElementRef<HTMLVideoElement>;
  roomId: string = '';
  password: string = '';
  joined = false;
  remoteStreams = new Map<string, MediaStream>();
  selectedUserId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Input() user: any;
  closeWindow(){
    this.closed.emit();
    this.signaling.disconnect();
  }

  ngOnInit(){
    this.signaling.userId = this.user.username;
    console.log(this.user)
  }

  constructor(
    private signaling: SignalingService,
    private peerService: PeerService
  ) {
    this.signaling.onUserJoined = (userId: string) => {
      this.peerService.createConnection(userId);
    }
    this.signaling.onUserLeft = (userId: string) => {
      this.peerService.removeConnection(userId);
      this.remoteStreams.delete(userId);
      if (this.selectedUserId === userId) {
        this.selectedUserId = null;
      }
    }
    this.peerService.onRemoteStream = (userId, stream) => {
      this.remoteStreams.set(userId, stream);
      if (!this.selectedUserId) {
        this.selectedUserId = userId;
      }
    }
    this.signaling.onChat = this.getMessage.bind(this);
    this.signaling.onReply = (userId, payload) => {
      if(payload == 'create success'){
        this.joined = true;
      }else if(payload == 'join success'){
        this.joined = true;
      }else if(payload == 'create failed'){
        alert('房间已存在')
      }else if(payload == 'join failed'){
        alert('房间不存在或密码错误')
      }
    }
  }

  joinRoom() {
    this.signaling.connect();
    this.signaling.join(this.roomId, this.password);
  }

  createRoom() {
    this.signaling.connect();
    this.signaling.create(this.roomId, this.password);
  }

  async shareCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = stream;
    this.peerService.setLocalStream(stream);
  }

  async shareScreen() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    this.localVideo.nativeElement.srcObject = stream;
    this.peerService.setLocalStream(stream);
  }

  dragging = false;
  offsetX = 0;
  offsetY = 0;

  startDrag(event: MouseEvent) {
    // 仅允许在标题栏上拖动
    if (!(event.target as HTMLElement).classList.contains('drag-handle')) return;

    this.dragging = true;
    const card = (event.currentTarget as HTMLElement);
    const rect = card.getBoundingClientRect();

    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.stopDrag);
  }

  onMouseMove = (event: MouseEvent) => {
    if (this.dragging) {
      const card = document.querySelector('.floating-window') as HTMLElement;
      card.style.left = `${event.clientX - this.offsetX}px`;
      card.style.top = `${event.clientY - this.offsetY}px`;
    }
  };

  stopDrag = () => {
    this.dragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  get remoteUserIds(): string[] {
    console.log(Object.keys(this.peerService.peers));
    return Array.from(Object.keys(this.peerService.peers));
  }

  selectUser(userId: string | null) {
    this.selectedUserId = userId;
  }

  get localStream(): MediaStream | null {
    return this.peerService.localStream;
  }

  isSidebarCollapsed = false;

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  closeSharedStream() {
    const stream = this.localVideo.nativeElement.srcObject as MediaStream;
    if (stream) {
      this.stopStream(stream); // 停止所有轨道
      this.localVideo.nativeElement.srcObject = null; // 清空本地视频流
      this.peerService.setLocalStream(null); // 在 peerService 中移除本地流
    }
  }

  stopStream(stream: MediaStream) {
    stream.getTracks().forEach(track => track.stop()); // 停止所有的轨道
  }

  chatInput: string = '';
  messages: { user: string; text: string }[] = [];

  sendMessage() {
    if (this.chatInput.trim()) {
      this.messages.push({ user: '我', text: this.chatInput.trim() });
      this.signaling.sendChat(this.chatInput.trim())
      this.chatInput = '';
    }
  }

  getMessage(from: string, payload: any){
    this.messages.push({ user: from, text: payload['message'] })
  }

  chatExpanded = false;

  expandChat() {
    this.chatExpanded = true;
  }

  collapseChat() {
    // 小延迟避免点击 send 按钮等造成误判
    setTimeout(() => {
      const active = document.activeElement as HTMLElement;
      const chatBox = document.querySelector('.chat-box');
      if (!chatBox?.contains(active)) {
        this.chatExpanded = false;
      }
    }, 100);
  }


}
