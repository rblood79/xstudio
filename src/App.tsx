// src/App.tsx
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./hero.css";
import {
  SquarePlus,
  CloudUpload,
  Brain,
  Box,
  Play,
  BotMessageSquare,
  CircleDivide,
  CirclePercent,
  Pyramid,
} from "lucide-react";
import { useParticleBackground } from "./components/ParticleBackground";
import { ParticleButton} from "./components/ParticleButton";

// 회오리 성장 설정
const VORTEX_GROWTH_RATE = 0.02;
const VORTEX_MAX_STRENGTH = 1.0;

function App() {
  const navigate = useNavigate();
  const { vortexRef } = useParticleBackground();
  const vortexIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 화면 좌표를 Three.js 월드 좌표로 변환
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    // 화면 중심 기준 정규화 (-1 ~ 1)
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -((clientY / window.innerHeight) * 2 - 1);

    // 카메라 z=200, FOV=60도 기준 월드 좌표 계산
    const cameraZ = 200;
    const fovRad = (60 * Math.PI) / 180;
    const halfHeight = Math.tan(fovRad / 2) * cameraZ;
    const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);

    return {
      x: ndcX * halfWidth,
      y: ndcY * halfHeight,
    };
  }, []);

  // 회오리 시작 (마우스 다운)
  const handleVortexStart = useCallback(
    (e: React.MouseEvent) => {
      // 버튼 위에서는 회오리 시작 안함
      if ((e.target as HTMLElement).closest("button")) return;

      const { x, y } = screenToWorld(e.clientX, e.clientY);

      vortexRef.current = {
        active: true,
        x,
        y,
        strength: 0.1,
        radius: 20,
        height: 0,
      };

      // 누르는 동안 점점 강해짐
      vortexIntervalRef.current = setInterval(() => {
        if (vortexRef.current.active) {
          vortexRef.current.strength = Math.min(
            vortexRef.current.strength + VORTEX_GROWTH_RATE,
            VORTEX_MAX_STRENGTH
          );
          vortexRef.current.radius = 20 + vortexRef.current.strength * 160;
          vortexRef.current.height = vortexRef.current.strength * 250;
        }
      }, 16);
    },
    [vortexRef, screenToWorld]
  );

  // 회오리 이동 (마우스 무브)
  const handleVortexMove = useCallback(
    (e: React.MouseEvent) => {
      if (!vortexRef.current.active) return;

      const { x, y } = screenToWorld(e.clientX, e.clientY);
      vortexRef.current.x = x;
      vortexRef.current.y = y;
    },
    [vortexRef, screenToWorld]
  );

  // 회오리 종료 (마우스 업) - 천천히 흩어지도록
  const handleVortexEnd = useCallback(() => {
    if (vortexIntervalRef.current) {
      clearInterval(vortexIntervalRef.current);
      vortexIntervalRef.current = null;
    }
    // active만 false로 - strength는 ParticleBackground에서 천천히 감소
    vortexRef.current.active = false;
  }, [vortexRef]);

  return (
    <main
      className="main"
      onMouseDown={handleVortexStart}
      onMouseMove={handleVortexMove}
      onMouseUp={handleVortexEnd}
      onMouseLeave={handleVortexEnd}
    >
      <section className="welcome-wrapper">
        <div className="welcome-container">
          <div className="logo-container">
            <div className="logo">ICONIC FUTURE</div>
          </div>
          <div className="header-container">
            <div className="landing-header">
              <h1 className="landing-header-title">Experience of BESPOKE</h1>
              <p className="landing-header-subtitle">Unleash your creativity and bring your ideas to life with our cutting-edge platform.</p>
            </div>
          </div>
          <div className="landing-cta">
            <ParticleButton
              className="react-aria-Button"
              size="md"
              variant="primary"
              onClick={() => navigate("/signin")}
            >
              Start App
            </ParticleButton>
          </div>
          <div className="landing-features">
            <ParticleButton size="sm" variant="ghost">
              <SquarePlus />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <CloudUpload />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <Box />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <CircleDivide />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <Brain />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <BotMessageSquare />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <CirclePercent />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <Pyramid />
            </ParticleButton>
            <ParticleButton size="sm" variant="ghost">
              <Play />
            </ParticleButton>
          </div>
          
        </div>


      </section>
    </main>
  );
}

export default App;
