/* eslint-disable no-console */
/* eslint-disable compat/compat */
import { Dispatch, SetStateAction } from 'react';
import { io } from 'socket.io-client';
import { Participant } from '../pages/room/types';
import { iceConfig } from './config';
import { AppSocket } from './events';

let socket: AppSocket;

export const sendIceCandidate =
  (roomId: string) =>
  (e: any): void => {
    socket.emit('ice:candidate', { roomId, candidate: e.candidate });
  };

export const initSocketConn = (): AppSocket => {
  socket = io('https://webrtc-server-one.herokuapp.com/', {
    path: '/socket.io',
    transports: ['websocket'],
    secure: true,
    withCredentials: true,
  });

  return socket;
};

export const createRoom = (callback: (roomId: string) => void): void => {
  socket?.emit('room:create', {}, callback);
};

export const joinRoom = ({
  stream,
  roomId,
  setParticipants,
}: {
  stream: MediaStream;
  roomId: string;
  setParticipants: Dispatch<SetStateAction<{ [k: string]: Participant }>>;
}): void => {
  const lc = new RTCPeerConnection(iceConfig);

  socket?.emit('join:room', { roomId });
  lc.onicecandidate = sendIceCandidate(roomId);
  lc.ontrack = (e) => {
    setParticipants((prevPart) => ({
      ...prevPart,
      [socket.id]: { ...prevPart[socket.id], stream: e.streams[0] },
    }));
  };
  lc.onconnectionstatechange = () => {
    switch (lc.connectionState) {
      case 'connected':
        setParticipants((prevPart) => (prevPart[socket.id] ? prevPart : { ...prevPart, [socket.id]: {} }));
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        setParticipants((prevPart) => {
          const newPart: any = {};
          Object.keys(prevPart).forEach((key) => {
            if (key !== socket.id) {
              newPart[key] = prevPart[key];
            }
          });
          return newPart;
        });
        break;
      default:
        break;
    }
  };

  lc.onnegotiationneeded = () => {
    lc.createOffer()
      .then((newOffer) => {
        return lc.setLocalDescription(newOffer);
      })
      .then(() => {
        socket.emit('negotiation:offer', {
          roomId,
          sdp: lc.localDescription,
        });

        return true;
      })
      .catch(console.error);
  };

  stream.getTracks().forEach((track) => {
    lc.addTrack(track, stream);
  });

  socket.on('negotiation:answer:forward', ({ sdp }) => {
    const desc = new RTCSessionDescription(sdp);
    lc.setRemoteDescription(desc);
  });
};
