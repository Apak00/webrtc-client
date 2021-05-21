import { useEffect, useState } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { Room } from './pages/room';
import { Home } from './pages/home';
import { initSocketConn } from './socket/index';

const App = (): JSX.Element => {
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    setSocket(initSocketConn());

    return () => {
      socket?.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <div>
        <Switch>
          <Route path="/rooms/:roomId" render={(props) => <Room {...props} socket={socket} />} />
          <Route path="/" component={Home} />
        </Switch>
      </div>
    </BrowserRouter>
  );
};

export default App;
