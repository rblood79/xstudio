/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, ReactNode, useCallback, useState } from "react";
import * as THREE from "three";

// ==================== 상수 ====================
const PARTICLE_COUNT = 15000;
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1200;
const PIXEL_SAMPLE_STEP = 4;
const POINT_SCALE = 0.28;
const SVG_SCALE = 30;
const BASE_FONT_SIZE = 260;
const LEAVE_DELAY_MS = 50;

// 애니메이션 속도
const MORPH_IN_SPEED = 0.08;   // 폭풍으로 변할 때
const MORPH_OUT_SPEED = 0.04;  // 다시 흩어질 때
const TRANSITION_SPEED = 0.08;

// 사막 모래 색상 팔레트
const SAND_COLORS = {
  dark: { r: 0.95, g: 0.75, b: 0.45 },  // 황금빛 모래
  light: { r: 0.75, g: 0.55, b: 0.30 }, // 진한 모래색
} as const;

// 모래바람 설정 (평상시 - 부드러운 군집 움직임)
const BREEZE_CONFIG = {
  driftSpeed: 0.8,            // 천천히 떠다니는 속도
  clusterStrength: 2.0,       // 군집 강도
  waveAmplitude: 1.5,         // 파동 진폭
  swayFrequency: 0.3,         // 흔들림 빈도
} as const;

// 모래폭풍 설정 (마우스 이벤트 시 - 강렬한 폭풍)
const STORM_CONFIG = {
  windSpeed: 12.0,            // 강한 바람 속도
  windDirection: -1.0,        // -1: 왼쪽, 1: 오른쪽
  turbulence: 5.0,            // 강한 난류
  gustFrequency: 0.5,         // 돌풍 빈도
  gustStrength: 20.0,         // 돌풍 강도
  verticalWave: 4.0,          // 수직 파동
  dustLayerCount: 4,          // 먼지 레이어 수
  vortexStrength: 2.5,        // 소용돌이 강도
  convergenceForce: 1.0,      // 텍스트로 수렴하는 힘 (1.0 = 완전 수렴)
} as const;

// ==================== 타입 ====================
export type MorphContent =
  | { type: "text"; value: string }
  | { type: "svg"; value: string };

interface ParticleBackgroundContextValue {
  targetMorphRef: React.MutableRefObject<number>;
  contentRef: React.MutableRefObject<MorphContent>;
  setHoverContent: (content: MorphContent | null) => void;
  contentVersion: number;
}

// ==================== Context ====================
const ParticleBackgroundContext = createContext<ParticleBackgroundContextValue | null>(null);

export function ParticleBackgroundProvider({ children }: { children: ReactNode }) {
  const targetMorphRef = useRef(0);
  const contentRef = useRef<MorphContent>({ type: "text", value: "BESPOKE" });
  const [contentVersion, setContentVersion] = useState(0);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHoverContent = useCallback((content: MorphContent | null) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (content) {
      contentRef.current = content;
      targetMorphRef.current = 1;
      setContentVersion(v => v + 1);
    } else {
      leaveTimeoutRef.current = setTimeout(() => {
        targetMorphRef.current = 0;
        leaveTimeoutRef.current = null;
      }, LEAVE_DELAY_MS);
    }
  }, []);

  return (
    <ParticleBackgroundContext.Provider value={{ targetMorphRef, contentRef, setHoverContent, contentVersion }}>
      {children}
    </ParticleBackgroundContext.Provider>
  );
}

export function useParticleBackground() {
  const context = useContext(ParticleBackgroundContext);
  if (!context) {
    throw new Error("useParticleBackground must be used within ParticleBackgroundProvider");
  }
  return context;
}

// ==================== 캔버스 유틸리티 ====================
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = CANVAS_WIDTH;
    sharedCanvas.height = CANVAS_HEIGHT;
    sharedCtx = sharedCanvas.getContext("2d")!;
  }
  return { canvas: sharedCanvas, ctx: sharedCtx! };
}

function getAttr(elem: Element, name: string, defaultValue = 0): number {
  return parseFloat(elem.getAttribute(name) || String(defaultValue));
}

const svgRenderers: Record<string, (elem: Element, ctx: CanvasRenderingContext2D) => void> = {
  path: (elem, ctx) => {
    const d = elem.getAttribute("d");
    if (d) ctx.stroke(new Path2D(d));
  },
  circle: (elem, ctx) => {
    ctx.beginPath();
    ctx.arc(getAttr(elem, "cx"), getAttr(elem, "cy"), getAttr(elem, "r"), 0, Math.PI * 2);
    ctx.stroke();
  },
  line: (elem, ctx) => {
    ctx.beginPath();
    ctx.moveTo(getAttr(elem, "x1"), getAttr(elem, "y1"));
    ctx.lineTo(getAttr(elem, "x2"), getAttr(elem, "y2"));
    ctx.stroke();
  },
  rect: (elem, ctx) => {
    const x = getAttr(elem, "x"), y = getAttr(elem, "y");
    const w = getAttr(elem, "width"), h = getAttr(elem, "height");
    const rx = getAttr(elem, "rx");
    if (rx > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, rx);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, w, h);
    }
  },
  ellipse: (elem, ctx) => {
    ctx.beginPath();
    ctx.ellipse(getAttr(elem, "cx"), getAttr(elem, "cy"), getAttr(elem, "rx"), getAttr(elem, "ry"), 0, 0, Math.PI * 2);
    ctx.stroke();
  },
  polyline: (elem, ctx) => renderPoly(elem, ctx, false),
  polygon: (elem, ctx) => renderPoly(elem, ctx, true),
};

function renderPoly(elem: Element, ctx: CanvasRenderingContext2D, close: boolean) {
  const points = elem.getAttribute("points")?.trim().split(/\s+|,/).map(Number) || [];
  if (points.length < 4) return;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(points[i], points[i + 1]);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}

function drawSvgToCanvas(svgString: string, ctx: CanvasRenderingContext2D) {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return;

  const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 24, 24];
  const [, , svgWidth, svgHeight] = viewBox;

  ctx.save();
  ctx.translate(
    CANVAS_WIDTH / 2 - (svgWidth * SVG_SCALE) / 2,
    CANVAS_HEIGHT / 2 - (svgHeight * SVG_SCALE) / 2
  );
  ctx.scale(SVG_SCALE, SVG_SCALE);
  ctx.lineWidth = 2;
  ctx.strokeStyle = ctx.fillStyle = "white";
  ctx.lineCap = ctx.lineJoin = "round";

  svg.querySelectorAll("path, circle, line, rect, ellipse, polyline, polygon").forEach(elem => {
    const renderer = svgRenderers[elem.tagName.toLowerCase()];
    if (renderer) renderer(elem, ctx);
  });

  ctx.restore();
}

function drawTextToCanvas(text: string, ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  const maxWidth = CANVAS_WIDTH * 0.85;
  ctx.font = `bold ${BASE_FONT_SIZE}px sans-serif`;

  let fontSize = BASE_FONT_SIZE;
  const textWidth = ctx.measureText(text).width;
  if (textWidth > maxWidth) {
    fontSize = Math.floor((BASE_FONT_SIZE * maxWidth) / textWidth);
    ctx.font = `bold ${fontSize}px sans-serif`;
  }

  const metrics = ctx.measureText(text);
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const centerY = CANVAS_HEIGHT / 2 + metrics.actualBoundingBoxAscent - textHeight / 2;
  ctx.fillText(text, CANVAS_WIDTH / 2, centerY);
}

function generatePointsFromContent(content: MorphContent): Float32Array {
  const { ctx } = getSharedCanvas();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "white";

  if (content.type === "text") {
    drawTextToCanvas(content.value, ctx);
  } else {
    drawSvgToCanvas(content.value, ctx);
  }

  const { data } = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const points: number[] = [];
  const halfWidth = CANVAS_WIDTH / 2;
  const halfHeight = CANVAS_HEIGHT / 2;

  for (let y = 0; y < CANVAS_HEIGHT; y += PIXEL_SAMPLE_STEP) {
    for (let x = 0; x < CANVAS_WIDTH; x += PIXEL_SAMPLE_STEP) {
      if (data[(y * CANVAS_WIDTH + x) * 4] > 128) {
        points.push(
          (x - halfWidth) * POINT_SCALE,
          -(y - halfHeight) * POINT_SCALE,
          (Math.random() - 0.5) * 12
        );
      }
    }
  }

  const pointCount = points.length / 3;
  while (points.length / 3 < PARTICLE_COUNT) {
    const i = Math.floor(Math.random() * pointCount) * 3;
    points.push(
      points[i] + (Math.random() - 0.5) * 7,
      points[i + 1] + (Math.random() - 0.5) * 7,
      points[i + 2]
    );
  }

  return new Float32Array(points.slice(0, PARTICLE_COUNT * 3));
}

// ==================== 사막 모래바람 & 폭풍 Shader ====================
const DESERT_STORM_VERTEX_SHADER = `
  attribute float random;
  attribute float dustLayer;
  attribute vec3 targetPos;
  attribute vec3 prevTargetPos;
  uniform float morphProgress;
  uniform float transitionProgress;
  uniform float time;

  // 평상시 모래바람
  uniform float driftSpeed;
  uniform float clusterStrength;
  uniform float waveAmplitude;
  uniform float swayFrequency;

  // 폭풍 시
  uniform float windSpeed;
  uniform float windDirection;
  uniform float turbulence;
  uniform float gustStrength;
  uniform float gustFrequency;
  uniform float verticalWave;
  uniform float vortexStrength;
  uniform float convergenceForce;

  varying float vAlpha;
  varying float vLayer;
  varying float vMorph;

  // Simplex noise 함수
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
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

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 currentTarget = mix(prevTargetPos, targetPos, transitionProgress);

    // 레이어별 속도 배율
    float layerSpeedMultiplier = 1.0 + dustLayer * 0.6;
    float layerTurbMultiplier = 1.0 + dustLayer * 0.4;

    // ========== 평상시: 부드러운 군집 모래바람 ==========
    // 천천히 떠다니는 기본 움직임
    float driftX = sin(time * driftSpeed * 0.5 + random * 6.28) * 15.0;
    float driftY = cos(time * driftSpeed * 0.3 + random * 4.0) * 10.0;

    // 군집 움직임 (노이즈 기반으로 무리지어 이동)
    vec3 clusterNoisePos = vec3(position.x * 0.005, position.y * 0.005, time * 0.2);
    float clusterX = snoise(clusterNoisePos) * clusterStrength * 20.0;
    float clusterY = snoise(clusterNoisePos + vec3(50.0, 0.0, 0.0)) * clusterStrength * 15.0;

    // 부드러운 파동
    float wave = sin(time * swayFrequency + position.x * 0.02 + random * 3.14) * waveAmplitude;
    wave += cos(time * swayFrequency * 0.7 + position.y * 0.015) * waveAmplitude * 0.6;

    // 레이어별 깊이감 있는 움직임
    float layerDrift = sin(time * 0.4 + dustLayer * 3.14) * 8.0 * dustLayer;

    vec3 breezeMove = vec3(
      driftX + clusterX + layerDrift,
      driftY + clusterY + wave,
      sin(time * 0.5 + random * 10.0) * 3.0
    ) * layerSpeedMultiplier;

    // ========== 폭풍: 강렬한 모래폭풍 ==========
    // 강한 수평 바람
    float windOffset = time * windSpeed * windDirection * layerSpeedMultiplier;

    // 돌풍 효과 (급격한 바람)
    float gustTime = time * gustFrequency;
    float gust = sin(gustTime + random * 6.28) * cos(gustTime * 0.7 + random * 3.14);
    gust = gust * gust * sign(gust); // 날카로운 피크
    float gustOffset = gust * gustStrength;

    // 강한 터뷸런스
    vec3 noisePos = vec3(position.x * 0.015, position.y * 0.015, time * 0.8);
    float turbX = snoise(noisePos) * turbulence * layerTurbMultiplier;
    float turbY = snoise(noisePos + vec3(100.0, 0.0, 0.0)) * turbulence * layerTurbMultiplier * 0.7;
    float turbZ = snoise(noisePos + vec3(0.0, 100.0, 0.0)) * turbulence * layerTurbMultiplier * 0.4;

    // 격렬한 수직 파동
    float stormWave = sin(time * 3.0 + position.x * 0.04 + random * 6.28) * verticalWave;
    stormWave += cos(time * 2.0 + position.x * 0.03 + random * 3.14) * verticalWave * 0.7;

    // 소용돌이 효과 (텍스트 중심으로)
    float distToCenter = length(position.xy - currentTarget.xy);
    float vortexAngle = time * 1.5 + distToCenter * 0.02;
    float vortexIntensity = vortexStrength * (1.0 + sin(time * 0.5) * 0.3);
    float vortexX = cos(vortexAngle) * vortexIntensity * min(distToCenter * 0.1, 1.0);
    float vortexY = sin(vortexAngle) * vortexIntensity * min(distToCenter * 0.1, 1.0);

    vec3 stormMove = vec3(
      windOffset + gustOffset + turbX + vortexX,
      stormWave + turbY + vortexY,
      turbZ
    );

    // ========== 모핑 블렌딩 ==========
    // morphProgress: 0 = 평상시 (산들바람), 1 = 폭풍 + 텍스트 형성

    // 폭풍 강도는 morphProgress에 비례
    float stormIntensity = morphProgress;
    // 산들바람은 morphProgress가 낮을수록 강함
    float breezeIntensity = 1.0 - morphProgress;

    // 위치 계산
    // 기본 위치에서 시작
    vec3 scatteredPos = position;

    // 산들바람 효과 (평상시)
    scatteredPos += breezeMove * breezeIntensity;

    // 폭풍 효과 (마우스 이벤트 시)
    scatteredPos += stormMove * stormIntensity * 0.3;

    // 타겟 위치 (SVG/텍스트 형태) - 백업 파일 방식: mix 사용
    // morphProgress가 1이면 완전히 currentTarget으로 이동
    vec3 pos = mix(scatteredPos, currentTarget, morphProgress * convergenceForce);

    // 최종 위치에서 미세한 진동 (텍스트 형성 후에도 살아있는 느낌)
    vec3 vibration = vec3(
      sin(time * 4.0 + random * 20.0) * 0.5,
      cos(time * 4.0 + random * 15.0) * 0.5,
      sin(time * 3.0 + random * 10.0) * 0.3
    ) * morphProgress;
    pos += vibration;

    // 알파값 (폭풍 시 더 밝게)
    float distFade = 1.0 - smoothstep(180.0, 350.0, length(pos.xy));
    float stormBrightness = 1.0 + morphProgress * 0.4;
    vAlpha = (0.5 + dustLayer * 0.35) * distFade * stormBrightness;
    vLayer = dustLayer;
    vMorph = morphProgress;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // 크기: 폭풍 시 약간 커짐
    float sizeMultiplier = 1.0 + morphProgress * 0.3;
    float baseSize = 260.0 + dustLayer * 70.0;
    gl_PointSize = (baseSize / -mvPos.z) * (0.7 + random * 0.5) * sizeMultiplier;
  }
`;

const DESERT_STORM_FRAGMENT_SHADER = `
  uniform vec3 color;
  uniform vec3 color2;
  uniform float time;

  varying float vAlpha;
  varying float vLayer;
  varying float vMorph;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // 부드러운 원형 파티클
    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);
    alpha *= vAlpha;

    // 레이어에 따른 색상 혼합 (깊이감)
    float colorMix = vLayer * 0.25 + sin(time * 0.5) * 0.08;
    vec3 finalColor = mix(color, color2, colorMix);

    // 폭풍 시 색상 변화 (더 밝고 황금빛)
    finalColor += vec3(0.15, 0.08, 0.0) * vMorph;

    // 약간의 색상 펄스
    finalColor += vec3(0.08, 0.04, 0.0) * sin(time * 2.0 + vLayer * 3.14) * vMorph;

    gl_FragColor = vec4(finalColor, alpha * 0.9);
  }
`;

// ==================== 컴포넌트 ====================
export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef, contentRef, contentVersion } = useParticleBackground();
  const morphProgressRef = useRef(0);
  const transitionProgressRef = useRef(1);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

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
      new THREE.BufferAttribute(generatePointsFromContent(contentRef.current), 3)
    );

    transitionProgressRef.current = 0;
  }, [contentVersion, contentRef]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountElement = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountElement.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const dustLayers = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // 넓은 영역에 파티클 분포
      positions[i3] = (Math.random() - 0.5) * 500;
      positions[i3 + 1] = (Math.random() - 0.5) * 350;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;
      randoms[i] = Math.random();
      // 먼지 레이어 (0~1, 깊이감)
      dustLayers[i] = Math.floor(Math.random() * STORM_CONFIG.dustLayerCount) / STORM_CONFIG.dustLayerCount;
    }

    const initialPoints = generatePointsFromContent(contentRef.current);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute("dustLayer", new THREE.BufferAttribute(dustLayers, 1));
    geometry.setAttribute("targetPos", new THREE.BufferAttribute(initialPoints, 3));
    geometry.setAttribute("prevTargetPos", new THREE.BufferAttribute(new Float32Array(initialPoints), 3));
    geometryRef.current = geometry;

    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const primaryColor = isDarkMode ? SAND_COLORS.dark : SAND_COLORS.light;
    const secondaryColor = { r: primaryColor.r * 0.7, g: primaryColor.g * 0.6, b: primaryColor.b * 0.4 };

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        morphProgress: { value: 0 },
        transitionProgress: { value: 1 },
        color: { value: new THREE.Vector3(primaryColor.r, primaryColor.g, primaryColor.b) },
        color2: { value: new THREE.Vector3(secondaryColor.r, secondaryColor.g, secondaryColor.b) },
        // 평상시 모래바람
        driftSpeed: { value: BREEZE_CONFIG.driftSpeed },
        clusterStrength: { value: BREEZE_CONFIG.clusterStrength },
        waveAmplitude: { value: BREEZE_CONFIG.waveAmplitude },
        swayFrequency: { value: BREEZE_CONFIG.swayFrequency },
        // 폭풍
        windSpeed: { value: STORM_CONFIG.windSpeed },
        windDirection: { value: STORM_CONFIG.windDirection },
        turbulence: { value: STORM_CONFIG.turbulence },
        gustStrength: { value: STORM_CONFIG.gustStrength },
        gustFrequency: { value: STORM_CONFIG.gustFrequency },
        verticalWave: { value: STORM_CONFIG.verticalWave },
        vortexStrength: { value: STORM_CONFIG.vortexStrength },
        convergenceForce: { value: STORM_CONFIG.convergenceForce },
      },
      vertexShader: DESERT_STORM_VERTEX_SHADER,
      fragmentShader: DESERT_STORM_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const c = e.matches ? SAND_COLORS.dark : SAND_COLORS.light;
      const c2 = { r: c.r * 0.7, g: c.g * 0.6, b: c.b * 0.4 };
      material.uniforms.color.value.set(c.r, c.g, c.b);
      material.uniforms.color2.value.set(c2.r, c2.g, c2.b);
    };
    mediaQuery.addEventListener("change", handleThemeChange);

    scene.add(new THREE.Points(geometry, material));

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const delta = clock.getDelta();
      material.uniforms.time.value += delta;

      const speed = targetMorphRef.current > morphProgressRef.current ? MORPH_IN_SPEED : MORPH_OUT_SPEED;
      morphProgressRef.current += (targetMorphRef.current - morphProgressRef.current) * speed;
      material.uniforms.morphProgress.value = morphProgressRef.current;

      transitionProgressRef.current += (1 - transitionProgressRef.current) * TRANSITION_SPEED;
      material.uniforms.transitionProgress.value = transitionProgressRef.current;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      geometryRef.current = null;
      materialRef.current = null;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      mediaQuery.removeEventListener("change", handleThemeChange);
      mountElement.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [targetMorphRef, contentRef]);

  return (
    <div
      ref={mountRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1 }}
    />
  );
}
