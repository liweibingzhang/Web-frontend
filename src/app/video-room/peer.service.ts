import { Injectable } from '@angular/core';
import { SignalingService } from './signaling.service';

@Injectable()
export class PeerService {
  public peers: { [id: string]: RTCPeerConnection | null } = {};
  public localStream: MediaStream | null = null;

  public onRemoteStream: (userId: string, stream: MediaStream) => void = () => {};

  constructor(private signaling: SignalingService) {
    this.signaling.onSignal = this.handleSignal.bind(this);
  }

  async setLocalStream(stream: MediaStream | null) {
    if (stream === null) {
      // 停止本地流中的所有轨道
      this.localStream?.getTracks().forEach(track => track.stop());
      this.localStream = null;

      // 清除所有 peer 的本地视频轨道
      for (const [peerId, peer] of Object.entries(this.peers)) {
        const senders = peer!.getSenders();
        for (const sender of senders) {
          if (sender.track) {
            peer!.removeTrack(sender); // 移除发送轨道
          }
        }
      }
      return;
    }
    this.localStream = stream;
    for (const [peerId, peer] of Object.entries(this.peers)) {
      const senders = peer!.getSenders();
      for (const sender of senders) {
        if (sender.track) {
          peer!.removeTrack(sender);
        }
      }
      if (peer) {
        for (const track of stream.getTracks()) {
          peer!.addTrack(track, stream);
        }
      }
      const offer = await peer!.createOffer();
      await peer!.setLocalDescription(offer);
      this.signaling.sendSignal(peerId, { sdp: offer });
    }
  }

  createConnection(peerId: string) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendSignal(peerId, { candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      this.onRemoteStream(peerId, event.streams[0]);
      console.log('发起方接收到视频流')
      console.log(peerId)
    };

    if (this.localStream) {
      console.log('发起方添加本地流')
      for (const track of this.localStream.getTracks()) {
        peer.addTrack(track, this.localStream);
      }
    }

    peer.createOffer({offerToReceiveAudio: true,
      offerToReceiveVideo: true})
      .then((offer) => peer.setLocalDescription(offer))
      .then(() => {
        this.signaling.sendSignal(peerId, { sdp: peer.localDescription });
      });

    this.peers[peerId] = peer;
  }

  async handleSignal(fromId: string, data: any) {
    console.log(`get signal from ${fromId}`)
    let peer = this.peers[fromId];

    if (!peer) {
      peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          this.signaling.sendSignal(fromId, { candidate: event.candidate });
        }
      };

      peer.ontrack = (event) => {
        this.onRemoteStream(fromId, event.streams[0]);
        console.log('接收方接收到视频流')
        console.log(fromId)
      };

      if (this.localStream) {
        console.log('接收方添加本地流')
        for (const track of this.localStream.getTracks()) {
          peer.addTrack(track, this.localStream);
        }
      }else{
        console.log('接收方本地流为空')
      }

      this.peers[fromId] = peer;
    }

    if (data.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === 'offer') {
        console.log(`get offer and create answer to ${fromId}`)
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        this.signaling.sendSignal(fromId, { sdp: answer });
      }
    }

    if (data.candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  removeConnection(peerId: string) {
    console.log(`remove connection ${peerId}`)
    this.peers[peerId]?.close();
    delete this.peers[peerId];
  }
}
