/**
 * MatrixRainCanvas - Matrix Digital Rain Effect
 *
 * 영화 《매트릭스》의 인트로에서 등장하는 디지털 비(Digital Rain) 효과
 * - 검은 배경 위에 녹색 문자들이 세로로 흘러내림
 * - 가타카나, 숫자, 라틴 문자 조합
 * - 각 열의 속도와 길이가 랜덤
 * - 가장 밝은 머리 부분과 점점 흐려지는 꼬리
 * - 호버 시 문자들이 모여서 텍스트/SVG 형태를 만듦
 * - Parallax 깊이감 + 페이드 인/아웃 라이프사이클
 * - Three.js Points + CanvasTexture 기반 렌더링
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useParticleBackground } from "./ParticleContext";
import { generatePointsFromContent } from "./canvasUtils";
import { PARTICLE_COUNT, MORPH_IN_SPEED, MORPH_OUT_SPEED } from "./constants";

// ==================== Constants ====================
const COLUMN_COUNT = 70; // 열 개수
const CHAR_SIZE = 24; // 문자 크기 (px) - 가독성 향상
const TEXTURE_SIZE = 96; // 텍스처 해상도 - 고해상도
const TRANSITION_SPEED = 0.015; // 형태 전환 속도
const DEPTH_LAYERS = 5; // 깊이 레이어 수
const MAX_DEPTH = 80; // 최대 Z 깊이

// 매트릭스 문자셋: 가타카나 + 숫자 + 일부 라틴 문자
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ" +
  "§±×÷≠≈∞∑∏√∫";

// ==================== Helper Functions ====================
function createCharAtlas(): { texture: THREE.CanvasTexture; charCount: number } {
  const charsPerRow = 16;
  const rows = Math.ceil(MATRIX_CHARS.length / charsPerRow);
  const atlasSize = charsPerRow * TEXTURE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasSize;
  canvas.height = rows * TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 폰트 설정 - 고해상도 선명한 렌더링
  const fontSize = TEXTURE_SIZE * 0.8;
  ctx.font = `bold ${fontSize}px "MS Gothic", "Meiryo", "Hiragino Kaku Gothic Pro", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < MATRIX_CHARS.length; i++) {
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    const x = col * TEXTURE_SIZE + TEXTURE_SIZE / 2;
    const y = row * TEXTURE_SIZE + TEXTURE_SIZE / 2;

    // 외곽 글로우 (여러 레이어)
    ctx.shadowColor = "rgba(0, 255, 70, 1)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgb(0, 255, 70)";
    ctx.fillText(MATRIX_CHARS[i], x, y);

    // 중간 레이어
    ctx.shadowBlur = 6;
    ctx.fillText(MATRIX_CHARS[i], x, y);

    // 선명한 중심
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgb(150, 255, 150)";
    ctx.fillText(MATRIX_CHARS[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, charCount: MATRIX_CHARS.length };
}

// ==================== Vertex Shader ====================
const MATRIX_VERTEX_SHADER = `
  attribute float charIndex;
  attribute float brightness;
  attribute float size;
  attribute float columnIndex;
  attribute float posInColumn;
  attribute float depthLayer;
  attribute float fadeProgress;
  attribute vec3 targetPos;
  attribute vec3 prevTargetPos;

  uniform float time;
  uniform float morphProgress;
  uniform float transitionProgress;
  uniform float collisionRadius;

  varying float vBrightness;
  varying float vCharIndex;
  varying float vMorphProgress;
  varying float vDepthLayer;
  varying float vFadeProgress;
  varying float vIsHead;
  varying float vCollision;

  // Smooth easing
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // 현재 타겟 위치 (전환 중일 때 보간)
    float easedTransition = easeInOutCubic(transitionProgress);
    vec3 currentTarget = mix(prevTargetPos, targetPos, easedTransition);

    // 비는 원래 위치에서 계속 떨어짐 (이동하지 않음)
    vec3 finalPos = position;

    // 머리 여부 판단
    float isHead = step(0.92, brightness);
    vIsHead = isHead;

    // 충돌 감지: 현재 위치가 타겟 위치 근처인지 확인
    // XY 평면에서의 거리 (Z는 무시 - 깊이가 다를 수 있음)
    float distToTarget = length(finalPos.xy - currentTarget.xy);

    // 충돌 강도 (가까울수록 1에 가까움)
    float collision = smoothstep(collisionRadius, 0.0, distToTarget) * morphProgress;
    vCollision = collision;

    // 기본 밝기
    float finalBrightness = brightness;

    // 충돌 시 밝기 증가
    finalBrightness = mix(finalBrightness, 1.0, collision * 0.8);

    // 페이드 효과 적용
    finalBrightness *= fadeProgress;

    vBrightness = finalBrightness;
    vCharIndex = charIndex;
    vMorphProgress = morphProgress;
    vDepthLayer = depthLayer;
    vFadeProgress = fadeProgress;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 파티클 크기
    float depthSize = 1.0 - depthLayer * 0.1;
    float headSize = 1.0 + isHead * 0.3;
    // 충돌 시 약간 커짐
    float collisionSize = 1.0 + collision * 0.5;
    gl_PointSize = size * depthSize * headSize * collisionSize * (300.0 / -mvPosition.z);
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
  varying float vMorphProgress;
  varying float vDepthLayer;
  varying float vFadeProgress;
  varying float vIsHead;
  varying float vCollision;

  void main() {
    // 원형 마스크 (더 부드러운 가장자리)
    vec2 uv = gl_PointCoord;
    float dist = length(uv - 0.5);
    if (dist > 0.48) discard;

    // 아틀라스에서 문자 샘플링
    float charIdx = floor(vCharIndex);
    float col = mod(charIdx, charsPerRow);
    float row = floor(charIdx / charsPerRow);

    vec2 atlasUV = vec2(
      (col + uv.x) / charsPerRow,
      (row + uv.y) / ceil(charCount / charsPerRow)
    );

    vec4 texColor = texture2D(charAtlas, atlasUV);

    // 색상 정의
    vec3 matrixGreen = vec3(0.0, 1.0, 0.27);
    vec3 brightGreen = vec3(0.4, 1.0, 0.5);
    vec3 headWhite = vec3(0.9, 1.0, 0.95);
    vec3 headGlow = vec3(0.7, 1.0, 0.8);
    vec3 collisionWhite = vec3(1.0, 1.0, 1.0);

    vec3 color;

    // 머리 문자: 강한 흰색/밝은 녹색 발광
    if (vIsHead > 0.5) {
      // 깜빡이는 머리 효과
      float headFlicker = 0.85 + 0.15 * sin(time * 15.0 + vCharIndex * 1.618);
      color = mix(headGlow, headWhite, headFlicker);
      // 추가 글로우
      color += vec3(0.2, 0.3, 0.25) * headFlicker;
    } else {
      // 꼬리: 녹색 그라데이션
      color = mix(matrixGreen * 0.2, brightGreen, vBrightness);
    }

    // 깊이에 따른 색상 감쇠 (뒤쪽은 더 어두움)
    float depthDim = 1.0 - vDepthLayer * 0.25;
    color *= depthDim;

    // 충돌 시 강한 발광 효과 (형태가 드러남)
    if (vCollision > 0.01) {
      // 충돌 강도에 따라 흰색/밝은 녹색으로
      vec3 collisionColor = mix(brightGreen, collisionWhite, vCollision * 0.7);
      color = mix(color, collisionColor, vCollision);
      // 충돌 시 빠른 깜빡임
      float collisionFlicker = 0.8 + 0.2 * sin(time * 25.0 + vCharIndex * 2.0);
      color *= collisionFlicker;
    }

    // 빠른 깜빡임 효과 (머리가 아닌 문자, 충돌이 아닐 때)
    if (vIsHead < 0.5 && vCollision < 0.1) {
      float flicker = 0.88 + 0.12 * sin(time * 12.0 + vCharIndex * 3.14159);
      color *= flicker;
    }

    // 알파 계산
    float alpha = texColor.a * vBrightness * 1.6;
    alpha *= 1.0 - smoothstep(0.35, 0.48, dist);

    // 머리는 더 강한 알파
    if (vIsHead > 0.5) {
      alpha *= 1.6;
    }

    // 충돌 시 알파 강화 (형태가 더 선명하게)
    alpha = mix(alpha, min(alpha * 2.0, 1.0), vCollision);

    // 페이드 효과
    alpha *= vFadeProgress;

    // 깊이에 따른 알파 감쇠
    alpha *= depthDim;

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
  bloomStrength = 1.0,
  bloomRadius = 0.6,
  bloomThreshold = 0.15,
  speedMultiplier = 1.0,
}: MatrixRainCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef, contentRef, contentVersion } = useParticleBackground();
  const morphProgressRef = useRef(0);
  const transitionProgressRef = useRef(1);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Content 변경 시 타겟 포지션 업데이트
  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;

    const currentTargetPos = geometry.getAttribute("targetPos");
    if (currentTargetPos) {
      geometry.setAttribute(
        "prevTargetPos",
        new THREE.BufferAttribute(new Float32Array(currentTargetPos.array), 3)
      );
    }

    geometry.setAttribute(
      "targetPos",
      new THREE.BufferAttribute(
        generatePointsFromContent(contentRef.current),
        3
      )
    );

    transitionProgressRef.current = 0;
  }, [contentVersion, contentRef]);

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
    const fovRad = (60 * Math.PI) / 180;
    const halfHeight = Math.tan(fovRad / 2) * 200;
    const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);

    const columnWidth = (halfWidth * 2) / COLUMN_COUNT;
    const maxDropsPerColumn = Math.ceil(PARTICLE_COUNT / COLUMN_COUNT);

    // ========== Initialize Particles ==========
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const charIndices = new Float32Array(PARTICLE_COUNT);
    const brightnesses = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const columnIndices = new Float32Array(PARTICLE_COUNT);
    const posInColumns = new Float32Array(PARTICLE_COUNT);
    const depthLayers = new Float32Array(PARTICLE_COUNT);
    const fadeProgresses = new Float32Array(PARTICLE_COUNT);

    // 각 열의 속도와 길이 정보
    const columnSpeeds: number[] = [];
    const columnLengths: number[] = [];
    const columnStartY: number[] = [];
    const columnDepths: number[] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      columnSpeeds.push((0.4 + Math.random() * 1.8) * speedMultiplier);
      columnLengths.push(6 + Math.floor(Math.random() * 16));
      columnStartY.push(halfHeight + Math.random() * halfHeight * 2);
      // 깊이 레이어 랜덤 할당
      columnDepths.push(Math.floor(Math.random() * DEPTH_LAYERS));
    }

    // 파티클 초기화
    let particleIndex = 0;
    for (let col = 0; col < COLUMN_COUNT && particleIndex < PARTICLE_COUNT; col++) {
      const columnX = -halfWidth + col * columnWidth + columnWidth / 2;
      const length = columnLengths[col];
      const startY = columnStartY[col];
      const depth = columnDepths[col];

      for (let i = 0; i < maxDropsPerColumn && particleIndex < PARTICLE_COUNT; i++) {
        const idx = particleIndex;
        const i3 = idx * 3;

        // X: 열 중심 + 약간의 랜덤
        positions[i3] = columnX + (Math.random() - 0.5) * 3;
        // Y: 시작점에서 아래로
        positions[i3 + 1] = startY - i * (CHAR_SIZE / 3.2);
        // Z: 깊이 레이어에 따라 (Parallax)
        positions[i3 + 2] = -depth * (MAX_DEPTH / DEPTH_LAYERS) + (Math.random() - 0.5) * 5;

        charIndices[idx] = Math.floor(Math.random() * MATRIX_CHARS.length);

        // 밝기: 머리는 1.0, 꼬리로 갈수록 감소
        const brightness = i === 0 ? 1.0 : (i < length ? Math.max(0.1, 1.0 - (i / length) * 0.9) : 0.05);
        brightnesses[idx] = brightness;

        sizes[idx] = CHAR_SIZE * (0.8 + Math.random() * 0.4);
        columnIndices[idx] = col;
        posInColumns[idx] = i;
        depthLayers[idx] = depth / DEPTH_LAYERS; // 0~1 정규화

        // 초기 페이드: 이미 나타난 상태 또는 페이드인 중
        fadeProgresses[idx] = i < length ? 1.0 : 0.0;

        particleIndex++;
      }
    }

    // ========== Geometry ==========
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("charIndex", new THREE.BufferAttribute(charIndices, 1));
    geometry.setAttribute("brightness", new THREE.BufferAttribute(brightnesses, 1));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("columnIndex", new THREE.BufferAttribute(columnIndices, 1));
    geometry.setAttribute("posInColumn", new THREE.BufferAttribute(posInColumns, 1));
    geometry.setAttribute("depthLayer", new THREE.BufferAttribute(depthLayers, 1));
    geometry.setAttribute("fadeProgress", new THREE.BufferAttribute(fadeProgresses, 1));

    // 타겟 포지션 초기화
    const initialTargetPos = generatePointsFromContent(contentRef.current);
    geometry.setAttribute("targetPos", new THREE.BufferAttribute(initialTargetPos, 3));
    geometry.setAttribute("prevTargetPos", new THREE.BufferAttribute(new Float32Array(initialTargetPos), 3));

    geometryRef.current = geometry;

    // ========== Material ==========
    const material = new THREE.ShaderMaterial({
      uniforms: {
        charAtlas: { value: charAtlas },
        charCount: { value: charCount },
        charsPerRow: { value: charsPerRow },
        time: { value: 0 },
        morphProgress: { value: 0 },
        transitionProgress: { value: 1 },
        collisionRadius: { value: 15.0 }, // 충돌 감지 반경
      },
      vertexShader: MATRIX_VERTEX_SHADER,
      fragmentShader: MATRIX_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;

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

    // 문자 변경 타이머 (머리는 더 빈번하게)
    const charChangeTimers = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      charChangeTimers[i] = Math.random() * 50;
    }

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      material.uniforms.time.value = time;

      // 모핑 진행도 업데이트
      const morphSpeed =
        targetMorphRef.current > morphProgressRef.current
          ? MORPH_IN_SPEED
          : MORPH_OUT_SPEED;
      morphProgressRef.current +=
        (targetMorphRef.current - morphProgressRef.current) * morphSpeed;
      material.uniforms.morphProgress.value = morphProgressRef.current;

      // 전환 진행도
      transitionProgressRef.current +=
        (1 - transitionProgressRef.current) * TRANSITION_SPEED;
      material.uniforms.transitionProgress.value = transitionProgressRef.current;

      // 비는 항상 떨어짐 (모핑 여부와 관계없이)
      {
        const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
        const charIndexAttr = geometry.getAttribute("charIndex") as THREE.BufferAttribute;
        const brightnessAttr = geometry.getAttribute("brightness") as THREE.BufferAttribute;
        const fadeAttr = geometry.getAttribute("fadeProgress") as THREE.BufferAttribute;
        const depthLayerAttr = geometry.getAttribute("depthLayer") as THREE.BufferAttribute;

        for (let col = 0; col < COLUMN_COUNT; col++) {
          const speed = columnSpeeds[col];
          const length = columnLengths[col];
          const depth = columnDepths[col];
          // Parallax: 깊이에 따른 속도 차이
          const depthSpeedFactor = 1.0 - (depth / DEPTH_LAYERS) * 0.4;
          const moveAmount = speed * depthSpeedFactor * delta * 50;

          const startIdx = col * maxDropsPerColumn;
          const endIdx = Math.min(startIdx + maxDropsPerColumn, PARTICLE_COUNT);

          // 열 전체 이동
          let headY = -Infinity;
          for (let idx = startIdx; idx < endIdx; idx++) {
            const posInCol = idx - startIdx;
            const newY = positionAttr.getY(idx) - moveAmount;
            positionAttr.setY(idx, newY);

            if (posInCol === 0) {
              headY = newY;
            }

            // 문자 변경 (머리는 더 빈번하게)
            const isHead = posInCol === 0;
            const changeSpeed = isHead ? 3.0 : 1.0;
            charChangeTimers[idx] -= delta * 60 * changeSpeed;

            if (charChangeTimers[idx] <= 0) {
              charIndexAttr.setX(idx, Math.floor(Math.random() * MATRIX_CHARS.length));
              // 머리는 더 짧은 간격
              charChangeTimers[idx] = isHead ? (3 + Math.random() * 8) : (10 + Math.random() * 40);
            }

            // 페이드 인/아웃 업데이트
            const currentFade = fadeAttr.getX(idx);
            const targetFade = posInCol < length ? 1.0 : 0.0;
            const fadeSpeed = 3.0 * delta;
            const newFade = currentFade + (targetFade - currentFade) * fadeSpeed;
            fadeAttr.setX(idx, newFade);
          }

          // 머리가 화면 아래로 나가면 리셋
          if (headY < -halfHeight - 120) {
            const newStartY = halfHeight + 60 + Math.random() * 120;
            const newLength = 6 + Math.floor(Math.random() * 16);
            const newDepth = Math.floor(Math.random() * DEPTH_LAYERS);
            columnLengths[col] = newLength;
            columnSpeeds[col] = (0.4 + Math.random() * 1.8) * speedMultiplier;
            columnDepths[col] = newDepth;

            for (let i = 0; i < maxDropsPerColumn && startIdx + i < PARTICLE_COUNT; i++) {
              const idx = startIdx + i;
              const columnX = -halfWidth + col * columnWidth + columnWidth / 2;

              positionAttr.setX(idx, columnX + (Math.random() - 0.5) * 3);
              positionAttr.setY(idx, newStartY - i * (CHAR_SIZE / 3.2));
              positionAttr.setZ(idx, -newDepth * (MAX_DEPTH / DEPTH_LAYERS) + (Math.random() - 0.5) * 5);

              charIndexAttr.setX(idx, Math.floor(Math.random() * MATRIX_CHARS.length));

              const brightness = i === 0 ? 1.0 : (i < newLength ? Math.max(0.1, 1.0 - (i / newLength) * 0.9) : 0.05);
              brightnessAttr.setX(idx, brightness);

              depthLayerAttr.setX(idx, newDepth / DEPTH_LAYERS);

              // 새로 나타나는 문자는 페이드 인
              fadeAttr.setX(idx, i === 0 ? 0.3 : 0.0);
            }
          }
        }

        positionAttr.needsUpdate = true;
        charIndexAttr.needsUpdate = true;
        brightnessAttr.needsUpdate = true;
        fadeAttr.needsUpdate = true;
        depthLayerAttr.needsUpdate = true;
      }

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
      geometryRef.current = null;
      materialRef.current = null;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      mountElement.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      charAtlas.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [targetMorphRef, contentRef, bloomStrength, bloomRadius, bloomThreshold, speedMultiplier]);

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
