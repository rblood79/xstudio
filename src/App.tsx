import { useNavigate } from 'react-router';
import './App.css'

function App() {
  const navigate = useNavigate();

  return (
    <main className="grid justify-center items-center h-screen ">


      <div className="bg-white rounded-lg px-6 py-8 ring shadow-xl ring-gray-900/5">
        <button onClick={() => navigate("/signin")} className='btn btn-primary'>sign in</button>
        
        
        <p className="text-gray-500 mt-2 text-sm ">
          The Zero It even works in outer space.
        </p>
      </div>
    </main>
  )
}

export default App;
