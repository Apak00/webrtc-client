import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createRoom } from '../../socket';
import './style.css';

export const Home = (): JSX.Element => {
  const history = useHistory();
  const [room, setRoom] = useState<string>('');

  const onJoinRoomClick = () => {
    history.push(`/rooms/${room}`);
  };

  const onCreateRoomClick = () => {
    createRoom((roomId: string) => {
      history.push(`/rooms/${roomId}`);
    });
  };

  return (
    <div className="home-page">
      HOME
      <button type="button" onClick={onCreateRoomClick}>
        create room
      </button>
      <div className="join-room-button">
        <input type="text" onChange={(e) => setRoom(e.target.value)} value={room} />
        <button type="button" onClick={onJoinRoomClick}>
          join room
        </button>
      </div>
    </div>
  );
};
