/**
 * MondrianArtCanvas - 몬드리안 Composition 텍스트 파티클 스타일
 *
 * 텍스트 문자 파티클이 몬드리안 스타일의 사각형 영역을 채워 그림을 표현합니다.
 * - 황금비 기반 재귀적 분할
 * - 빨강, 파랑, 노랑, 흰색, 검정 색상의 문자 파티클
 * - Code 모드와 동일한 문자셋 사용
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ==================== 상수 ====================
const PHI = 1.618033988749895; // 황금비
const DEFAULT_DEPTH = 6; // 분할 깊이
const MIN_CELL_SIZE = 60; // 최소 셀 크기 (px)
const PARTICLE_SIZE = 12.0; // 파티클 크기 (겹침 방지를 위해 고정)
const PARTICLE_SPACING = 14.0; // 파티클 간격 (겹침 방지)
const REGENERATE_INTERVAL = 12000; // 재생성 주기 (ms)
const TRANSITION_DURATION = 3000; // 전환 시간 (ms)
const MAX_DELAY = 1500; // 최대 랜덤 딜레이 (ms)
const LINE_WIDTH = 4; // 검정 선 두께
const TEXTURE_CHAR_SIZE = 64; // 텍스처 해상도

// ==================== 문자셋 (Code 모드와 동일) ====================
const KOREAN_CONSONANTS = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ";
const KOREAN_VOWELS = "ㅏㅓㅗㅜㅡㅣㅐㅔㅑㅕ";
const KOREAN_SYLLABLES = (() => {
  let result = "";
  for (const c of KOREAN_CONSONANTS) {
    for (const v of KOREAN_VOWELS) {
      const code = 0xac00 + (c.charCodeAt(0) - 0x3131) * 588 + (v.charCodeAt(0) - 0x314f) * 28;
      if (code >= 0xac00 && code <= 0xd7a3) {
        result += String.fromCharCode(code);
      }
    }
  }
  return result;
})();

const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const GREEK = "αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";
const CYRILLIC = "абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const MATH_SYMBOLS = "∀∂∃∅∇∈∉∋∏∑√∝∞∠∧∨∩∪∫≈≠≡≤≥⊂⊃⊆⊇⊕⊗";

const CODE_CHARS =
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz" +
  "{}[]()<>+-*/=!?;:.,@#$%^&|~`_\\\"'" +
  HIRAGANA + KATAKANA +
  KOREAN_CONSONANTS + KOREAN_VOWELS + KOREAN_SYLLABLES +
  GREEK + CYRILLIC + MATH_SYMBOLS;

// ==================== 색상 팔레트 ====================
const MONDRIAN_COLORS = {
  red: new THREE.Color(0xcc2222),
  blue: new THREE.Color(0x1a1acc),
  yellow: new THREE.Color(0xe8d820),
  white: new THREE.Color(0xf5f5f0),
  black: new THREE.Color(0x1a1a1a),
};

const COLOR_WEIGHTS = [
  { color: "white", weight: 0.50 },
  { color: "red", weight: 0.15 },
  { color: "blue", weight: 0.15 },
  { color: "yellow", weight: 0.14 },
  { color: "black", weight: 0.06 },
];

// ==================== 타입 ====================
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: THREE.Color;
}

interface MondrianArtCanvasProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}

// ==================== 문자 텍스처 아틀라스 생성 ====================
function createCharacterAtlas(): THREE.CanvasTexture {
  const charsPerRow = 16;
  const rows = Math.ceil(CODE_CHARS.length / charsPerRow);
  const atlasWidth = charsPerRow * TEXTURE_CHAR_SIZE;
  const atlasHeight = rows * TEXTURE_CHAR_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  ctx.font = `bold ${TEXTURE_CHAR_SIZE * 0.7}px "Fira Code", "Source Code Pro", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < CODE_CHARS.length; i++) {
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    const x = col * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;
    const y = row * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;

    // 흰색으로 렌더링 (셰이더에서 색상 적용)
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
    ctx.shadowBlur = 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(CODE_CHARS[i], x, y);

    ctx.shadowBlur = 0;
    ctx.fillText(CODE_CHARS[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

// ==================== 유틸리티 함수 ====================
function pickWeightedColor(): THREE.Color {
  const totalWeight = COLOR_WEIGHTS.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { color, weight } of COLOR_WEIGHTS) {
    random -= weight;
    if (random <= 0) {
      return MONDRIAN_COLORS[color as keyof typeof MONDRIAN_COLORS].clone();
    }
  }

  return MONDRIAN_COLORS.white.clone();
}

function generateMondrianGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  minSize: number = MIN_CELL_SIZE
): Rectangle[] {
  if (depth === 0 || width < minSize * 1.5 || height < minSize * 1.5) {
    return [{ x, y, width, height, color: pickWeightedColor() }];
  }

  const skipProbability = Math.max(0, (DEFAULT_DEPTH - depth) * 0.1);
  if (Math.random() < skipProbability) {
    return [{ x, y, width, height, color: pickWeightedColor() }];
  }

  const aspectRatio = width / height;
  const vertical =
    aspectRatio > 1.2
      ? Math.random() > 0.2
      : aspectRatio < 0.8
        ? Math.random() > 0.8
        : Math.random() > 0.5;

  if (vertical) {
    const useGoldenRatio = Math.random() > 0.4;
    const ratio = useGoldenRatio
      ? Math.random() > 0.5 ? 1 / PHI : 1 - 1 / PHI
      : Math.random() * 0.4 + 0.3;
    const split = width * ratio;

    return [
      ...generateMondrianGrid(x, y, split - LINE_WIDTH / 2, height, depth - 1, minSize),
      ...generateMondrianGrid(x + split + LINE_WIDTH / 2, y, width - split - LINE_WIDTH / 2, height, depth - 1, minSize),
    ];
  } else {
    const useGoldenRatio = Math.random() > 0.4;
    const ratio = useGoldenRatio
      ? Math.random() > 0.5 ? 1 / PHI : 1 - 1 / PHI
      : Math.random() * 0.4 + 0.3;
    const split = height * ratio;

    return [
      ...generateMondrianGrid(x, y, width, split - LINE_WIDTH / 2, depth - 1, minSize),
      ...generateMondrianGrid(x, y + split + LINE_WIDTH / 2, width, height - split - LINE_WIDTH / 2, depth - 1, minSize),
    ];
  }
}

// 사각형 영역 내에 파티클 위치 생성 (그리드 기반, 겹침 방지)
function generateParticlesForRectangles(
  rectangles: Rectangle[],
  screenWidth: number,
  screenHeight: number
): { positions: Float32Array; colors: Float32Array; charIndices: Float32Array; count: number } {
  const allParticles: { x: number; y: number; color: THREE.Color; charIndex: number }[] = [];

  for (const rect of rectangles) {
    const padding = LINE_WIDTH + PARTICLE_SIZE / 2;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    if (availableWidth < PARTICLE_SPACING || availableHeight < PARTICLE_SPACING) continue;

    // 그리드 기반 배치 (겹침 방지)
    const cols = Math.floor(availableWidth / PARTICLE_SPACING);
    const rows = Math.floor(availableHeight / PARTICLE_SPACING);

    // 실제 간격 계산 (영역에 맞게 균등 분배)
    const actualSpacingX = availableWidth / Math.max(1, cols);
    const actualSpacingY = availableHeight / Math.max(1, rows);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // 그리드 위치 (회전 없이 고정)
        const px = rect.x + padding + col * actualSpacingX + actualSpacingX / 2;
        const py = rect.y + padding + row * actualSpacingY + actualSpacingY / 2;

        const x = px - screenWidth / 2;
        const y = -(py - screenHeight / 2);

        const charIndex = Math.floor(Math.random() * CODE_CHARS.length);

        allParticles.push({ x, y, color: rect.color, charIndex });
      }
    }
  }

  const count = allParticles.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const charIndices = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = allParticles[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;

    colors[i * 3] = p.color.r;
    colors[i * 3 + 1] = p.color.g;
    colors[i * 3 + 2] = p.color.b;

    charIndices[i] = p.charIndex;
  }

  return { positions, colors, charIndices, count };
}

// ==================== Shader ====================
const MONDRIAN_VERTEX_SHADER = `
  attribute vec3 color;
  attribute float opacity;
  attribute float size;
  attribute float charIndex;
  attribute vec3 targetPosition;
  attribute vec3 targetColor;
  attribute float targetCharIndex;
  attribute float moveDelay;

  uniform float morphProgress;
  uniform float time;
  uniform float charsPerRow;
  uniform float maxDelay;
  uniform float transitionDuration;

  varying vec3 vColor;
  varying float vOpacity;
  varying float vCharIndex;

  void main() {
    // 개별 파티클의 딜레이를 고려한 진행도 계산
    float totalDuration = transitionDuration + maxDelay;
    float particleStart = moveDelay / totalDuration;
    float particleEnd = (moveDelay + transitionDuration) / totalDuration;

    // 이 파티클의 실제 진행도 (0~1)
    float localProgress = clamp((morphProgress - particleStart) / (particleEnd - particleStart), 0.0, 1.0);

    // easeInOutQuad
    float easedProgress = localProgress < 0.5
      ? 2.0 * localProgress * localProgress
      : 1.0 - pow(-2.0 * localProgress + 2.0, 2.0) / 2.0;

    // 수직/수평 이동 (대각선 금지)
    // 먼저 X 이동, 그 다음 Y 이동
    vec3 pos;
    vec3 diff = targetPosition - position;

    if (easedProgress < 0.5) {
      // 전반부: X축 이동만
      float xProgress = easedProgress * 2.0;
      pos.x = position.x + diff.x * xProgress;
      pos.y = position.y;
      pos.z = position.z;
    } else {
      // 후반부: Y축 이동만
      float yProgress = (easedProgress - 0.5) * 2.0;
      pos.x = targetPosition.x;
      pos.y = position.y + diff.y * yProgress;
      pos.z = position.z;
    }

    // 색상 전환 (이동 완료 시점에)
    vColor = mix(color, targetColor, step(0.9, localProgress));
    vOpacity = opacity;
    vCharIndex = mix(charIndex, targetCharIndex, step(0.9, localProgress));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

const MONDRIAN_FRAGMENT_SHADER = `
  uniform sampler2D charAtlas;
  uniform float charsPerRow;
  uniform float charRows;
  uniform float time;

  varying vec3 vColor;
  varying float vOpacity;
  varying float vCharIndex;

  void main() {
    // 아틀라스에서 문자 UV 계산
    float charIdx = floor(vCharIndex);
    float col = mod(charIdx, charsPerRow);
    float row = floor(charIdx / charsPerRow);

    vec2 charUV = vec2(
      (col + gl_PointCoord.x) / charsPerRow,
      (row + (1.0 - gl_PointCoord.y)) / charRows
    );

    vec4 texColor = texture2D(charAtlas, charUV);

    // 텍스처 알파를 사용하여 문자 모양 추출
    float alpha = texColor.a * vOpacity;

    if (alpha < 0.1) discard;

    // 약간의 깜빡임
    float flicker = 0.95 + 0.05 * sin(time * 3.0 + vCharIndex * 0.5);

    gl_FragColor = vec4(vColor * flicker, alpha);
  }
`;

// ==================== 메인 컴포넌트 ====================
export function MondrianArtCanvas({
  bloomStrength = 0.15,
  bloomRadius = 0.3,
  bloomThreshold = 0.9,
}: MondrianArtCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ==================== Three.js 설정 ====================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ==================== 문자 아틀라스 ====================
    const charAtlas = createCharacterAtlas();
    const charsPerRow = 16;
    const charRows = Math.ceil(CODE_CHARS.length / charsPerRow);

    // ==================== EffectComposer ====================
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // ==================== 초기 격자 및 파티클 생성 ====================
    let currentRectangles = generateMondrianGrid(0, 0, width, height, DEFAULT_DEPTH);
    let currentData = generateParticlesForRectangles(currentRectangles, width, height);

    let targetRectangles: Rectangle[] = [];
    let targetData: { positions: Float32Array; colors: Float32Array; charIndices: Float32Array; count: number } | null = null;

    // 그리드 기반 최대 파티클 수 계산
    const maxParticles = Math.floor((width / PARTICLE_SPACING) * (height / PARTICLE_SPACING) * 1.5);

    // Geometry 생성
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const opacities = new Float32Array(maxParticles);
    const sizes = new Float32Array(maxParticles);
    const charIndices = new Float32Array(maxParticles);
    const targetPositions = new Float32Array(maxParticles * 3);
    const targetColors = new Float32Array(maxParticles * 3);
    const targetCharIndices = new Float32Array(maxParticles);
    const moveDelays = new Float32Array(maxParticles);

    // 초기 데이터 복사
    positions.set(currentData.positions);
    colors.set(currentData.colors);
    charIndices.set(currentData.charIndices);
    for (let i = 0; i < currentData.count; i++) {
      opacities[i] = 0.95;
      sizes[i] = PARTICLE_SIZE;
      moveDelays[i] = Math.random() * MAX_DELAY; // 랜덤 딜레이
    }
    targetPositions.set(currentData.positions);
    targetColors.set(currentData.colors);
    targetCharIndices.set(currentData.charIndices);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("charIndex", new THREE.BufferAttribute(charIndices, 1));
    geometry.setAttribute("targetPosition", new THREE.BufferAttribute(targetPositions, 3));
    geometry.setAttribute("targetColor", new THREE.BufferAttribute(targetColors, 3));
    geometry.setAttribute("targetCharIndex", new THREE.BufferAttribute(targetCharIndices, 1));
    geometry.setAttribute("moveDelay", new THREE.BufferAttribute(moveDelays, 1));

    geometry.setDrawRange(0, currentData.count);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: 1.0 },
        time: { value: 0 },
        charAtlas: { value: charAtlas },
        charsPerRow: { value: charsPerRow },
        charRows: { value: charRows },
        maxDelay: { value: MAX_DELAY },
        transitionDuration: { value: TRANSITION_DURATION },
      },
      vertexShader: MONDRIAN_VERTEX_SHADER,
      fragmentShader: MONDRIAN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ==================== 애니메이션 ====================
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let lastRegenerateTime = 0;
    let morphProgress = 1.0;
    let transitionStartTime = 0;
    let isTransitioning = false;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const elapsedMs = time * 1000;
      material.uniforms.time.value = time;

      // 전환 애니메이션 (전체 지속시간 = 전환시간 + 최대 딜레이)
      const totalDuration = TRANSITION_DURATION + MAX_DELAY;
      if (isTransitioning && targetData) {
        const elapsed = elapsedMs - transitionStartTime;
        morphProgress = Math.min(1, elapsed / totalDuration);

        // morphProgress는 0~1 사이 값으로 셰이더에 전달
        // 셰이더에서 각 파티클의 딜레이를 고려하여 개별 진행도 계산
        material.uniforms.morphProgress.value = morphProgress;

        if (morphProgress >= 1) {
          isTransitioning = false;
          currentRectangles = targetRectangles;
          currentData = targetData;

          const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
          const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
          const charAttr = geometry.getAttribute("charIndex") as THREE.BufferAttribute;
          posAttr.array.set(targetData.positions);
          colorAttr.array.set(targetData.colors);
          charAttr.array.set(targetData.charIndices);
          posAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
          charAttr.needsUpdate = true;

          geometry.setDrawRange(0, currentData.count);
        }
      }

      // 주기적 재생성
      if (elapsedMs - lastRegenerateTime > REGENERATE_INTERVAL && !isTransitioning) {
        lastRegenerateTime = elapsedMs;

        targetRectangles = generateMondrianGrid(0, 0, width, height, DEFAULT_DEPTH);
        targetData = generateParticlesForRectangles(targetRectangles, width, height);

        const targetPosAttr = geometry.getAttribute("targetPosition") as THREE.BufferAttribute;
        const targetColorAttr = geometry.getAttribute("targetColor") as THREE.BufferAttribute;
        const targetCharAttr = geometry.getAttribute("targetCharIndex") as THREE.BufferAttribute;
        const moveDelayAttr = geometry.getAttribute("moveDelay") as THREE.BufferAttribute;

        const maxCount = Math.max(currentData.count, targetData.count);
        geometry.setDrawRange(0, maxCount);

        for (let i = 0; i < maxCount; i++) {
          const i3 = i * 3;
          // 각 파티클에 새로운 랜덤 딜레이 할당
          moveDelayAttr.array[i] = Math.random() * MAX_DELAY;

          if (i < targetData.count) {
            targetPosAttr.array[i3] = targetData.positions[i3];
            targetPosAttr.array[i3 + 1] = targetData.positions[i3 + 1];
            targetPosAttr.array[i3 + 2] = targetData.positions[i3 + 2];
            targetColorAttr.array[i3] = targetData.colors[i3];
            targetColorAttr.array[i3 + 1] = targetData.colors[i3 + 1];
            targetColorAttr.array[i3 + 2] = targetData.colors[i3 + 2];
            targetCharAttr.array[i] = targetData.charIndices[i];
            opacities[i] = 0.95;
          } else {
            targetPosAttr.array[i3] = (Math.random() - 0.5) * width;
            targetPosAttr.array[i3 + 1] = (Math.random() - 0.5) * height;
            targetPosAttr.array[i3 + 2] = 0;
            targetColorAttr.array[i3] = 0;
            targetColorAttr.array[i3 + 1] = 0;
            targetColorAttr.array[i3 + 2] = 0;
            targetCharAttr.array[i] = 0;
            opacities[i] = 0;
          }
        }

        targetPosAttr.needsUpdate = true;
        targetColorAttr.needsUpdate = true;
        targetCharAttr.needsUpdate = true;
        moveDelayAttr.needsUpdate = true;
        (geometry.getAttribute("opacity") as THREE.BufferAttribute).needsUpdate = true;

        isTransitioning = true;
        transitionStartTime = elapsedMs;
        morphProgress = 0;
        material.uniforms.morphProgress.value = 0;
      }

      composer.render();
    };

    animate();

    // ==================== 리사이즈 핸들러 ====================
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      camera.left = -newWidth / 2;
      camera.right = newWidth / 2;
      camera.top = newHeight / 2;
      camera.bottom = -newHeight / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
      bloomPass.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // ==================== 클린업 ====================
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      scene.remove(points);
      geometry.dispose();
      material.dispose();
      charAtlas.dispose();
      renderer.dispose();
      composer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [bloomStrength, bloomRadius, bloomThreshold]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
