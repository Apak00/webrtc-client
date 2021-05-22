/* eslint-disable compat/compat */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps, useParams } from 'react-router-dom';
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
  const pendingPeers2: React.MutableRefObject<{ [k: string]: RTCPeerConnection }> = useRef({});

  const [isScreenSharing, setScreenSharing] = useState<boolean | undefined>();

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
              pendingPeers2.current[sid] = lc;

              return true;
            })
            .catch(console.error);
        };
        lc.onconnectionstatechange = () => {
          switch (lc.connectionState) {
            case 'connected':
              setParticipants((prevPart) => {
                return { ...prevPart, [sid]: { ...prevPart[sid], peer: pendingPeers2.current[sid] } };
              });
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
        if (pendingPeers2.current[answererSid]) {
          pendingPeers2.current[answererSid].setRemoteDescription(desc);
        } else if (participants[answererSid]) {
          participants[answererSid].peer?.setRemoteDescription(desc);
        }
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
        const rc = new RTCPeerConnection(iceConfig);
        rc.onicecandidate = sendIceCandidate(offererSid);
        rc.ontrack = (e: any) => {
          setParticipants((prevPart) => ({
            ...prevPart,
            [offererSid]: { ...prevPart[offererSid], stream: e.streams[0] },
          }));
        };
        rc.onnegotiationneeded = () => {
          rc.createOffer()
            .then((newOffer) => {
              return rc.setLocalDescription(newOffer);
            })
            .then(() => {
              socket.emit('offer', {
                offerieSid: offererSid,
                sdp: rc.localDescription,
              });

              return true;
            })
            .catch(console.error);
        };
        rc.onconnectionstatechange = () => {
          switch (rc.connectionState) {
            case 'connected':
              setParticipants((prevPart) => ({ ...prevPart, [offererSid]: { ...prevPart[offererSid], peer: rc } }));
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
        rc.setRemoteDescription(desc)
          .then(async () => {
            return navigator.mediaDevices.getUserMedia(mediaConstraints);
          })
          .then((stream) => {
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach((track) => rc.addTrack(track, stream));

            return true;
          })
          .then(() => {
            return rc.createAnswer();
          })
          .then((answer) => {
            return rc.setLocalDescription(answer);
          })
          .then(() => {
            socket.emit('answer', { sdp: rc.localDescription, offererSid });

            return true;
          })
          .catch(console.error);
        socket.on('ice:candidate:forward', ({ candidate }) => {
          if (candidate) rc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        });
      });
    }

    return () => {
      Object.values(participants).forEach(({ peer }) => {
        peer?.close();
      });
    };
  }, []);

  useEffect(() => {
    if (isScreenSharing) {
      (navigator.mediaDevices as any)
        .getDisplayMedia(mediaConstraints)
        .then((stream: any) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          return stream;
        })
        .then((stream: any) => {
          Object.values(participants).forEach(({ peer }) => {
            peer?.getSenders().forEach((sender) => {
              peer?.removeTrack(sender);
            });
            stream.getTracks().forEach((track: any) => peer?.addTrack(track, stream));
          });
          return true;
        })
        .catch(console.error);
    } else if (isScreenSharing === false) {
      navigator.mediaDevices
        .getUserMedia(mediaConstraints)
        .then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          return stream;
        })
        .then((stream) => {
          Object.values(participants).forEach(({ peer }) => {
            peer?.getSenders().forEach((sender) => {
              peer?.removeTrack(sender);
            });
            stream.getTracks().forEach((track) => peer?.addTrack(track, stream));
          });
          return true;
        })
        .catch(console.error);
    }
  }, [isScreenSharing]);

  return (
    <div>
      <div>
        <Link to="/">HOME</Link>
      </div>
      <div>ROOM: {roomId}</div>
      <div>ID: {socket.id}</div>
      <div>
        <button type="button" onClick={() => setScreenSharing(!isScreenSharing)}>
          toggle screen share
        </button>
        {isScreenSharing ? 'on' : 'off'}
      </div>
      <div>
        local:
        <div>
          <video ref={localVideoRef} autoPlay muted />
        </div>
      </div>
      <div className="remotes-container">
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
