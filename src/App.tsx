// src/App.tsx
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./shared/components/list";
import "./App.css";
import {
  SquarePlus,
  CloudUpload,
  Box,
  Play,
} from "lucide-react";
import { useParticleBackground } from "./components/ParticleBackground";

// Lucide 아이콘 SVG 문자열
const ICON_SQUARE_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`;
const ICON_CLOUD_UPLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>`;
const ICON_PLAY = `<svg data-v-6433c584="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>`;
const ICON_BOX = `<svg data-v-6433c584="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>`;

// 회오리 성장 설정
const VORTEX_GROWTH_RATE = 0.02;
const VORTEX_MAX_STRENGTH = 1.0;

function App() {
  const navigate = useNavigate();
  const { setHoverContent, vortexRef } = useParticleBackground();
  const vortexIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = useCallback((content: { type: "text"; value: string } | { type: "svg"; value: string }) => {
    setHoverContent(content);
  }, [setHoverContent]);

  const handleMouseLeave = useCallback(() => {
    setHoverContent(null);
  }, [setHoverContent]);

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
  const handleVortexStart = useCallback((e: React.MouseEvent) => {
    // 버튼 위에서는 회오리 시작 안함
    if ((e.target as HTMLElement).closest('button')) return;

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
  }, [vortexRef, screenToWorld]);

  // 회오리 이동 (마우스 무브)
  const handleVortexMove = useCallback((e: React.MouseEvent) => {
    if (!vortexRef.current.active) return;

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    vortexRef.current.x = x;
    vortexRef.current.y = y;
  }, [vortexRef, screenToWorld]);

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
      style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        cursor: "crosshair",
      }}
      onMouseDown={handleVortexStart}
      onMouseMove={handleVortexMove}
      onMouseUp={handleVortexEnd}
      onMouseLeave={handleVortexEnd}
    >
      <Button
        size="sm"
        variant="ghost"
        onMouseEnter={() => handleMouseEnter({ type: "svg", value: ICON_SQUARE_PLUS })}
        onMouseLeave={handleMouseLeave}
      >
        <SquarePlus />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onMouseEnter={() => handleMouseEnter({ type: "svg", value: ICON_CLOUD_UPLOAD })}
        onMouseLeave={handleMouseLeave}
      >
        <CloudUpload />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onMouseEnter={() => handleMouseEnter({ type: "svg", value: ICON_BOX })}
        onMouseLeave={handleMouseLeave}
      >
        <Box />
      </Button>
      <Button
        onClick={() => navigate("/signin")}
        size="sm"
        variant="ghost"
        onMouseEnter={() => handleMouseEnter({ type: "svg", value: ICON_PLAY })}
        onMouseLeave={handleMouseLeave}
      >
        <Play />
      </Button>
    </main>
  );
}

export default App;
