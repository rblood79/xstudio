import { useNavigate } from 'react-router';
import './App.css'

function App() {
  const navigate = useNavigate();

  return (
    <main className="grid justify-center items-center h-screen ">


      <div className="main-container">
        <button onClick={() => navigate("/signin")} className='btn btn-primary'>sign in</button>
      </div>
    </main>
  )
}

export default App;
