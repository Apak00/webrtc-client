import { Socket } from 'socket.io-client';
import { Room } from './types';

interface Error {
  error: string;
}

interface Success<T> {
  data: T;
}

export type Response<T> = Error | Success<T>;

export interface ServerEvents {
  'ice:candidate:forward': (payload: { candidate: RTCIceCandidate }) => void;
  'offer:forward': (payload: { sdp: any; offererSid: string }) => void;
  'answer:forward': (payload: { sdp: any; answererSid: string }) => void;
  'join:room:response': (payload: { alreadyConnectedSids: string[] }) => void;
}

export interface ClientEvents {
  'room:create': (payload: Omit<Room, 'id'>, callback: (res: string) => void) => void;
  'join:room': (payload: { roomId: string }) => void;
  'ice:candidate': (payload: { candidate: RTCIceCandidate; target: string }) => void;
  offer: (payload: { offerieSid: string; sdp: any }) => void;
  answer: (payload: { offererSid: string; sdp: any }) => void;
}

export type AppSocket = Socket<ServerEvents, ClientEvents>;
