/**
 * MatrixRainCanvas - Matrix Digital Rain Effect
 *
 * 영화 《매트릭스》의 인트로에서 등장하는 디지털 비(Digital Rain) 효과
 * - 검은 배경 위에 녹색 문자들이 세로로 흘러내림
 * - 가타카나, 숫자, 라틴 문자 조합
 * - 각 열의 속도와 길이가 랜덤
 * - 가장 밝은 머리 부분과 점점 흐려지는 꼬리
 * - Three.js Points + CanvasTexture 기반 렌더링
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ==================== Constants ====================
const COLUMN_COUNT = 80; // 열 개수
const MAX_DROPS_PER_COLUMN = 25; // 각 열당 최대 문자 수
const CHAR_SIZE = 24; // 문자 크기 (px)
const TEXTURE_SIZE = 64; // 텍스처 크기

// 매트릭스 문자셋: 가타카나 + 숫자 + 일부 라틴 문자
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

// ==================== Types ====================
interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  charIndex: number;
  brightness: number; // 0~1, 머리일수록 밝음
  changeTimer: number;
}

// ==================== Helper Functions ====================
function createCharTexture(char: string, brightness: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;

  // 배경 투명
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 문자 그리기
  const green = Math.floor(brightness * 255);
  const red = Math.floor(brightness * 180);
  ctx.fillStyle = brightness > 0.9
    ? `rgb(255, 255, 255)` // 머리는 흰색
    : `rgb(${red}, ${green}, ${Math.floor(red * 0.5)})`;

  ctx.font = `bold ${TEXTURE_SIZE * 0.7}px "MS Gothic", "Meiryo", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);

  // 글로우 효과
  if (brightness > 0.7) {
    ctx.shadowColor = `rgba(0, 255, 70, ${brightness})`;
    ctx.shadowBlur = 10;
    ctx.fillText(char, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 프리 생성된 문자 텍스처 아틀라스
function createCharAtlas(): { texture: THREE.CanvasTexture; charCount: number } {
  const charsPerRow = 16;
  const rows = Math.ceil(MATRIX_CHARS.length / charsPerRow);
  const atlasSize = charsPerRow * TEXTURE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasSize;
  canvas.height = rows * TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 각 문자를 아틀라스에 그리기
  for (let i = 0; i < MATRIX_CHARS.length; i++) {
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    const x = col * TEXTURE_SIZE + TEXTURE_SIZE / 2;
    const y = row * TEXTURE_SIZE + TEXTURE_SIZE / 2;

    ctx.fillStyle = "rgb(0, 255, 70)";
    ctx.font = `bold ${TEXTURE_SIZE * 0.7}px "MS Gothic", "Meiryo", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(MATRIX_CHARS[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, charCount: MATRIX_CHARS.length };
}

// ==================== Vertex Shader ====================
const MATRIX_VERTEX_SHADER = `
  attribute float charIndex;
  attribute float brightness;
  attribute float size;

  varying float vBrightness;
  varying float vCharIndex;

  void main() {
    vBrightness = brightness;
    vCharIndex = charIndex;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

// ==================== Fragment Shader ====================
const MATRIX_FRAGMENT_SHADER = `
  uniform sampler2D charAtlas;
  uniform float charCount;
  uniform float charsPerRow;
  uniform float time;

  varying float vBrightness;
  varying float vCharIndex;

  void main() {
    // 원형 마스크 (부드러운 가장자리)
    vec2 uv = gl_PointCoord;
    float dist = length(uv - 0.5);
    if (dist > 0.5) discard;

    // 아틀라스에서 문자 샘플링
    float charIdx = floor(vCharIndex);
    float col = mod(charIdx, charsPerRow);
    float row = floor(charIdx / charsPerRow);

    vec2 atlasUV = vec2(
      (col + uv.x) / charsPerRow,
      (row + uv.y) / ceil(charCount / charsPerRow)
    );

    vec4 texColor = texture2D(charAtlas, atlasUV);

    // 밝기에 따른 색상 조정
    vec3 matrixGreen = vec3(0.0, 1.0, 0.27);
    vec3 headWhite = vec3(1.0, 1.0, 1.0);

    // 머리 부분은 흰색, 나머지는 녹색 그라데이션
    vec3 color = mix(matrixGreen * vBrightness, headWhite, step(0.92, vBrightness));

    // 약간의 깜빡임
    float flicker = 0.95 + 0.05 * sin(time * 10.0 + vCharIndex * 3.14);
    color *= flicker;

    // 알파 계산 (밝기 + 텍스처)
    float alpha = texColor.a * vBrightness * 1.2;
    alpha *= 1.0 - smoothstep(0.3, 0.5, dist); // 가장자리 페이드

    gl_FragColor = vec4(color, alpha);
  }
`;

// ==================== Component Props ====================
interface MatrixRainCanvasProps {
  /** Bloom 강도 (0.0 ~ 2.0) */
  bloomStrength?: number;
  /** Bloom 반경 */
  bloomRadius?: number;
  /** Bloom 임계값 (0.0 ~ 1.0) */
  bloomThreshold?: number;
  /** 낙하 속도 배율 */
  speedMultiplier?: number;
}

// ==================== Component ====================
export function MatrixRainCanvas({
  bloomStrength = 0.8,
  bloomRadius = 0.5,
  bloomThreshold = 0.2,
  speedMultiplier = 1.0,
}: MatrixRainCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountElement = mountRef.current;

    // ========== Scene Setup ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 200);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountElement.appendChild(renderer.domElement);

    // ========== Character Atlas ==========
    const { texture: charAtlas, charCount } = createCharAtlas();
    const charsPerRow = 16;

    // ========== Calculate Layout ==========
    // 카메라 시야에 맞게 화면 영역 계산
    const fovRad = (60 * Math.PI) / 180;
    const halfHeight = Math.tan(fovRad / 2) * 200;
    const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);

    const columnWidth = (halfWidth * 2) / COLUMN_COUNT;

    // ========== Initialize Drops ==========
    const totalDrops = COLUMN_COUNT * MAX_DROPS_PER_COLUMN;
    const drops: Drop[] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      const columnX = -halfWidth + col * columnWidth + columnWidth / 2;
      const speed = (0.5 + Math.random() * 1.5) * speedMultiplier;
      const length = 5 + Math.floor(Math.random() * 15);

      // 각 열에 빗방울 체인 생성
      const startY = halfHeight + Math.random() * halfHeight * 2; // 화면 위에서 시작

      for (let i = 0; i < MAX_DROPS_PER_COLUMN; i++) {
        const brightness = i === 0 ? 1.0 : Math.max(0.1, 1.0 - (i / length) * 0.9);
        drops.push({
          x: columnX,
          y: startY - i * (CHAR_SIZE / 4),
          speed,
          length,
          charIndex: Math.floor(Math.random() * MATRIX_CHARS.length),
          brightness: i < length ? brightness : 0,
          changeTimer: Math.random() * 100,
        });
      }
    }

    // ========== Geometry ==========
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalDrops * 3);
    const charIndices = new Float32Array(totalDrops);
    const brightnesses = new Float32Array(totalDrops);
    const sizes = new Float32Array(totalDrops);

    // 초기값 설정
    for (let i = 0; i < totalDrops; i++) {
      const drop = drops[i];
      positions[i * 3] = drop.x;
      positions[i * 3 + 1] = drop.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // 약간의 깊이 변화
      charIndices[i] = drop.charIndex;
      brightnesses[i] = drop.brightness;
      sizes[i] = CHAR_SIZE * (0.8 + Math.random() * 0.4);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("charIndex", new THREE.BufferAttribute(charIndices, 1));
    geometry.setAttribute("brightness", new THREE.BufferAttribute(brightnesses, 1));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // ========== Material ==========
    const material = new THREE.ShaderMaterial({
      uniforms: {
        charAtlas: { value: charAtlas },
        charCount: { value: charCount },
        charsPerRow: { value: charsPerRow },
        time: { value: 0 },
      },
      vertexShader: MATRIX_VERTEX_SHADER,
      fragmentShader: MATRIX_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ========== Post-processing ==========
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // ========== Animation ==========
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      material.uniforms.time.value = time;

      const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const charIndexAttr = geometry.getAttribute("charIndex") as THREE.BufferAttribute;
      const brightnessAttr = geometry.getAttribute("brightness") as THREE.BufferAttribute;

      // 각 드롭 업데이트
      for (let col = 0; col < COLUMN_COUNT; col++) {
        const baseIdx = col * MAX_DROPS_PER_COLUMN;
        const firstDrop = drops[baseIdx];

        // 열 전체를 아래로 이동
        const moveAmount = firstDrop.speed * delta * 60;

        for (let i = 0; i < MAX_DROPS_PER_COLUMN; i++) {
          const idx = baseIdx + i;
          const drop = drops[idx];

          drop.y -= moveAmount;
          positionAttr.setY(idx, drop.y);

          // 문자 변경 타이머
          drop.changeTimer -= delta * 60;
          if (drop.changeTimer <= 0) {
            drop.charIndex = Math.floor(Math.random() * MATRIX_CHARS.length);
            charIndexAttr.setX(idx, drop.charIndex);
            drop.changeTimer = 20 + Math.random() * 80;
          }
        }

        // 헤드(첫 번째 드롭)가 화면 아래로 나가면 리셋
        if (drops[baseIdx].y < -halfHeight - 50) {
          // 새로운 시작점
          const newStartY = halfHeight + Math.random() * 100;
          const newSpeed = (0.5 + Math.random() * 1.5) * speedMultiplier;
          const newLength = 5 + Math.floor(Math.random() * 15);

          for (let i = 0; i < MAX_DROPS_PER_COLUMN; i++) {
            const idx = baseIdx + i;
            const drop = drops[idx];

            drop.y = newStartY - i * (CHAR_SIZE / 4);
            drop.speed = newSpeed;
            drop.length = newLength;
            drop.brightness = i === 0 ? 1.0 : (i < newLength ? Math.max(0.1, 1.0 - (i / newLength) * 0.9) : 0);
            drop.charIndex = Math.floor(Math.random() * MATRIX_CHARS.length);

            positionAttr.setY(idx, drop.y);
            charIndexAttr.setX(idx, drop.charIndex);
            brightnessAttr.setX(idx, drop.brightness);
          }
        }
      }

      positionAttr.needsUpdate = true;
      charIndexAttr.needsUpdate = true;

      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // ========== Resize Handler ==========
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ========== Cleanup ==========
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      mountElement.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      charAtlas.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [bloomStrength, bloomRadius, bloomThreshold, speedMultiplier]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
