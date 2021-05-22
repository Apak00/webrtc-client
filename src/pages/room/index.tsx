/* eslint-disable compat/compat */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps, useParams } from 'react-router-dom';
import isElectron from 'is-electron';
import { sendIceCandidate } from '../../socket';
import { iceConfig, mediaConstraints } from '../../socket/config';
import { AppSocket } from '../../socket/events';
import './style.css';
import { Participant } from './types';

interface RouteParams {
  roomId: string;
}
interface Props extends RouteComponentProps<RouteParams> {
  socket: AppSocket;
}

export const Room = ({ socket }: Props): JSX.Element => {
  const { roomId } = useParams<RouteParams>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [participants, setParticipants] = useState<{ [k: string]: Participant }>({});
  const [pendingPeers, setPendingPeers] = useState<{ [k: string]: RTCPeerConnection }>({});

  const joinRoom = (stream: MediaStream): void => {
    socket.emit('join:room', { roomId });
    socket.on('join:room:response', ({ alreadyConnectedSids }) => {
      alreadyConnectedSids.forEach((sid) => {
        const lc = new RTCPeerConnection(iceConfig);
        lc.onicecandidate = sendIceCandidate(sid);
        lc.ontrack = (e) => {
          setParticipants((prevPart) => ({
            ...prevPart,
            [sid]: { ...prevPart[sid], stream: e.streams[0] },
          }));
        };
        stream.getTracks().forEach((track) => {
          lc.addTrack(track, stream);
        });
        lc.onnegotiationneeded = () => {
          lc.createOffer()
            .then((newOffer) => {
              return lc.setLocalDescription(newOffer);
            })
            .then(() => {
              socket.emit('offer', {
                offerieSid: sid,
                sdp: lc.localDescription,
              });

              return true;
            })
            .then(() => {
              setPendingPeers((prevPendings) => ({ ...prevPendings, [sid]: lc }));

              return true;
            })
            .catch(console.error);
        };
        lc.onconnectionstatechange = () => {
          switch (lc.connectionState) {
            case 'connected':
              setParticipants((prevPart) =>
                prevPart[sid] ? prevPart : { ...prevPart, [sid]: { peer: pendingPeers[sid] } }
              );
              break;
            case 'disconnected':
            case 'failed':
            case 'closed':
              setParticipants((prevPart) => {
                const newPart: any = {};
                Object.keys(prevPart).forEach((key) => {
                  if (key !== sid) {
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
      });

      socket.on('answer:forward', ({ sdp, answererSid }) => {
        const desc = new RTCSessionDescription(sdp);
        setPendingPeers((prevPendings) => {
          const newPendings = { ...prevPendings };
          if (!newPendings[answererSid].remoteDescription && !newPendings[answererSid].pendingRemoteDescription) {
            newPendings[answererSid].setRemoteDescription(desc);
          }

          return newPendings;
        });
      });
    });
  };

  useEffect(() => {
    if (roomId) {
      navigator.mediaDevices
        .getUserMedia(mediaConstraints)
        .then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          joinRoom(stream);

          return true;
        })
        .catch(console.error);

      socket.on('offer:forward', ({ sdp, offererSid }) => {
        const negRC = new RTCPeerConnection(iceConfig);
        negRC.onicecandidate = sendIceCandidate(offererSid);
        negRC.ontrack = (e: any) => {
          setParticipants((prevPart) => ({
            ...prevPart,
            [offererSid]: { ...prevPart[offererSid], stream: e.streams[0] },
          }));
        };
        negRC.onnegotiationneeded = () => {
          negRC
            .createOffer()
            .then((newOffer) => {
              return negRC.setLocalDescription(newOffer);
            })
            .then(() => {
              socket.emit('offer', {
                offerieSid: offererSid,
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
                prevPart[offererSid] ? prevPart : { ...prevPart, [offererSid]: { peer: negRC } }
              );
              break;
            case 'disconnected':
            case 'failed':
            case 'closed':
              setParticipants((prevPart) => {
                const newPart: any = {};
                Object.keys(prevPart).forEach((key) => {
                  if (key !== offererSid) {
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
            socket.emit('answer', { sdp: negRC.localDescription, offererSid });

            return true;
          })
          .catch(console.error);
        socket.on('ice:candidate:forward', ({ candidate }) => {
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
      <div>ID: {socket.id}</div>
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
