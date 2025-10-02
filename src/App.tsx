import { useNavigate } from 'react-router';
import { Button } from './builder/components/list';
import './App.css'

function App() {
  const navigate = useNavigate();

  return (
    <main className="grid justify-center items-center h-screen ">
      <div className="main-container">
        <Button onClick={() => navigate("/signin")} size="sm" children="START" />
      </div>
    </main>
  )
}

export default App;
