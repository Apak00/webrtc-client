import { useHistory } from 'react-router-dom';
import { createRoom } from '../../socket';

export const Home = (): JSX.Element => {
  const history = useHistory();

  const onCreateRoomClick = () => {
    createRoom((roomId: string) => {
      history.push(`/rooms/${roomId}`);
    });
  };

  return (
    <div>
      HOME
      <button type="button" onClick={onCreateRoomClick}>
        create room
      </button>
    </div>
  );
};
