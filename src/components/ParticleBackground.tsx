/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useState,
} from "react";
import * as THREE from "three";

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

// 연기 색상 팔레트 (부드러운 회색 그라데이션, 어두운 배경에 잘 어울림)
const SMOKE_COLORS = {
  dark: {
    primary: { r: 0.8, g: 0.8, b: 0.85 }, // 연한 회백색 (연기 코어)
    secondary: { r: 0.4, g: 0.4, b: 0.45 }, // 중간 회색
    dust: { r: 0.2, g: 0.2, b: 0.25 }, // 어두운 연기 가장자리
  },
  light: {
    primary: { r: 0.6, g: 0.6, b: 0.65 }, // 밝은 배경용 연한 회색
    secondary: { r: 0.3, g: 0.3, b: 0.35 },
    dust: { r: 0.1, g: 0.1, b: 0.15 },
  },
} as const;

// 평상시 연기 부유 설정 (천천히 퍼지며 상승하는 자연스러운 흐름)
const SMOKE_DRIFT_CONFIG = {
  // 기본 부유
  riseSpeed: 0.8, // 천천히 위로 상승 (연기 상승 기류)
  driftSpeed: 0.6, // 가로 드리프트 속도
  driftDirection: 1.0, // 드리프트 방향
  // 층별 움직임
  lowLayerSwirl: 1.2, // 하층: 가벼운 소용돌이
  midLayerFloat: 1.5, // 중간층: 부드러운 부유
  highLayerDiffuse: 0.9, // 상층: 확산
  // 물결/파동
  waveSpeed: 0.3, // 연기 물결 속도
  waveScale: 0.02, // 물결 스케일
  // 군집/클러스터
  clusterStrength: 1.2, // 연기 덩어리
  clusterScale: 0.01, // 클러스터 크기
} as const;

// 회오리 설정 (연기 기둥처럼 부드럽게 솟아오르는 형태)
const SMOKE_VORTEX_CONFIG = {
  // 성장
  growthRate: 0.12, // 누르는 시간에 따른 성장률 (부드럽게)
  maxRadius: 150.0, // 최대 반경 (넓게 퍼짐)
  minRadius: 15.0, // 최소 반경
  maxHeight: 300.0, // 최대 높이 (연기 기둥)
  // 회전
  rotationSpeed: 2.2, // 회전 속도 (느리게)
  spiralTightness: 0.025, // 나선 조임 (부드럽게)
  // 흡입력
  suctionStrength: 10.0, // 아래에서 빨아들이는 힘 (연기 흡입)
  liftForce: 12.0, // 위로 솟구치는 힘 (강하게 상승)
  // 밀도
  coreDensity: 0.8, // 중심부 밀도 (부드럽게)
  edgeDensity: 0.2, // 가장자리 밀도 (옅게 퍼짐)
  // 기울기 (연기 흐름처럼 살짝 기울어짐)
  tiltAmount: 0.12,
  tiltDirection: 1.0,
} as const;

// 연기 형성 설정 (버튼 호버 시 - 텍스트 형성)
const SMOKE_FORM_CONFIG = {
  turbulence: 3.5, // 난류 강도 (부드럽게)
  gustStrength: 8.0, // 돌풍 강도
  gustFrequency: 0.5, // 돌풍 빈도
  convergenceForce: 0.7, // 수렴력 (부드럽게 모임)
  smokeLayerCount: 6, // 연기 층 수
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
    radius: SMOKE_VORTEX_CONFIG.minRadius,
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

// ==================== 연기 Shader ====================
const SMOKE_VERTEX_SHADER = `
  attribute float random;
  attribute float heightLayer;    // 0: 하층(두꺼운 연기), 1: 상층(미세 연기)
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

  // 부유 설정
  uniform float riseSpeed;
  uniform float driftSpeed;
  uniform float driftDirection;
  uniform float lowLayerSwirl;
  uniform float midLayerFloat;
  uniform float highLayerDiffuse;
  uniform float waveSpeed;
  uniform float waveScale;
  uniform float clusterStrength;
  uniform float clusterScale;

  // 형성 설정 (텍스트 형성)
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

    // 높이에 따른 레이어 효과 (0: 하층 두꺼운 연기, 1: 상층 미세 연기)
    float layerFactor = heightLayer;

    // ========== 평상시: 연기 부유 ==========

    // 1. 지속적인 상승 기류 + 가로 드리프트
    float baseRise = time * riseSpeed;
    float driftNoise = snoise(vec3(pos.x * 0.008, pos.y * 0.008, time * 0.2)) * 0.4;

    // 2. 층별 움직임
    // 하층 (heightLayer ~0): 가벼운 소용돌이
    float lowEffect = (1.0 - layerFactor) * lowLayerSwirl;
    float swirl = sin(time * 1.8 + random * 6.28 + pos.x * 0.01) * lowEffect;

    // 중간층: 부드러운 부유
    float midEffect = (1.0 - abs(layerFactor - 0.5) * 2.0) * midLayerFloat;
    float midFloat = sin(time * 0.6 + pos.y * 0.005 + random * 3.14) * midEffect * 8.0;

    // 상층 (heightLayer ~1): 확산 (퍼짐)
    float highEffect = layerFactor * highLayerDiffuse;
    float diffuseX = cos(time * 0.2 + random * 6.28) * highEffect * 12.0;
    float diffuseY = sin(time * 0.25 + random * 4.0) * highEffect * 10.0;

    // 3. 연기 물결 (부드러운 파동)
    float smokeWave = sin(time * waveSpeed + pos.x * waveScale * 40.0) *
                      cos(time * waveSpeed * 0.6 + pos.y * waveScale * 25.0) *
                      (1.0 - layerFactor) * 4.0;

    // 4. 군집 움직임 (연기 덩어리)
    vec3 clusterPos = vec3(pos.x * clusterScale, pos.y * clusterScale, time * 0.1);
    float clusterX = snoise(clusterPos) * clusterStrength * 20.0;
    float clusterY = snoise(clusterPos + vec3(100.0, 0.0, 0.0)) * clusterStrength * 15.0;

    // 연기 부유 최종 위치
    vec3 driftMove = vec3(
      driftSpeed * driftDirection + driftNoise * 8.0 + diffuseX + clusterX + swirl,
      baseRise + midFloat + smokeWave + clusterY + diffuseY,
      snoise(vec3(pos.xy * 0.008, time * 0.3)) * 4.0 * (0.3 + layerFactor * 0.7)
    );

    // ========== 회오리 효과 (연기 기둥) ==========
    float vortexInfluence = 0.0;
    vec3 vortexMove = vec3(0.0);

    if (vortexActive > 0.5 && vortexStrength > 0.01) {
      // 회오리 중심과의 거리
      vec2 toVortex = pos.xy - vortexCenter;
      float distToVortex = length(toVortex);
      float normalizedDist = distToVortex / vortexRadius;

      // 회오리 영향 범위 (부드럽게 퍼짐)
      vortexInfluence = smoothstep(1.2, 0.0, normalizedDist) * vortexStrength;

      if (vortexInfluence > 0.01) {
        // 1. 회전 운동 (부드러운 나선)
        float angle = atan(toVortex.y, toVortex.x);
        float spiralAngle = angle + time * rotationSpeed * (1.0 + vortexStrength);

        // 중심에 가까울수록 부드럽게 회전
        float rotSpeed = rotationSpeed * (1.0 + (1.0 - normalizedDist) * 1.5);
        spiralAngle += time * rotSpeed;

        // 나선형 확산 (시간이 지날수록 퍼짐)
        float spiralRadius = distToVortex * (1.0 + vortexStrength * spiralTightness * 0.3);

        vec2 rotatedPos = vec2(
          cos(spiralAngle) * spiralRadius,
          sin(spiralAngle) * spiralRadius
        );

        // 2. 흡입력 (아래 연기 끌어당김)
        float suction = suctionStrength * vortexInfluence * (1.0 - layerFactor * 0.3);
        vec2 suctionDir = -normalize(toVortex + vec2(0.001));

        // 3. 상승 기류 (강하게 위로)
        // 중심부에 가까울수록 강하게 상승
        float lift = liftForce * vortexInfluence * vortexStrength;
        lift *= (1.0 - normalizedDist * 0.4); // 중심부가 더 강함

        // 높이 제한 (회오리 높이에 따라)
        float maxLift = vortexHeight * (1.0 - normalizedDist * 0.2);
        float currentLift = lift * (1.0 - smoothstep(0.0, maxLift, pos.y + 80.0));

        // 4. 기울기 (연기 흐름처럼 살짝 기울어짐)
        float tilt = tiltAmount * vortexStrength * pos.y * 0.008 * tiltDirection;

        // 5. 밀도 변화 (중심부는 부드럽게, 가장자리는 옅음)
        float densityFactor = mix(edgeDensity, coreDensity, 1.0 - normalizedDist);

        // 회오리 움직임 합성
        vortexMove = vec3(
          (rotatedPos.x - toVortex.x) * vortexInfluence + suctionDir.x * suction + tilt,
          currentLift + (rotatedPos.y - toVortex.y) * vortexInfluence * 0.4,
          suctionDir.y * suction * 0.4
        );

        // 난류 추가 (연기 내부의 부드러운 불규칙)
        vec3 turbNoisePos = vec3(pos.xy * 0.015, time * 1.2);
        vortexMove += vec3(
          snoise(turbNoisePos) * 6.0,
          snoise(turbNoisePos + vec3(50.0, 0.0, 0.0)) * 5.0,
          snoise(turbNoisePos + vec3(0.0, 50.0, 0.0)) * 3.0
        ) * vortexInfluence * vortexStrength;
      }
    }

    // ========== 텍스트 형성 모드 (버튼 호버) ==========
    vec3 formMove = vec3(0.0);

    if (morphProgress > 0.01) {
      // 터뷸런스 (부드럽게)
      vec3 turbPos = vec3(pos.xy * 0.01, time * 0.5);
      float turbX = snoise(turbPos) * turbulence;
      float turbY = snoise(turbPos + vec3(80.0, 0.0, 0.0)) * turbulence * 0.7;

      // 돌풍 (부드럽게)
      float gustTime = time * gustFrequency;
      float gust = sin(gustTime + random * 6.28) * cos(gustTime * 0.6) * gustStrength;

      formMove = vec3(turbX + gust, turbY, snoise(turbPos + vec3(0.0, 80.0, 0.0)) * turbulence * 0.4);
    }

    // ========== 최종 위치 계산 ==========

    // 1. 기본 위치 계산: position → currentTarget 직접 보간
    vec3 morphedPos = mix(position, currentTarget, morphProgress);

    // 2. 평상시 연기 부유 효과 (morphProgress가 낮을 때만)
    float driftIntensity = (1.0 - morphProgress) * (1.0 - morphProgress);
    morphedPos += driftMove * driftIntensity;

    // 3. 형성 효과 (morphProgress 중간 단계에서)
    float formIntensity = morphProgress * (1.0 - morphProgress) * 3.5; // 0.5에서 최대
    morphedPos += formMove * formIntensity * 0.6;

    // 4. 회오리 효과 (클릭 시, morphProgress와 독립적)
    morphedPos += vortexMove * (1.0 - morphProgress * 0.25);

    pos = morphedPos;

    // ========== 형태 유지 시 살아있는 움직임 ==========
    if (morphProgress > 0.5) {
      float aliveIntensity = (morphProgress - 0.5) * 2.0; // 0.5~1.0 → 0~1

      // 1. 호흡하는 듯한 팽창/수축 (연기 숨쉬기)
      float breathe = sin(time * 1.0) * 0.4 + sin(time * 0.5) * 0.25;
      vec3 breatheMove = normalize(currentTarget) * breathe * 2.0 * aliveIntensity;

      // 2. 파동 효과 (연기 표면 물결) - 부드럽게
      float wavePhase = length(currentTarget.xy) * 0.04 + time * 1.8;
      float wave = sin(wavePhase + random * 6.28) * 0.4;
      vec3 waveMove = vec3(
        cos(wavePhase) * wave,
        sin(wavePhase * 0.7) * wave,
        sin(wavePhase * 1.0) * wave * 0.25
      ) * aliveIntensity;

      // 3. 개별 파티클 떨림 (부드럽게)
      vec3 jitter = vec3(
        sin(time * 6.0 + random * 25.0),
        cos(time * 5.5 + random * 20.0),
        sin(time * 4.5 + random * 15.0)
      ) * 0.6 * aliveIntensity;

      // 4. 형태 가장자리 흔들림 (외곽이 더 퍼짐) - 부드럽게
      float edgeFactor = smoothstep(0.0, 40.0, length(currentTarget.xy));
      vec3 edgeWobble = vec3(
        sin(time * 2.5 + currentTarget.x * 0.08) * 0.6,
        cos(time * 2.0 + currentTarget.y * 0.08) * 0.6,
        sin(time * 1.5) * 0.3
      ) * edgeFactor * aliveIntensity;

      pos += breatheMove + waveMove + jitter + edgeWobble;
    }

    // 기본 진동 (항상 적용, 부드럽게)
    vec3 vibration = vec3(
      sin(time * 4.0 + random * 15.0) * 0.3,
      cos(time * 3.5 + random * 12.0) * 0.3,
      sin(time * 2.5 + random * 8.0) * 0.2
    ) * (morphProgress * 0.6 + vortexInfluence * 0.7);
    pos += vibration;

    // ========== 출력 ==========

    // 알파값 (연기처럼 부드럽게 페이드)
    float distFade = 1.0 - smoothstep(180.0, 350.0, length(pos.xy));
    float vortexBrightness = 1.0 + vortexInfluence * 0.4;
    float formBrightness = 1.0 + morphProgress * 0.25;

    // 층별 기본 알파 (상층이 더 옅음)
    float layerAlpha = mix(0.6, 0.3, layerFactor);

    vAlpha = layerAlpha * distFade * vortexBrightness * formBrightness;
    vHeightLayer = heightLayer;
    vMorph = morphProgress;
    vVortexInfluence = vortexInfluence;

    // 공기 왜곡 효과 (연기 왜곡)
    vDistortion = vortexInfluence * vortexStrength + morphProgress * 0.25;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // 파티클 크기 (연기처럼 부드럽게 변함)
    // 하층: 약간 크고 부드러움, 상층: 작고 퍼짐
    float layerSize = mix(1.2, 0.8, layerFactor);
    float vortexSize = 1.0 + vortexInfluence * 0.3;
    float formSize = 1.0 + morphProgress * 0.15;

    float finalSize = particleSize * layerSize * vortexSize * formSize;
    gl_PointSize = (finalSize / -mvPos.z) * (0.9 + random * 0.3);
  }
`;

const SMOKE_FRAGMENT_SHADER = `
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

    // 부드러운 가우시안 분포 (연기처럼 퍼짐)
    float alpha = exp(-dist * dist * 4.0); // 가우시안: exp(-dist^2)
    alpha = smoothstep(0.0, 1.0, alpha);
    alpha *= vAlpha;

    // 층별 색상 (하층: 진한 회색, 상층: 옅은 회백색)
    vec3 baseColor = mix(colorSecondary, colorDust, vHeightLayer);

    // 회오리 영향 시 더 옅은 색상 (연기 밝아짐)
    baseColor = mix(baseColor, colorPrimary, vVortexInfluence * 0.4);

    // 형성 시 약간의 회색 강조
    baseColor += vec3(0.05, 0.05, 0.05) * vMorph;

    // 시간에 따른 미세한 색상 변화 (연기 흐름)
    baseColor += vec3(0.03, 0.03, 0.03) * sin(time * 0.6 + vHeightLayer * 3.14);

    // 공기 왜곡으로 인한 색상 페이드 (연기 흐려짐)
    float haze = vDistortion * 0.12;
    baseColor = mix(baseColor, vec3(0.85, 0.85, 0.9), haze);

    gl_FragColor = vec4(baseColor, alpha * 0.85);
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

      // 높이 레이어 (0: 하층 두꺼운 연기, 1: 상층 미세 연기)
      const heightRandom = Math.random();
      heightLayers[i] = heightRandom * heightRandom;

      // 층별 파티클 크기 (연기처럼 부드럽게)
      const baseSize = 220 + Math.random() * 60;
      particleSizes[i] = baseSize * (1.0 - heightLayers[i] * 0.4);
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
    const colors = isDarkMode ? SMOKE_COLORS.dark : SMOKE_COLORS.light;

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
        vortexRadius: { value: SMOKE_VORTEX_CONFIG.minRadius },
        vortexHeight: { value: 0 },

        // 부유 설정
        riseSpeed: { value: SMOKE_DRIFT_CONFIG.riseSpeed },
        driftSpeed: { value: SMOKE_DRIFT_CONFIG.driftSpeed },
        driftDirection: { value: SMOKE_DRIFT_CONFIG.driftDirection },
        lowLayerSwirl: { value: SMOKE_DRIFT_CONFIG.lowLayerSwirl },
        midLayerFloat: { value: SMOKE_DRIFT_CONFIG.midLayerFloat },
        highLayerDiffuse: { value: SMOKE_DRIFT_CONFIG.highLayerDiffuse },
        waveSpeed: { value: SMOKE_DRIFT_CONFIG.waveSpeed },
        waveScale: { value: SMOKE_DRIFT_CONFIG.waveScale },
        clusterStrength: { value: SMOKE_DRIFT_CONFIG.clusterStrength },
        clusterScale: { value: SMOKE_DRIFT_CONFIG.clusterScale },

        // 형성 설정
        turbulence: { value: SMOKE_FORM_CONFIG.turbulence },
        gustStrength: { value: SMOKE_FORM_CONFIG.gustStrength },
        gustFrequency: { value: SMOKE_FORM_CONFIG.gustFrequency },
        convergenceForce: { value: SMOKE_FORM_CONFIG.convergenceForce },

        // 회오리 설정
        rotationSpeed: { value: SMOKE_VORTEX_CONFIG.rotationSpeed },
        spiralTightness: { value: SMOKE_VORTEX_CONFIG.spiralTightness },
        suctionStrength: { value: SMOKE_VORTEX_CONFIG.suctionStrength },
        liftForce: { value: SMOKE_VORTEX_CONFIG.liftForce },
        coreDensity: { value: SMOKE_VORTEX_CONFIG.coreDensity },
        edgeDensity: { value: SMOKE_VORTEX_CONFIG.edgeDensity },
        tiltAmount: { value: SMOKE_VORTEX_CONFIG.tiltAmount },
        tiltDirection: { value: SMOKE_VORTEX_CONFIG.tiltDirection },
        maxVortexHeight: { value: SMOKE_VORTEX_CONFIG.maxHeight },
      },
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.NormalBlending, // 연기처럼 부드럽게 (Additive 대신 Normal)
      depthWrite: false,
    });
    materialRef.current = material;

    // 테마 변경 핸들러
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const c = e.matches ? SMOKE_COLORS.dark : SMOKE_COLORS.light;
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

      // 회오리가 비활성화되면 천천히 strength 감소
      if (!vortex.active && vortex.strength > 0) {
        vortex.strength = Math.max(0, vortex.strength - VORTEX_FADE_SPEED);
        vortex.radius = 15 + vortex.strength * 135;
        vortex.height = vortex.strength * 300;
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