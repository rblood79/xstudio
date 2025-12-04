/**
 * MatrixRainCanvas - Matrix Digital Rain Effect
 *
 * 영화 《매트릭스》의 인트로에서 등장하는 디지털 비(Digital Rain) 효과
 * - 검은 배경 위에 녹색 문자들이 세로로 흘러내림
 * - 가타카나, 숫자, 라틴 문자 조합
 * - 각 열의 속도와 길이가 랜덤
 * - 가장 밝은 머리 부분과 점점 흐려지는 꼬리
 * - 호버 시 문자들이 모여서 텍스트/SVG 형태를 만듦
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
const COLUMN_COUNT = 60; // 열 개수
const CHAR_SIZE = 20; // 문자 크기 (px)
const TEXTURE_SIZE = 64; // 텍스처 크기
const TRANSITION_SPEED = 0.015; // 형태 전환 속도

// 매트릭스 문자셋: 가타카나 + 숫자 + 일부 라틴 문자
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

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
  attribute float columnIndex;
  attribute float posInColumn;
  attribute vec3 targetPos;
  attribute vec3 prevTargetPos;

  uniform float time;
  uniform float morphProgress;
  uniform float transitionProgress;

  varying float vBrightness;
  varying float vCharIndex;
  varying float vMorphProgress;

  // Simplex noise for organic movement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Smooth easing
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // 현재 타겟 위치 (전환 중일 때 보간)
    float easedTransition = easeInOutCubic(transitionProgress);
    vec3 currentTarget = mix(prevTargetPos, targetPos, easedTransition);

    // 기본 위치 (떨어지는 비)
    vec3 rainPos = position;

    // 모핑 시 타겟을 향해 이동하는 동안의 유동적 움직임
    float easedMorph = easeInOutCubic(morphProgress);

    // 모핑 중 노이즈 기반 흐름
    vec3 noiseOffset = vec3(0.0);
    if (morphProgress > 0.01 && morphProgress < 0.99) {
      float noiseScale = 0.02;
      vec3 noisePos = rainPos * noiseScale + vec3(time * 0.3, 0.0, 0.0);
      noiseOffset.x = snoise(noisePos) * 15.0 * (1.0 - easedMorph);
      noiseOffset.y = snoise(noisePos + vec3(100.0, 0.0, 0.0)) * 15.0 * (1.0 - easedMorph);
      noiseOffset.z = snoise(noisePos + vec3(0.0, 100.0, 0.0)) * 5.0 * (1.0 - easedMorph);
    }

    // 최종 위치: 비 위치와 타겟 위치 사이를 보간
    vec3 finalPos = mix(rainPos + noiseOffset, currentTarget, easedMorph);

    // 형태 유지 시 미세한 움직임 (호흡 효과)
    if (morphProgress > 0.8) {
      float aliveIntensity = (morphProgress - 0.8) * 5.0;
      float breathe = sin(time * 1.5 + columnIndex * 0.5 + posInColumn * 0.3) * 2.0;
      finalPos += normalize(currentTarget) * breathe * aliveIntensity * 0.3;

      // 잔물결
      vec3 ripple = vec3(
        snoise(currentTarget * 0.03 + vec3(time * 0.4, 0.0, 0.0)),
        snoise(currentTarget * 0.03 + vec3(0.0, time * 0.4, 0.0)),
        0.0
      ) * 2.0;
      finalPos += ripple * aliveIntensity;
    }

    // 밝기 조정: 모핑 시 전체적으로 밝아짐
    float finalBrightness = brightness;
    if (morphProgress > 0.5) {
      finalBrightness = mix(brightness, 0.8 + brightness * 0.2, (morphProgress - 0.5) * 2.0);
    }

    vBrightness = finalBrightness;
    vCharIndex = charIndex;
    vMorphProgress = morphProgress;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 파티클 크기 (모핑 시 약간 커짐)
    float morphSize = 1.0 + morphProgress * 0.3;
    gl_PointSize = size * morphSize * (300.0 / -mvPosition.z);
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

  void main() {
    // 원형 마스크
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

    // 색상: 녹색 그라데이션 + 머리는 흰색
    vec3 matrixGreen = vec3(0.0, 1.0, 0.27);
    vec3 brightGreen = vec3(0.4, 1.0, 0.5);
    vec3 headWhite = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (vBrightness > 0.92) {
      color = headWhite;
    } else {
      color = mix(matrixGreen * 0.3, brightGreen, vBrightness);
    }

    // 모핑 시 더 밝은 녹색으로
    if (vMorphProgress > 0.5) {
      vec3 morphColor = mix(matrixGreen, brightGreen, vBrightness);
      color = mix(color, morphColor, (vMorphProgress - 0.5) * 2.0);
    }

    // 깜빡임 효과
    float flicker = 0.92 + 0.08 * sin(time * 8.0 + vCharIndex * 2.71828);
    color *= flicker;

    // 알파
    float alpha = texColor.a * vBrightness * 1.3;
    alpha *= 1.0 - smoothstep(0.35, 0.5, dist);

    // 모핑 시 알파 증가
    alpha *= 1.0 + vMorphProgress * 0.3;

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

    // 각 열의 속도와 길이 정보
    const columnSpeeds: number[] = [];
    const columnLengths: number[] = [];
    const columnStartY: number[] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      columnSpeeds.push((0.5 + Math.random() * 1.5) * speedMultiplier);
      columnLengths.push(8 + Math.floor(Math.random() * 12));
      columnStartY.push(halfHeight + Math.random() * halfHeight * 2);
    }

    // 파티클 초기화
    let particleIndex = 0;
    for (let col = 0; col < COLUMN_COUNT && particleIndex < PARTICLE_COUNT; col++) {
      const columnX = -halfWidth + col * columnWidth + columnWidth / 2;
      const length = columnLengths[col];
      const startY = columnStartY[col];

      for (let i = 0; i < maxDropsPerColumn && particleIndex < PARTICLE_COUNT; i++) {
        const idx = particleIndex;
        const i3 = idx * 3;

        positions[i3] = columnX + (Math.random() - 0.5) * 2;
        positions[i3 + 1] = startY - i * (CHAR_SIZE / 3.5);
        positions[i3 + 2] = (Math.random() - 0.5) * 10;

        charIndices[idx] = Math.floor(Math.random() * MATRIX_CHARS.length);

        // 밝기: 머리는 1.0, 꼬리로 갈수록 감소
        const brightness = i === 0 ? 1.0 : (i < length ? Math.max(0.15, 1.0 - (i / length) * 0.85) : 0.1);
        brightnesses[idx] = brightness;

        sizes[idx] = CHAR_SIZE * (0.85 + Math.random() * 0.3);
        columnIndices[idx] = col;
        posInColumns[idx] = i;

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

    // 문자 변경 타이머
    const charChangeTimers = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      charChangeTimers[i] = Math.random() * 100;
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

      // 모핑 중이 아닐 때만 비 애니메이션
      if (morphProgressRef.current < 0.1) {
        const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
        const charIndexAttr = geometry.getAttribute("charIndex") as THREE.BufferAttribute;
        const brightnessAttr = geometry.getAttribute("brightness") as THREE.BufferAttribute;

        for (let col = 0; col < COLUMN_COUNT; col++) {
          const speed = columnSpeeds[col];
          const length = columnLengths[col];
          const moveAmount = speed * delta * 55;

          const startIdx = col * maxDropsPerColumn;
          const endIdx = Math.min(startIdx + maxDropsPerColumn, PARTICLE_COUNT);

          // 열 전체 이동
          let headY = -Infinity;
          for (let idx = startIdx; idx < endIdx; idx++) {
            const newY = positionAttr.getY(idx) - moveAmount;
            positionAttr.setY(idx, newY);

            if (idx === startIdx) {
              headY = newY;
            }

            // 문자 변경
            charChangeTimers[idx] -= delta * 60;
            if (charChangeTimers[idx] <= 0) {
              charIndexAttr.setX(idx, Math.floor(Math.random() * MATRIX_CHARS.length));
              charChangeTimers[idx] = 15 + Math.random() * 60;
            }
          }

          // 머리가 화면 아래로 나가면 리셋
          if (headY < -halfHeight - 100) {
            const newStartY = halfHeight + 50 + Math.random() * 100;
            const newLength = 8 + Math.floor(Math.random() * 12);
            columnLengths[col] = newLength;
            columnSpeeds[col] = (0.5 + Math.random() * 1.5) * speedMultiplier;

            for (let i = 0; i < maxDropsPerColumn && startIdx + i < PARTICLE_COUNT; i++) {
              const idx = startIdx + i;
              const columnX = -halfWidth + col * columnWidth + columnWidth / 2;

              positionAttr.setX(idx, columnX + (Math.random() - 0.5) * 2);
              positionAttr.setY(idx, newStartY - i * (CHAR_SIZE / 3.5));
              charIndexAttr.setX(idx, Math.floor(Math.random() * MATRIX_CHARS.length));

              const brightness = i === 0 ? 1.0 : (i < newLength ? Math.max(0.15, 1.0 - (i / newLength) * 0.85) : 0.1);
              brightnessAttr.setX(idx, brightness);
            }
          }
        }

        positionAttr.needsUpdate = true;
        charIndexAttr.needsUpdate = true;
        brightnessAttr.needsUpdate = true;
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
