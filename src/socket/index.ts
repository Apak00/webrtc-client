/* eslint-disable compat/compat */
import { io } from 'socket.io-client';
import { iceConfig } from './config';
import { AppSocket } from './events';

let socket: AppSocket;
const lc = new RTCPeerConnection(iceConfig);

export const sendIceCandidate = (socketId?: string) => (e: any) => {
  socket.emit('ice:candidate', { socketId, candidate: e.candidate });
};

export const initSocketConn = (): AppSocket => {
  socket = io('http://localhost:3000');

  socket.on('user:answered:forward', ({ answer }) => {
    lc.setRemoteDescription(answer);
  });

  return socket;
};

export const createRoom = (callback: (roomId: string) => void): void => {
  socket?.emit('room:create', {}, callback);
};

export const joinRoom = ({
  stream,
  roomId,
  addNewStream,
}: {
  stream: MediaStream;
  roomId: string;
  addNewStream: any;
}): void => {
  lc.onicecandidate = sendIceCandidate();
  lc.ontrack = (e) => {
    addNewStream(e.streams[0]);
  };
  stream.getTracks().forEach((track) => {
    lc.addTrack(track);
  });

  lc.createOffer()
    .then((offer) => {
      lc.setLocalDescription(offer);
      socket?.emit('room:join', { roomId, offer });

      return true;
    })
    .catch(console.error);
};
