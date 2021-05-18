/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import { RouteComponentProps, useParams } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { joinRoom, sendIceCandidate } from '../../socket';
import { iceConfig, mediaConstraints } from '../../socket/config';

interface RouteParams {
  roomId: string;
}
interface Props extends RouteComponentProps<RouteParams> {
  socket: Socket | undefined;
}

export const Room = ({ socket }: Props): JSX.Element => {
  const { roomId } = useParams<RouteParams>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const itemEls = useRef<HTMLVideoElement[]>([]);

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

          setLocalStream(stream);

          return true;
        })
        .catch(console.error);

      socket.on('user:connected', async ({ offer, socketId }) => {
        const rc = new RTCPeerConnection(iceConfig);
        rc.onicecandidate = sendIceCandidate(socketId);
        rc.ontrack = (e: any) => {
          console.log('AHOY', JSON.stringify(e.streams));
          addNewStream(e.streams[0]);
        };

        rc.setRemoteDescription(offer);

        localStream?.getTracks().forEach((track) => {
          rc.addTrack(track);
        });

        rc.createAnswer()
          .then((answer) => {
            rc.setLocalDescription(answer);

            socket.emit('user:answered', { socketId, answer });

            return true;
          })
          .catch(console.error);
      });
    }
  }, [socket, roomId]);

  return (
    <div>
      ROOM: {roomId}
      <div>
        <div>
          local:
          <video ref={localVideoRef} />
        </div>
        <div>
          {remoteStreams.map((s: MediaStream, index) => {
            return (
              <div key={s.id}>
                <video
                  ref={(videoRef) => {
                    if (videoRef) itemEls.current[index] = videoRef;
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
