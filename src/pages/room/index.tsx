/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import { RouteComponentProps, useParams } from 'react-router-dom';
import { joinRoom, sendIceCandidate } from '../../socket';
import { iceConfig, mediaConstraints } from '../../socket/config';
import { AppSocket } from '../../socket/events';
import './style.css';

interface RouteParams {
  roomId: string;
}
interface Props extends RouteComponentProps<RouteParams> {
  socket: AppSocket | undefined;
}

export const Room = ({ socket }: Props): JSX.Element => {
  const { roomId } = useParams<RouteParams>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

  const addNewStream = (newRemoteStream: MediaStream) => {
    if (newRemoteStream) {
      setRemoteStreams([...remoteStreams, newRemoteStream]);
    }
  };

  useEffect(() => {
    if (socket && roomId) {
      navigator.mediaDevices
        .getUserMedia(mediaConstraints)
        .then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          joinRoom({ stream, roomId, addNewStream });

          return true;
        })
        .catch(console.error);

      socket.on('bc:negotiation:offer', ({ sdp, negotiatioterSocketId }) => {
        const negRC = new RTCPeerConnection(iceConfig);
        negRC.onicecandidate = sendIceCandidate(roomId);
        negRC.ontrack = (e: any) => {
          addNewStream(e.streams[0]);
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
        const desc = new RTCSessionDescription(sdp);

        negRC
          .setRemoteDescription(desc)
          .then(() => {
            return navigator.mediaDevices.getUserMedia(mediaConstraints);
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
  }, [socket, roomId]);

  return (
    <div>
      ROOM: {roomId}
      <div>
        <div>
          local:
          <div>
            <video ref={localVideoRef} autoPlay muted />
          </div>
        </div>
        <div>
          {remoteStreams.map((s: MediaStream) => {
            return (
              <div key={s.id}>
                <video
                  ref={(videoRef) => {
                    if (videoRef) videoRef.srcObject = s;
                  }}
                  autoPlay
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
