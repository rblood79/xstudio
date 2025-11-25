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

    const mountElement = mountRef.current;
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
    mountElement.appendChild(renderer.domElement);

    // ==================== 설정 ====================
    const PARTICLE_COUNT = 12000;
    const TEXT = "BESPOKE";
    const MODE = "text" as "text" | "icon"; // "text" 또는 "icon"

    // cleanup을 위한 변수
    let animationFrameId: number;
    let onResize: (() => void) | null = null;

    // 캔버스 생성 및 렌더링
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";

    if (MODE === "text") {
      ctx.textAlign = "center";
      const baseFontSize = 260;
      const maxWidth = canvas.width * 0.85;
      ctx.font = `bold ${baseFontSize}px sans-serif`;
      const textWidth = ctx.measureText(TEXT).width;

      let fontSize = baseFontSize;
      if (textWidth > maxWidth) {
        fontSize = Math.floor((baseFontSize * maxWidth) / textWidth);
      }

      ctx.font = `bold ${fontSize}px sans-serif`;
      const metrics = ctx.measureText(TEXT);
      const textHeight =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const centerY =
        canvas.height / 2 + metrics.actualBoundingBoxAscent - textHeight / 2;

      ctx.fillText(TEXT, canvas.width / 2, centerY);
    } else {
      // SVG 문자열을 캔버스에 그리는 함수
      const drawSvgToCanvas = (
        svgString: string,
        ctx: CanvasRenderingContext2D,
        scale: number,
        canvasWidth: number,
        canvasHeight: number
      ) => {
        // SVG 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) return;

        // viewBox 파싱 (기본값 0 0 24 24)
        const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number) || [
          0, 0, 24, 24,
        ];
        const svgWidth = viewBox[2];
        const svgHeight = viewBox[3];

        ctx.save();
        ctx.translate(
          canvasWidth / 2 - (svgWidth * scale) / 2,
          canvasHeight / 2 - (svgHeight * scale) / 2
        );
        ctx.scale(scale, scale);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // 모든 자식 요소 순회
        const elements = svg.querySelectorAll(
          "path, circle, line, rect, ellipse, polyline, polygon"
        );
        elements.forEach((elem) => {
          const tag = elem.tagName.toLowerCase();

          if (tag === "path") {
            const d = elem.getAttribute("d");
            if (d) {
              const path = new Path2D(d);
              ctx.stroke(path);
            }
          } else if (tag === "circle") {
            const cx = parseFloat(elem.getAttribute("cx") || "0");
            const cy = parseFloat(elem.getAttribute("cy") || "0");
            const r = parseFloat(elem.getAttribute("r") || "0");
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          } else if (tag === "line") {
            const x1 = parseFloat(elem.getAttribute("x1") || "0");
            const y1 = parseFloat(elem.getAttribute("y1") || "0");
            const x2 = parseFloat(elem.getAttribute("x2") || "0");
            const y2 = parseFloat(elem.getAttribute("y2") || "0");
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } else if (tag === "rect") {
            const x = parseFloat(elem.getAttribute("x") || "0");
            const y = parseFloat(elem.getAttribute("y") || "0");
            const width = parseFloat(elem.getAttribute("width") || "0");
            const height = parseFloat(elem.getAttribute("height") || "0");
            const rx = parseFloat(elem.getAttribute("rx") || "0");
            if (rx > 0) {
              ctx.beginPath();
              ctx.roundRect(x, y, width, height, rx);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, width, height);
            }
          } else if (tag === "ellipse") {
            const cx = parseFloat(elem.getAttribute("cx") || "0");
            const cy = parseFloat(elem.getAttribute("cy") || "0");
            const rx = parseFloat(elem.getAttribute("rx") || "0");
            const ry = parseFloat(elem.getAttribute("ry") || "0");
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (tag === "polyline" || tag === "polygon") {
            const points =
              elem.getAttribute("points")?.trim().split(/\s+|,/).map(Number) ||
              [];
            if (points.length >= 4) {
              ctx.beginPath();
              ctx.moveTo(points[0], points[1]);
              for (let i = 2; i < points.length; i += 2) {
                ctx.lineTo(points[i], points[i + 1]);
              }
              if (tag === "polygon") ctx.closePath();
              ctx.stroke();
            }
          }
        });

        ctx.restore();
      };

      // Lucide 아이콘 SVG (여기에 SVG 문자열 붙여넣기)
      const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smile-icon lucide-smile"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`;

      const scale = 30;
      drawSvgToCanvas(SVG_ICON, ctx, scale, canvas.width, canvas.height);

      console.log("아이콘 모드, scale:", scale);
    }

    // 픽셀 데이터 추출
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: number[] = [];

    // 픽셀 추출 - R 채널(흰색)을 검사
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        if (data[i] > 128) {
          const px = (x - canvas.width / 2) * 0.28;
          const py = -(y - canvas.height / 2) * 0.28;
          points.push(px, py, (Math.random() - 0.5) * 12);
        }
      }
    }

    console.log("포인트 수:", points.length / 3);

    // 부족한 파티클 복사
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

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute(
      "targetPos",
      new THREE.BufferAttribute(
        new Float32Array(points.slice(0, PARTICLE_COUNT * 3)),
        3
      )
    );

    // 시스템 테마 감지
    const isDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const particleColor = isDarkMode
      ? { r: 0.4, g: 0.7, b: 1.0 } // dark 모드: 밝은 하늘색
      : { r: 0.0, g: 0.0, b: 0.8 }; // light 모드: 진한 파란색

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        morphProgress: { value: 0 },
        color: {
          value: new THREE.Vector3(
            particleColor.r,
            particleColor.g,
            particleColor.b
          ),
        },
      },
      vertexShader: `
        attribute float random;
        attribute vec3 targetPos;
        uniform float morphProgress;
        uniform float time;

        void main() {
          vec3 pos = mix(position, targetPos, morphProgress);

          // 흩어진 상태의 큰 움직임 (morphProgress가 0일 때 최대)
          vec3 scatterMove = vec3(
            sin(time + random * 10.0) * 2.0,
            cos(time + random * 10.0) * 2.0,
            0.0
          ) * (1.0 - morphProgress);

          // 모인 상태의 미세한 움직임 (항상 적용, morphProgress가 1일 때도)
          vec3 subtleMove = vec3(
            sin(time * 1.5 + random * 20.0) * 0.5,
            cos(time * 1.5 + random * 20.0) * 0.5,
            sin(time * 0.8 + random * 15.0) * 0.3
          );

          pos += scatterMove + subtleMove;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = (320.0 / -mvPos.z) * (1.0 + random * 0.8);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 테마 변경 감지
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const newColor = e.matches
        ? { r: 0.4, g: 0.7, b: 1.0 } // dark
        : { r: 0.0, g: 0.0, b: 0.8 }; // light
      material.uniforms.color.value.set(newColor.r, newColor.g, newColor.b);
    };
    mediaQuery.addEventListener("change", handleThemeChange);

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 애니메이션
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      material.uniforms.time.value += delta;

      // 진입(hover) 속도와 이탈(leave) 속도를 따로 설정
      const MORPH_IN_SPEED = 0.1;   // hover 시 모이는 속도
      const MORPH_OUT_SPEED = 0.03; // leave 시 흩어지는 속도
      const speed = targetMorphRef.current > morphProgressRef.current
        ? MORPH_IN_SPEED
        : MORPH_OUT_SPEED;
      morphProgressRef.current +=
        (targetMorphRef.current - morphProgressRef.current) * speed;
      material.uniforms.morphProgress.value = morphProgressRef.current;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 리사이즈
    onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (onResize) {
        window.removeEventListener("resize", onResize);
      }
      mediaQuery.removeEventListener("change", handleThemeChange);
      mountElement.removeChild(renderer.domElement);
      renderer.dispose();
    };
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
