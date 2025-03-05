import './App.css'
import { Link, BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Builder from './builder';

function App() {
  return (
    <Router>
      <>
        <h1>xstudio</h1>
        <div className="card">
          <Link to="/auth">
            <button>Login</button>
          </Link>
          <Link to="/signup">
            <button>Signup</button>
          </Link>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
        <Routes>
          <Route path="/" element={<h1>Welcome to xstudio</h1>} />
          <Route path="/auth" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/builder" element={<Builder />} />
        </Routes>
      </>
    </Router>
  )
}

export default App
