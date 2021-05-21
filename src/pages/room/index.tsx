/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps, useParams } from 'react-router-dom';
import isElectron from 'is-electron';
import { joinRoom, sendIceCandidate } from '../../socket';
import { iceConfig, mediaConstraints } from '../../socket/config';
import { AppSocket } from '../../socket/events';
import './style.css';
import { Participant } from './types';

interface RouteParams {
  roomId: string;
}
interface Props extends RouteComponentProps<RouteParams> {
  socket: AppSocket | undefined;
}

export const Room = ({ socket }: Props): JSX.Element => {
  const { roomId } = useParams<RouteParams>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [participants, setParticipants] = useState<{ [k: string]: Participant }>({});

  useEffect(() => {
    if (socket && roomId) {
      navigator.mediaDevices
        .getUserMedia(mediaConstraints)
        .then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          joinRoom({ stream, roomId, setParticipants });

          return true;
        })
        .catch(console.error);

      socket.on('bc:negotiation:offer', ({ sdp, negotiatioterSocketId }) => {
        const negRC = new RTCPeerConnection(iceConfig);
        negRC.onicecandidate = sendIceCandidate(roomId);
        negRC.ontrack = (e: any) => {
          setParticipants((prevPart) => ({
            ...prevPart,
            [negotiatioterSocketId]: { ...prevPart[negotiatioterSocketId], stream: e.streams[0] },
          }));
        };
        negRC.onnegotiationneeded = () => {
          negRC
            .createOffer()
            .then((newOffer) => {
              return negRC.setLocalDescription(newOffer);
            })
            .then(() => {
              socket.emit('negotiation:offer', {
                roomId,
                sdp: negRC.localDescription,
              });

              return true;
            })
            .catch(console.error);
        };
        negRC.onconnectionstatechange = () => {
          switch (negRC.connectionState) {
            case 'connected':
              setParticipants((prevPart) =>
                prevPart[negotiatioterSocketId] ? prevPart : { ...prevPart, [negotiatioterSocketId]: {} }
              );
              break;
            case 'disconnected':
            case 'failed':
            case 'closed':
              setParticipants((prevPart) => {
                const newPart: any = {};
                Object.keys(prevPart).forEach((key) => {
                  if (key !== negotiatioterSocketId) {
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
        const desc = new RTCSessionDescription(sdp);
        negRC
          .setRemoteDescription(desc)
          .then(async () => {
            let streamPromise: Promise<MediaStream>;
            if (isElectron()) {
              const constraints = {
                audio: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                  },
                },
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                  },
                },
              };
              streamPromise = navigator.mediaDevices.getUserMedia(constraints as any);
            } else {
              streamPromise = navigator.mediaDevices.getUserMedia(mediaConstraints);
            }

            return streamPromise;
          })
          .then((stream) => {
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach((track) => negRC.addTrack(track, stream));

            return true;
          })
          .then(() => {
            return negRC.createAnswer();
          })
          .then((answer) => {
            return negRC.setLocalDescription(answer);
          })
          .then(() => {
            socket.emit('negotiation:answer', { sdp: negRC.localDescription, negotiatioterSocketId });

            return true;
          })
          .catch(console.error);
        socket.on('bc:icecandidate', ({ candidate }) => {
          if (candidate) negRC.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        });
      });
    }
  }, []);

  return (
    <div>
      <div>
        <Link to="/">HOME</Link>
      </div>
      <div>ROOM: {roomId}</div>
      <div>
        local:
        <div>
          <video ref={localVideoRef} autoPlay muted />
        </div>
      </div>
      <div>
        {Object.entries(participants).map(([sid, participant]: [string, Participant]) => {
          return (
            <div key={sid}>
              <video
                ref={(videoRef) => {
                  if (videoRef && participant.stream) videoRef.srcObject = participant.stream;
                }}
                autoPlay
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
