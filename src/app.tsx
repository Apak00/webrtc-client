import { BrowserRouter, Switch, Route, Link } from 'react-router-dom';

const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/rooms">Rooms</Link>
          </li>
        </ul>
      </nav>
      <Switch>
        <Route path="/rooms">
          <div>HERE ROOMS2</div>
        </Route>
        <Route path="/">
          <div>HELLOW</div>
        </Route>
      </Switch>
    </BrowserRouter>
  );
};

export default App;
