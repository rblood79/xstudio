import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import * as THREE from "three";

interface ParticleBackgroundContextValue {
  targetMorphRef: React.MutableRefObject<number>;
}

const ParticleBackgroundContext =
  createContext<ParticleBackgroundContextValue | null>(null);

export function ParticleBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const targetMorphRef = useRef(0);

  return (
    <ParticleBackgroundContext.Provider value={{ targetMorphRef }}>
      {children}
    </ParticleBackgroundContext.Provider>
  );
}

export function useParticleBackground() {
  const context = useContext(ParticleBackgroundContext);
  if (!context) {
    throw new Error(
      "useParticleBackground must be used within ParticleBackgroundProvider"
    );
  }
  return context;
}

export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef } = useParticleBackground();
  const morphProgressRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // ==================== 핵심 수정 부분 ====================
    const PARTICLE_COUNT = 12000;
    const TEXT = "ASDF";

    // 폰트 확실히 로드되도록 강제 대기
    document.fonts.ready.then(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 900;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 폰트 크게 + 정확한 중앙에 그리기
      ctx.font = 'bold 420px "Arial Black", Arial, sans-serif';
      ctx.fillText(TEXT, canvas.width / 2, canvas.height / 2);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const points: number[] = [];

      // 픽셀 추출 (간격 3~4)
      for (let y = 0; y < canvas.height; y += 3.5) {
        for (let x = 0; x < canvas.width; x += 3.5) {
          const i = (y * canvas.width + x) * 4;
          if (data[i + 3] > 80) {
            // 캔버스 중앙을 (0,0)으로 맞추고, 화면 비율에 맞게 스케일링
            const px = (x - canvas.width / 2) * 0.28;
            const py = -(y - canvas.height / 2) * 0.28; // Y는 위아래 반전

            points.push(px, py, (Math.random() - 0.5) * 12);
          }
        }
      }

      console.log("텍스트 포인트 수:", points.length / 3);

      // 부족한 파티클 복사 (원본에서만 살짝 흔들기)
      while (points.length / 3 < PARTICLE_COUNT) {
        const i = Math.floor(Math.random() * (points.length / 3)) * 3;
        points.push(
          points[i] + (Math.random() - 0.5) * 7,
          points[i + 1] + (Math.random() - 0.5) * 7,
          points[i + 2]
        );
      }

      // ==================== Three.js 파티클 ====================
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const randoms = new Float32Array(PARTICLE_COUNT);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 400;
        positions[i3 + 1] = (Math.random() - 0.5) * 400;
        positions[i3 + 2] = (Math.random() - 0.5) * 80;
        randoms[i] = Math.random();
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));

      geometry.setAttribute(
        "targetPos",
        new THREE.BufferAttribute(
          new Float32Array(points.slice(0, PARTICLE_COUNT * 3)),
          3
        )
      );

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          morphProgress: { value: 0 },
        },
        vertexShader: `
          attribute float random;
          attribute vec3 targetPos;
          uniform float morphProgress;
          uniform float time;

          void main() {
            vec3 pos = mix(position, targetPos, morphProgress);
            
            pos += vec3(
              sin(time + random * 10.0) * 2.0,
              cos(time + random * 10.0) * 2.0,
              0.0
            ) * (1.0 - morphProgress);

            vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPos;
            gl_PointSize = (320.0 / -mvPos.z) * (1.0 + random * 0.8);
          }
        `,
        fragmentShader: `
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float dist = length(uv);
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            gl_FragColor = vec4(0.4, 0.7, 1.0, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // 애니메이션
      const clock = new THREE.Clock();
      const animate = () => {
        const delta = clock.getDelta();
        material.uniforms.time.value += delta;

        morphProgressRef.current +=
          (targetMorphRef.current - morphProgressRef.current) * 0.1;
        material.uniforms.morphProgress.value = morphProgressRef.current;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();

      // 리사이즈
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
      };
    });
  }, [targetMorphRef]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
