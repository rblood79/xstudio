// src/App.tsx
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./builder/components/list";
import "./App.css";
import { useParticleBackground } from "./components/ParticleBackground";

function App() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { targetMorphRef } = useParticleBackground();

  return (
    <main
      style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <Button
        ref={buttonRef}
        onClick={() => navigate("/signin")}
        size="sm"
        onMouseEnter={() => (targetMorphRef.current = 1)}
        onMouseLeave={() => (targetMorphRef.current = 0)}
      >
        START
      </Button>
    </main>
  );
}

export default App;
