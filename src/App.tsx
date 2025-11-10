import { useNavigate } from 'react-router';
import { Button } from './builder/components/list';
import './App.css'

function App() {
  const navigate = useNavigate();

  return (
    <main>
      <div>
        <Button onClick={() => navigate("/signin")} size="sm" children="START" />
      </div>
    </main>
  )
}

export default App;
