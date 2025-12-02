/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useState,
} from "react";
import * as THREE from "three";
// ⭐ ParticleBackground.tsx의 useParticleBackground import (main.tsx에서 제공하는 Provider와 일치)
import { useParticleBackground as useParticleBackgroundFromBackground } from "./ParticleBackground";

// ==================== 상수 ====================
const PARTICLE_COUNT = 18000;
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1200;
const PIXEL_SAMPLE_STEP = 4;
const POINT_SCALE = 0.28;
const SVG_SCALE = 30;
const BASE_FONT_SIZE = 260;
const LEAVE_DELAY_MS = 60;

// 애니메이션 속도
const MORPH_IN_SPEED = 0.08;
const MORPH_OUT_SPEED = 0.015;
const TRANSITION_SPEED = 0.045; // 형태 간 전환 속도
const VORTEX_FADE_SPEED = 0.015; // 회오리 흩어지는 속도 (MORPH_OUT과 동일)

// 사막 모래 색상 팔레트 (누렇고 탁한 베이지색)
const SAND_COLORS = {
  dark: {
    primary: { r: 0.92, g: 0.78, b: 0.52 }, // 밝은 황금 모래
    secondary: { r: 0.75, g: 0.58, b: 0.35 }, // 중간 모래
    dust: { r: 0.85, g: 0.72, b: 0.48 }, // 먼지 색상
  },
  light: {
    primary: { r: 0.35, g: 0.25, b: 0.12 }, // 진한 갈색 (밝은 배경에서 잘 보이게)
    secondary: { r: 0.28, g: 0.18, b: 0.08 }, // 어두운 갈색
    dust: { r: 0.42, g: 0.32, b: 0.18 }, // 중간 갈색
  },
} as const;

// 평상시 모래바람 설정 (사막의 공기가 거칠고 무거운 느낌)
const BREEZE_CONFIG = {
  // 기본 바람
  windSpeed: 1.2, // 지속적인 수평 바람
  windDirection: -1.0, // 바람 방향
  // 층별 움직임
  groundBounce: 2.5, // 바닥 근처 굵은 알갱이 튀어오름
  midLayerDrift: 1.8, // 중간층 떠다님
  highLayerFloat: 0.8, // 상층 미세먼지 부유
  // 물결무늬
  surfaceWaveSpeed: 0.4, // 모래언덕 표면 물결
  surfaceWaveScale: 0.015, // 물결 스케일
  // 군집
  clusterStrength: 1.5, // 무리지어 이동
  clusterScale: 0.008, // 군집 크기
} as const;

// 회오리 설정 (마우스 클릭 시)
const VORTEX_CONFIG = {
  // 성장
  growthRate: 0.15, // 누르는 시간에 따른 성장률
  maxRadius: 180.0, // 최대 회오리 반경
  minRadius: 20.0, // 최소 회오리 반경
  maxHeight: 250.0, // 최대 높이 (몇십 미터 치솟는 기둥)
  // 회전
  rotationSpeed: 3.0, // 회전 속도
  spiralTightness: 0.03, // 나선 조임 정도
  // 흡입력
  suctionStrength: 15.0, // 바닥 모래 빨아들이는 힘
  liftForce: 8.0, // 위로 솟구치는 힘
  // 밀도
  coreDensity: 1.0, // 중심부 밀도 (빽빽하게)
  edgeDensity: 0.3, // 가장자리 밀도 (옅어짐)
  // 기울기 (날렵한 깃발처럼)
  tiltAmount: 0.15, // 한쪽으로 기울어짐
  tiltDirection: 1.0, // 기울기 방향
} as const;

// 모래폭풍 설정 (버튼 호버 시 - 텍스트 형성)
const STORM_CONFIG = {
  turbulence: 4.0,
  gustStrength: 12.0,
  gustFrequency: 0.6,
  convergenceForce: 0.85, // 수렴력 크게 증가 (0.18 → 0.85)
  dustLayerCount: 5,
} as const;

// ==================== 타입 ====================
export type MorphContent =
  | { type: "text"; value: string }
  | { type: "svg"; value: string };

interface VortexState {
  active: boolean;
  x: number;
  y: number;
  strength: number; // 0~1, 누른 시간에 따라 증가
  radius: number; // 현재 반경
  height: number; // 현재 높이
}

interface ParticleBackgroundContextValue {
  targetMorphRef: React.MutableRefObject<number>;
  contentRef: React.MutableRefObject<MorphContent>;
  setHoverContent: (content: MorphContent | null) => void;
  contentVersion: number;
  vortexRef: React.MutableRefObject<VortexState>;
}

// ==================== Context ====================
const ParticleBackgroundContext =
  createContext<ParticleBackgroundContextValue | null>(null);

export function ParticleBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const targetMorphRef = useRef(0);
  const contentRef = useRef<MorphContent>({ type: "text", value: "BESPOKE" });
  const [contentVersion, setContentVersion] = useState(0);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 회오리 상태
  const vortexRef = useRef<VortexState>({
    active: false,
    x: 0,
    y: 0,
    strength: 0,
    radius: VORTEX_CONFIG.minRadius,
    height: 0,
  });

  const setHoverContent = useCallback((content: MorphContent | null) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (content) {
      contentRef.current = content;
      targetMorphRef.current = 1;
      setContentVersion((v) => v + 1);
    } else {
      leaveTimeoutRef.current = setTimeout(() => {
        targetMorphRef.current = 0;
        leaveTimeoutRef.current = null;
      }, LEAVE_DELAY_MS);
    }
  }, []);

  return (
    <ParticleBackgroundContext.Provider
      value={{
        targetMorphRef,
        contentRef,
        setHoverContent,
        contentVersion,
        vortexRef,
      }}
    >
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

// ==================== 캔버스 유틸리티 ====================
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
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

const svgRenderers: Record<
  string,
  (elem: Element, ctx: CanvasRenderingContext2D) => void
> = {
  path: (elem, ctx) => {
    const d = elem.getAttribute("d");
    if (d) ctx.stroke(new Path2D(d));
  },
  circle: (elem, ctx) => {
    ctx.beginPath();
    ctx.arc(
      getAttr(elem, "cx"),
      getAttr(elem, "cy"),
      getAttr(elem, "r"),
      0,
      Math.PI * 2
    );
    ctx.stroke();
  },
  line: (elem, ctx) => {
    ctx.beginPath();
    ctx.moveTo(getAttr(elem, "x1"), getAttr(elem, "y1"));
    ctx.lineTo(getAttr(elem, "x2"), getAttr(elem, "y2"));
    ctx.stroke();
  },
  rect: (elem, ctx) => {
    const x = getAttr(elem, "x"),
      y = getAttr(elem, "y");
    const w = getAttr(elem, "width"),
      h = getAttr(elem, "height");
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
    ctx.ellipse(
      getAttr(elem, "cx"),
      getAttr(elem, "cy"),
      getAttr(elem, "rx"),
      getAttr(elem, "ry"),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  },
  polyline: (elem, ctx) => renderPoly(elem, ctx, false),
  polygon: (elem, ctx) => renderPoly(elem, ctx, true),
};

function renderPoly(
  elem: Element,
  ctx: CanvasRenderingContext2D,
  close: boolean
) {
  const points =
    elem.getAttribute("points")?.trim().split(/\s+|,/).map(Number) || [];
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

  const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number) || [
    0, 0, 24, 24,
  ];
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

  svg
    .querySelectorAll("path, circle, line, rect, ellipse, polyline, polygon")
    .forEach((elem) => {
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
  const textHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const centerY =
    CANVAS_HEIGHT / 2 + metrics.actualBoundingBoxAscent - textHeight / 2;
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

// ==================== 사막 모래바람 Shader ====================
const DESERT_SAND_VERTEX_SHADER = `
  attribute float random;
  attribute float heightLayer;    // 0: 바닥(굵은 알갱이), 1: 상층(미세 먼지)
  attribute float particleSize;   // 파티클 기본 크기
  attribute vec3 targetPos;
  attribute vec3 prevTargetPos;

  uniform float morphProgress;
  uniform float transitionProgress;
  uniform float time;

  // 회오리 상태
  uniform float vortexActive;
  uniform vec2 vortexCenter;
  uniform float vortexStrength;
  uniform float vortexRadius;
  uniform float vortexHeight;

  // 바람 설정
  uniform float windSpeed;
  uniform float windDirection;
  uniform float groundBounce;
  uniform float midLayerDrift;
  uniform float highLayerFloat;
  uniform float surfaceWaveSpeed;
  uniform float surfaceWaveScale;
  uniform float clusterStrength;
  uniform float clusterScale;

  // 폭풍 설정 (텍스트 형성)
  uniform float turbulence;
  uniform float gustStrength;
  uniform float gustFrequency;
  uniform float convergenceForce;

  // 회오리 설정
  uniform float rotationSpeed;
  uniform float spiralTightness;
  uniform float suctionStrength;
  uniform float liftForce;
  uniform float coreDensity;
  uniform float edgeDensity;
  uniform float tiltAmount;
  uniform float tiltDirection;
  uniform float maxVortexHeight;

  varying float vAlpha;
  varying float vHeightLayer;
  varying float vMorph;
  varying float vVortexInfluence;
  varying float vDistortion;

  // Simplex noise
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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 currentTarget = mix(prevTargetPos, targetPos, transitionProgress);
    vec3 pos = position;

    // 높이에 따른 레이어 효과 (0: 바닥, 1: 상층)
    float layerFactor = heightLayer;

    // ========== 평상시: 사막 모래바람 ==========

    // 1. 지속적인 수평 바람 (모든 층에 영향)
    float baseWind = time * windSpeed * windDirection;
    float windNoise = snoise(vec3(pos.x * 0.01, pos.y * 0.01, time * 0.3)) * 0.5;

    // 2. 층별 움직임
    // 바닥층 (heightLayer ~0): 굵은 알갱이 - 짧고 강하게 튀어오름
    float groundEffect = (1.0 - layerFactor) * groundBounce;
    float bounce = abs(sin(time * 2.5 + random * 6.28)) * groundEffect;
    bounce *= (0.5 + snoise(vec3(pos.x * 0.02, time * 1.5, random)) * 0.5);

    // 중간층: 떠다니는 움직임
    float midEffect = (1.0 - abs(layerFactor - 0.5) * 2.0) * midLayerDrift;
    float midDrift = sin(time * 0.8 + pos.x * 0.01 + random * 3.14) * midEffect;

    // 상층 (heightLayer ~1): 미세먼지 - 연기처럼 천천히 부유
    float highEffect = layerFactor * highLayerFloat;
    float floatY = sin(time * 0.3 + random * 6.28) * highEffect * 5.0;
    float floatX = cos(time * 0.25 + random * 4.0) * highEffect * 8.0;

    // 3. 모래언덕 표면 물결무늬
    float surfaceWave = sin(time * surfaceWaveSpeed + pos.x * surfaceWaveScale * 50.0) *
                        cos(time * surfaceWaveSpeed * 0.7 + pos.y * surfaceWaveScale * 30.0) *
                        (1.0 - layerFactor) * 3.0;

    // 4. 군집 움직임 (무리지어 이동)
    vec3 clusterPos = vec3(pos.x * clusterScale, pos.y * clusterScale, time * 0.15);
    float clusterX = snoise(clusterPos) * clusterStrength * 25.0;
    float clusterY = snoise(clusterPos + vec3(100.0, 0.0, 0.0)) * clusterStrength * 18.0;

    // 모래바람 최종 위치
    vec3 breezeMove = vec3(
      baseWind + windNoise * 10.0 + floatX + clusterX,
      bounce + midDrift + floatY + surfaceWave + clusterY,
      snoise(vec3(pos.xy * 0.01, time * 0.4)) * 5.0 * (0.5 + layerFactor * 0.5)
    );

    // ========== 회오리 효과 (마우스 클릭 시) ==========
    float vortexInfluence = 0.0;
    vec3 vortexMove = vec3(0.0);

    if (vortexActive > 0.5 && vortexStrength > 0.01) {
      // 회오리 중심과의 거리
      vec2 toVortex = pos.xy - vortexCenter;
      float distToVortex = length(toVortex);
      float normalizedDist = distToVortex / vortexRadius;

      // 회오리 영향 범위 (중심에 가까울수록 강함)
      vortexInfluence = smoothstep(1.5, 0.0, normalizedDist) * vortexStrength;

      if (vortexInfluence > 0.01) {
        // 1. 회전 운동 (나선형으로 빨려들어감)
        float angle = atan(toVortex.y, toVortex.x);
        float spiralAngle = angle + time * rotationSpeed * (1.0 + vortexStrength);

        // 중심에 가까울수록 빠르게 회전
        float rotSpeed = rotationSpeed * (1.0 + (1.0 - normalizedDist) * 2.0);
        spiralAngle += time * rotSpeed;

        // 나선형 수축 (시간이 지날수록 중심으로)
        float spiralRadius = distToVortex * (1.0 - vortexStrength * spiralTightness * 0.5);

        vec2 rotatedPos = vec2(
          cos(spiralAngle) * spiralRadius,
          sin(spiralAngle) * spiralRadius
        );

        // 2. 흡입력 (바닥 모래를 빨아들임)
        float suction = suctionStrength * vortexInfluence * (1.0 - layerFactor * 0.5);
        vec2 suctionDir = -normalize(toVortex + vec2(0.001));

        // 3. 상승 기류 (위로 솟구치는 힘)
        // 중심부에 가까울수록 강하게 상승
        float lift = liftForce * vortexInfluence * vortexStrength;
        lift *= (1.0 - normalizedDist * 0.5); // 중심부가 더 강함

        // 높이 제한 (회오리 높이에 따라)
        float maxLift = vortexHeight * (1.0 - normalizedDist * 0.3);
        float currentLift = lift * (1.0 - smoothstep(0.0, maxLift, pos.y + 100.0));

        // 4. 기울기 (깃발처럼 한쪽으로 기울어짐)
        float tilt = tiltAmount * vortexStrength * pos.y * 0.01 * tiltDirection;

        // 5. 밀도 변화 (중심부는 빽빽, 가장자리는 옅음)
        float densityFactor = mix(edgeDensity, coreDensity, 1.0 - normalizedDist);

        // 회오리 움직임 합성
        vortexMove = vec3(
          (rotatedPos.x - toVortex.x) * vortexInfluence + suctionDir.x * suction + tilt,
          currentLift + (rotatedPos.y - toVortex.y) * vortexInfluence * 0.3,
          suctionDir.y * suction * 0.5
        );

        // 난류 추가 (회오리 내부의 불규칙한 움직임)
        vec3 turbNoisePos = vec3(pos.xy * 0.02, time * 1.5);
        vortexMove += vec3(
          snoise(turbNoisePos) * 8.0,
          snoise(turbNoisePos + vec3(50.0, 0.0, 0.0)) * 6.0,
          snoise(turbNoisePos + vec3(0.0, 50.0, 0.0)) * 4.0
        ) * vortexInfluence * vortexStrength;
      }
    }

    // ========== 텍스트 형성 모드 (버튼 호버) ==========
    vec3 stormMove = vec3(0.0);

    if (morphProgress > 0.01) {
      // 터뷸런스
      vec3 turbPos = vec3(pos.xy * 0.012, time * 0.6);
      float turbX = snoise(turbPos) * turbulence;
      float turbY = snoise(turbPos + vec3(80.0, 0.0, 0.0)) * turbulence * 0.8;

      // 돌풍
      float gustTime = time * gustFrequency;
      float gust = sin(gustTime + random * 6.28) * cos(gustTime * 0.7) * gustStrength;

      stormMove = vec3(turbX + gust, turbY, snoise(turbPos + vec3(0.0, 80.0, 0.0)) * turbulence * 0.5);
    }

    // ========== 최종 위치 계산 ==========

    // 1. 기본 위치 계산: position → currentTarget 직접 보간 (backup 방식)
    // morphProgress가 1이면 완전히 currentTarget으로 이동
    vec3 morphedPos = mix(position, currentTarget, morphProgress);

    // 2. 평상시 모래바람 효과 (morphProgress가 낮을 때만)
    float breezeIntensity = (1.0 - morphProgress) * (1.0 - morphProgress);
    morphedPos += breezeMove * breezeIntensity;

    // 3. 폭풍 효과 (morphProgress 중간 단계에서)
    float stormIntensity = morphProgress * (1.0 - morphProgress) * 4.0; // 0.5에서 최대
    morphedPos += stormMove * stormIntensity * 0.5;

    // 4. 회오리 효과 (클릭 시, morphProgress와 독립적)
    // 회오리가 활성화되면 morph 위치에서 벗어남
    morphedPos += vortexMove * (1.0 - morphProgress * 0.3);

    pos = morphedPos;

    // ========== 형태 유지 시 살아있는 움직임 ==========
    if (morphProgress > 0.5) {
      float aliveIntensity = (morphProgress - 0.5) * 2.0; // 0.5~1.0 → 0~1

      // 1. 호흡하는 듯한 팽창/수축 (형태 전체가 숨쉬듯)
      float breathe = sin(time * 1.2) * 0.5 + sin(time * 0.7) * 0.3;
      vec3 breatheMove = normalize(currentTarget) * breathe * 2.5 * aliveIntensity;

      // 2. 파동 효과 (형태 표면을 따라 물결) - 약하게
      float wavePhase = length(currentTarget.xy) * 0.05 + time * 2.0;
      float wave = sin(wavePhase + random * 6.28) * 0.5;
      vec3 waveMove = vec3(
        cos(wavePhase) * wave,
        sin(wavePhase * 0.8) * wave,
        sin(wavePhase * 1.2) * wave * 0.3
      ) * aliveIntensity;

      // 3. 개별 파티클 떨림 (각 파티클이 독립적으로 진동)
      vec3 jitter = vec3(
        sin(time * 8.0 + random * 30.0),
        cos(time * 7.0 + random * 25.0),
        sin(time * 6.0 + random * 20.0)
      ) * 0.8 * aliveIntensity;

      // 4. 형태 가장자리 흔들림 (외곽이 더 많이 움직임) - 약하게
      float edgeFactor = smoothstep(0.0, 50.0, length(currentTarget.xy));
      vec3 edgeWobble = vec3(
        sin(time * 3.0 + currentTarget.x * 0.1) * 0.8,
        cos(time * 2.5 + currentTarget.y * 0.1) * 0.8,
        sin(time * 2.0) * 0.4
      ) * edgeFactor * aliveIntensity;

      pos += breatheMove + waveMove + jitter + edgeWobble;
    }

    // 기본 진동 (항상 적용)
    vec3 vibration = vec3(
      sin(time * 5.0 + random * 20.0) * 0.4,
      cos(time * 4.5 + random * 15.0) * 0.4,
      sin(time * 3.5 + random * 10.0) * 0.25
    ) * (morphProgress * 0.7 + vortexInfluence * 0.8);
    pos += vibration;

    // ========== 출력 ==========

    // 알파값
    float distFade = 1.0 - smoothstep(200.0, 400.0, length(pos.xy));
    float vortexBrightness = 1.0 + vortexInfluence * 0.6;
    float stormBrightness = 1.0 + morphProgress * 0.3;

    // 층별 기본 알파 (상층이 더 옅음)
    float layerAlpha = mix(0.7, 0.4, layerFactor);

    vAlpha = layerAlpha * distFade * vortexBrightness * stormBrightness;
    vHeightLayer = heightLayer;
    vMorph = morphProgress;
    vVortexInfluence = vortexInfluence;

    // 공기 왜곡 효과 (열기와 먼지로 일그러짐)
    vDistortion = vortexInfluence * vortexStrength + morphProgress * 0.3;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // 파티클 크기
    // 바닥층: 크고 무거움, 상층: 작고 가벼움
    float layerSize = mix(1.3, 0.6, layerFactor);
    float vortexSize = 1.0 + vortexInfluence * 0.4;
    float stormSize = 1.0 + morphProgress * 0.2;

    float finalSize = particleSize * layerSize * vortexSize * stormSize;
    gl_PointSize = (finalSize / -mvPos.z) * (0.8 + random * 0.4);
  }
`;

const DESERT_SAND_FRAGMENT_SHADER = `
  uniform vec3 colorPrimary;
  uniform vec3 colorSecondary;
  uniform vec3 colorDust;
  uniform float time;

  varying float vAlpha;
  varying float vHeightLayer;
  varying float vMorph;
  varying float vVortexInfluence;
  varying float vDistortion;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // 부드러운 원형 파티클
    float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
    alpha *= vAlpha;

    // 층별 색상 (바닥: 진한 모래색, 상층: 옅은 먼지색)
    vec3 baseColor = mix(colorSecondary, colorDust, vHeightLayer);

    // 회오리 영향 시 더 밝은 색상 (햇빛에 반사)
    baseColor = mix(baseColor, colorPrimary, vVortexInfluence * 0.5);

    // 폭풍 시 황금빛 강조
    baseColor += vec3(0.12, 0.06, 0.0) * vMorph;

    // 시간에 따른 미세한 색상 변화
    baseColor += vec3(0.05, 0.03, 0.0) * sin(time * 0.8 + vHeightLayer * 3.14);

    // 공기 왜곡으로 인한 색상 왜곡
    float haze = vDistortion * 0.15;
    baseColor = mix(baseColor, vec3(0.9, 0.8, 0.6), haze);

    gl_FragColor = vec4(baseColor, alpha * 0.92);
  }
`;

// ==================== 컴포넌트 ====================
export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef, contentRef, contentVersion, vortexRef } =
    useParticleBackground();
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // 정면에서 바라보는 시점
    camera.position.set(0, 0, 200);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountElement.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const heightLayers = new Float32Array(PARTICLE_COUNT);
    const particleSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 넓은 영역에 파티클 분포
      positions[i3] = (Math.random() - 0.5) * 550;
      positions[i3 + 1] = (Math.random() - 0.5) * 380;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      randoms[i] = Math.random();

      // 높이 레이어 (0: 바닥 굵은 알갱이, 1: 상층 미세 먼지)
      const heightRandom = Math.random();
      heightLayers[i] = heightRandom * heightRandom;

      // 층별 파티클 크기
      const baseSize = 250 + Math.random() * 80;
      particleSizes[i] = baseSize * (1.0 - heightLayers[i] * 0.5);
    }

    const initialPoints = generatePointsFromContent(contentRef.current);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute(
      "heightLayer",
      new THREE.BufferAttribute(heightLayers, 1)
    );
    geometry.setAttribute(
      "particleSize",
      new THREE.BufferAttribute(particleSizes, 1)
    );
    geometry.setAttribute(
      "targetPos",
      new THREE.BufferAttribute(initialPoints, 3)
    );
    geometry.setAttribute(
      "prevTargetPos",
      new THREE.BufferAttribute(new Float32Array(initialPoints), 3)
    );
    geometryRef.current = geometry;

    const isDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const colors = isDarkMode ? SAND_COLORS.dark : SAND_COLORS.light;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        morphProgress: { value: 0 },
        transitionProgress: { value: 1 },

        // 색상
        colorPrimary: {
          value: new THREE.Vector3(
            colors.primary.r,
            colors.primary.g,
            colors.primary.b
          ),
        },
        colorSecondary: {
          value: new THREE.Vector3(
            colors.secondary.r,
            colors.secondary.g,
            colors.secondary.b
          ),
        },
        colorDust: {
          value: new THREE.Vector3(colors.dust.r, colors.dust.g, colors.dust.b),
        },

        // 회오리 (비활성화)
        vortexActive: { value: 0 },
        vortexCenter: { value: new THREE.Vector2(0, 0) },
        vortexStrength: { value: 0 },
        vortexRadius: { value: VORTEX_CONFIG.minRadius },
        vortexHeight: { value: 0 },

        // 바람 설정
        windSpeed: { value: BREEZE_CONFIG.windSpeed },
        windDirection: { value: BREEZE_CONFIG.windDirection },
        groundBounce: { value: BREEZE_CONFIG.groundBounce },
        midLayerDrift: { value: BREEZE_CONFIG.midLayerDrift },
        highLayerFloat: { value: BREEZE_CONFIG.highLayerFloat },
        surfaceWaveSpeed: { value: BREEZE_CONFIG.surfaceWaveSpeed },
        surfaceWaveScale: { value: BREEZE_CONFIG.surfaceWaveScale },
        clusterStrength: { value: BREEZE_CONFIG.clusterStrength },
        clusterScale: { value: BREEZE_CONFIG.clusterScale },

        // 폭풍 설정
        turbulence: { value: STORM_CONFIG.turbulence },
        gustStrength: { value: STORM_CONFIG.gustStrength },
        gustFrequency: { value: STORM_CONFIG.gustFrequency },
        convergenceForce: { value: STORM_CONFIG.convergenceForce },

        // 회오리 설정
        rotationSpeed: { value: VORTEX_CONFIG.rotationSpeed },
        spiralTightness: { value: VORTEX_CONFIG.spiralTightness },
        suctionStrength: { value: VORTEX_CONFIG.suctionStrength },
        liftForce: { value: VORTEX_CONFIG.liftForce },
        coreDensity: { value: VORTEX_CONFIG.coreDensity },
        edgeDensity: { value: VORTEX_CONFIG.edgeDensity },
        tiltAmount: { value: VORTEX_CONFIG.tiltAmount },
        tiltDirection: { value: VORTEX_CONFIG.tiltDirection },
        maxVortexHeight: { value: VORTEX_CONFIG.maxHeight },
      },
      vertexShader: DESERT_SAND_VERTEX_SHADER,
      fragmentShader: DESERT_SAND_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;

    // 테마 변경 핸들러
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const c = e.matches ? SAND_COLORS.dark : SAND_COLORS.light;
      material.uniforms.colorPrimary.value.set(
        c.primary.r,
        c.primary.g,
        c.primary.b
      );
      material.uniforms.colorSecondary.value.set(
        c.secondary.r,
        c.secondary.g,
        c.secondary.b
      );
      material.uniforms.colorDust.value.set(c.dust.r, c.dust.g, c.dust.b);
    };
    mediaQuery.addEventListener("change", handleThemeChange);

    scene.add(new THREE.Points(geometry, material));

    // ==================== 애니메이션 루프 ====================
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const delta = clock.getDelta();
      material.uniforms.time.value += delta;

      // 모핑 진행도
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
      material.uniforms.transitionProgress.value =
        transitionProgressRef.current;

      // 회오리 상태 업데이트
      const vortex = vortexRef.current;

      // 회오리가 비활성화되면 천천히 strength 감소 (MORPH_OUT과 동일한 속도)
      if (!vortex.active && vortex.strength > 0) {
        vortex.strength = Math.max(0, vortex.strength - VORTEX_FADE_SPEED);
        vortex.radius = 20 + vortex.strength * 160;
        vortex.height = vortex.strength * 250;
      }

      material.uniforms.vortexActive.value = vortex.strength > 0.01 ? 1 : 0;
      material.uniforms.vortexCenter.value.set(vortex.x, vortex.y);
      material.uniforms.vortexStrength.value = vortex.strength;
      material.uniforms.vortexRadius.value = vortex.radius;
      material.uniforms.vortexHeight.value = vortex.height;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // ==================== 리사이즈 ====================
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ==================== 정리 ====================
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
  }, [targetMorphRef, contentRef, vortexRef]);

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

// ==================== ParticleButton Component ====================
interface ParticleButtonProps {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "surface" | "outline" | "ghost";
  onClick?: () => void;
  className?: string;
}

export function ParticleButton({
  children,
  size = "md",
  variant = "default",
  onClick,
  className = "",
}: ParticleButtonProps) {
  // ⭐ ParticleBackground.tsx의 useParticleBackground 사용 (main.tsx에서 제공하는 Provider와 일치)
  const { setHoverContent } = useParticleBackgroundFromBackground();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    // children이 문자열이면 텍스트로 사용
    if (typeof children === "string") {
      console.log("🎨 ParticleButton hover - text:", children);
      setHoverContent({ type: "text", value: children });
      return;
    }

    // React 요소인 경우 (아이콘 등), DOM에서 SVG 추출 시도
    if (React.isValidElement(children) && buttonRef.current) {
      // 버튼 내부의 SVG 요소 찾기
      const svgElement = buttonRef.current.querySelector("svg");
      
      if (svgElement) {
        // SVG가 있으면 SVG 문자열로 변환
        const svgString = svgElement.outerHTML;
        console.log("🎨 ParticleButton hover - SVG found:", svgString.substring(0, 100));
        setHoverContent({ type: "svg", value: svgString });
        return;
      }
    }

    // 배열인 경우 처리
    if (Array.isArray(children)) {
      // 첫 번째 요소가 문자열이면 텍스트로 사용
      const firstChild = children[0];
      if (typeof firstChild === "string") {
        console.log("🎨 ParticleButton hover - array text:", firstChild);
        setHoverContent({ type: "text", value: firstChild });
        return;
      }
      
      // 배열 내에 SVG가 있는지 확인
      if (buttonRef.current) {
        const svgElement = buttonRef.current.querySelector("svg");
        if (svgElement) {
          const svgString = svgElement.outerHTML;
          console.log("🎨 ParticleButton hover - SVG found in array:", svgString.substring(0, 100));
          setHoverContent({ type: "svg", value: svgString });
          return;
        }
      }
    }

    // SVG를 찾지 못한 경우에만 텍스트로 폴백
    console.log("🎨 ParticleButton hover - no SVG found, skipping");
  }, [children, setHoverContent]);

  const handleMouseLeave = useCallback(() => {
    setHoverContent(null);
  }, [setHoverContent]);

  return (
    <button
      ref={buttonRef}
      className={`particle-button particle-button-${variant} particle-button-${size} ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}