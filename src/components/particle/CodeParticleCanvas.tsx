/**
 * CodeParticleCanvas - Code Text Particle Effect
 *
 * Sand 모드를 기반으로 파티클을 랜덤한 코드 문자로 렌더링합니다.
 * - 각 파티클이 랜덤한 코드 문자(숫자, 영문, 기호)로 표시됨
 * - Sand 모드의 물리적 움직임과 모핑 효과 유지
 * - Three.js InstancedMesh + 문자 텍스처 아틀라스 사용
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useParticleBackground } from "./ParticleContext";
import { generatePointsFromContent } from "./canvasUtils";
import {
  PARTICLE_COUNT,
  MORPH_IN_SPEED,
  MORPH_OUT_SPEED,
  TRANSITION_SPEED,
  VORTEX_FADE_SPEED,
} from "./constants";
import { sandPreset } from "./presets";

// ==================== Constants ====================
const CODE_PARTICLE_COUNT = Math.min(PARTICLE_COUNT, 10000);
const TEXTURE_CHAR_SIZE = 24; // 텍스처 해상도

// 코드 문자셋 (프로그래밍 + 카타카나 + 한글 - Matrix 스타일)
// 한글: 자음(14) + 모음(10) + 조합글자
const KOREAN_CONSONANTS = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ";
const KOREAN_VOWELS = "ㅏㅓㅗㅜㅡㅣㅐㅔㅑㅕ";
const KOREAN_SYLLABLES = (() => {
  let result = "";
  for (const c of KOREAN_CONSONANTS) {
    for (const v of KOREAN_VOWELS) {
      // 초성(자음) + 중성(모음) 조합으로 한글 음절 생성
      const code = 0xac00 + (c.charCodeAt(0) - 0x3131) * 588 + (v.charCodeAt(0) - 0x314f) * 28;
      if (code >= 0xac00 && code <= 0xd7a3) {
        result += String.fromCharCode(code);
      }
    }
  }
  return result;
})();

// 일본어: 히라가나 + 카타카나
const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

const CODE_CHARS =
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz" +
  "{}[]()<>+-*/=!?;:.,@#$%^&|~`_\\\"'" +
  HIRAGANA + KATAKANA +
  KOREAN_CONSONANTS + KOREAN_VOWELS + KOREAN_SYLLABLES;

// ==================== Character Texture Atlas ====================
function createCodeCharacterAtlas(): THREE.CanvasTexture {
  const charsPerRow = 12;
  const rows = Math.ceil(CODE_CHARS.length / charsPerRow);
  const atlasWidth = charsPerRow * TEXTURE_CHAR_SIZE;
  const atlasHeight = rows * TEXTURE_CHAR_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext("2d")!;

  // 배경 투명
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  // 폰트 설정 - 코드 스타일 monospace
  ctx.font = `bold ${TEXTURE_CHAR_SIZE * 0.7}px "Fira Code", "Source Code Pro", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < CODE_CHARS.length; i++) {
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    const x = col * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;
    const y = row * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;

    // 글로우 효과 (녹색/청록색 코드 느낌)
    ctx.shadowColor = "rgba(0, 255, 180, 0.8)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#00ffaa";
    ctx.fillText(CODE_CHARS[i], x, y);

    // 더 선명하게 한번 더
    ctx.shadowBlur = 0;
    ctx.fillText(CODE_CHARS[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

// ==================== Vertex Shader ====================
const CODE_VERTEX_SHADER = `
  attribute float charIndex;
  attribute float random;
  attribute float heightLayer;
  attribute float particleSize;
  attribute vec3 targetPos;
  attribute vec3 prevTargetPos;

  uniform float time;
  uniform float morphProgress;
  uniform float transitionProgress;

  // 부유/바람 설정
  uniform float primarySpeed;
  uniform float primaryDirection;
  uniform float lowLayerEffect;
  uniform float midLayerEffect;
  uniform float highLayerEffect;
  uniform float waveSpeed;
  uniform float waveScale;
  uniform float clusterStrength;
  uniform float clusterScale;

  // 형성 설정
  uniform float turbulence;
  uniform float gustStrength;
  uniform float gustFrequency;
  uniform float convergenceForce;
  uniform float formIntensityMultiplier;
  uniform float aliveBreathScale;
  uniform float vibrationScale;

  // 회오리 설정
  uniform float vortexActive;
  uniform vec2 vortexCenter;
  uniform float vortexStrength;
  uniform float vortexRadius;
  uniform float vortexHeight;
  uniform float rotationSpeed;
  uniform float spiralTightness;
  uniform float suctionStrength;
  uniform float liftForce;
  uniform float coreDensity;
  uniform float edgeDensity;
  uniform float tiltAmount;
  uniform float tiltDirection;
  uniform float maxVortexHeight;

  varying vec2 vUv;
  varying float vCharIndex;
  varying float vAlpha;
  varying float vMorphProgress;

  // 심플렉스 노이즈 함수
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
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
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
    vUv = uv;
    vCharIndex = charIndex;
    vMorphProgress = morphProgress;

    // 타겟 포지션 전환
    vec3 currentTarget = mix(prevTargetPos, targetPos, transitionProgress);
    vec3 pos = position;

    // ===== 부유/바람 효과 =====
    float layerEffect = mix(
      mix(lowLayerEffect, midLayerEffect, heightLayer),
      highLayerEffect,
      heightLayer * heightLayer
    );

    // 기본 바람
    float windX = sin(time * primarySpeed + pos.y * 0.02) * layerEffect * 3.0 * primaryDirection;
    float windY = cos(time * primarySpeed * 0.7 + pos.x * 0.015) * layerEffect * 1.5;

    // 큰 파동
    float wave = snoise(vec3(pos.xy * waveScale, time * waveSpeed)) * layerEffect * 8.0;

    // 군집 효과
    float cluster = snoise(vec3(pos.xy * clusterScale + time * 0.1, random * 10.0)) * clusterStrength;

    vec3 driftOffset = vec3(windX + wave, windY + cluster, 0.0);

    // ===== 형성/모핑 효과 =====
    float formIntensity = morphProgress * formIntensityMultiplier;

    vec3 toTarget = currentTarget - pos;
    float dist = length(toTarget);
    vec3 dir = normalize(toTarget + vec3(0.001));

    // 거리 기반 수렴
    float pullStrength = convergenceForce * formIntensity * (1.0 + dist * 0.01);
    vec3 convergence = dir * pullStrength * 15.0;

    // 난류
    float turbNoise = snoise(pos * 0.02 + vec3(time * 0.3, time * 0.2, random)) * turbulence * formIntensity;
    vec3 turbulenceOffset = vec3(turbNoise, turbNoise * 0.8, turbNoise * 0.5);

    // 돌풍
    float gustPhase = time * gustFrequency + random * 6.28;
    float gustMask = smoothstep(0.7, 1.0, sin(gustPhase));
    vec3 gustOffset = vec3(
      sin(gustPhase * 2.3) * gustStrength,
      cos(gustPhase * 1.7) * gustStrength * 0.6,
      0.0
    ) * gustMask * formIntensity * 0.3;

    // 숨쉬는 효과
    float breath = sin(time * 1.5 + random * 6.28) * aliveBreathScale * morphProgress;
    vec3 breathOffset = dir * breath;

    // 미세 진동
    vec3 vibration = vec3(
      snoise(pos * 0.1 + vec3(0.0, 0.0, time * 3.0)),
      snoise(pos * 0.1 + vec3(100.0, 100.0, time * 3.0)),
      0.0
    ) * vibrationScale * morphProgress;

    // ===== 회오리 효과 =====
    vec3 vortexOffset = vec3(0.0);
    if (vortexActive > 0.5 && vortexStrength > 0.01) {
      vec2 toVortex = pos.xy - vortexCenter;
      float vDist = length(toVortex);

      float influence = smoothstep(vortexRadius * 1.5, 0.0, vDist);
      influence *= vortexStrength;

      float angle = atan(toVortex.y, toVortex.x);
      float rotAngle = angle + time * rotationSpeed * (1.0 + (1.0 - vDist / vortexRadius) * 2.0);

      float spiralR = vDist * (1.0 - influence * spiralTightness);
      vec2 rotatedPos = vec2(cos(rotAngle), sin(rotAngle)) * spiralR;

      vec2 suctionDir = -normalize(toVortex + vec2(0.001));
      float suctionForce = suctionStrength * influence * (1.0 - vDist / vortexRadius);

      float heightProgress = vDist / vortexRadius;
      float targetHeight = vortexHeight * (1.0 - heightProgress * heightProgress);
      float currentLift = (targetHeight - pos.z) * liftForce * influence;

      float tiltOffset = sin(angle + tiltDirection) * tiltAmount * vortexHeight * influence;

      vortexOffset = vec3(
        (rotatedPos.x - toVortex.x) * influence + suctionDir.x * suctionForce,
        (rotatedPos.y - toVortex.y) * influence + suctionDir.y * suctionForce,
        currentLift + tiltOffset
      );
    }

    // ===== 최종 위치 =====
    vec3 alivePos = pos + driftOffset;

    // 형태 유지 시 오프셋 대폭 감소 (morphProgress가 높을수록 타겟에 가깝게)
    float formStability = morphProgress * morphProgress; // 비선형 감소
    float offsetScale = 1.0 - formStability * 0.9; // morphProgress=1일 때 10%만 적용

    vec3 formedPos = currentTarget + (turbulenceOffset + gustOffset + breathOffset + vibration) * offsetScale * 0.3;
    vec3 blendedPos = mix(alivePos, formedPos, morphProgress);

    // 수렴력: morphProgress가 높을 때 더 강하게 타겟으로
    blendedPos += convergence * (1.0 - morphProgress * 0.9);
    blendedPos += vortexOffset;

    // ===== 알파 계산 =====
    float baseAlpha = mix(0.7, 0.4, heightLayer);
    float morphAlpha = 1.0 - morphProgress * 0.2;
    float distAlpha = smoothstep(300.0, 0.0, dist) * morphProgress + (1.0 - morphProgress);
    vAlpha = baseAlpha * morphAlpha * distAlpha;

    // ===== 포인트 크기 =====
    vec4 mvPosition = modelViewMatrix * vec4(blendedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 문자 크기 조정
    float sizeMod = 1.0 + morphProgress * 0.3;
    gl_PointSize = particleSize * sizeMod * (200.0 / -mvPosition.z);
  }
`;

// ==================== Fragment Shader ====================
const CODE_FRAGMENT_SHADER = `
  uniform sampler2D charAtlas;
  uniform float charsPerRow;
  uniform float charRows;
  uniform float time;

  uniform vec3 colorPrimary;
  uniform vec3 colorSecondary;
  uniform vec3 morphColorTint;

  varying vec2 vUv;
  varying float vCharIndex;
  varying float vAlpha;
  varying float vMorphProgress;

  void main() {
    // 포인트 UV 계산
    vec2 pointUV = gl_PointCoord;

    // 아틀라스에서 문자 UV 계산
    float charIdx = floor(vCharIndex);
    float col = mod(charIdx, charsPerRow);
    float row = floor(charIdx / charsPerRow);

    vec2 charUV = vec2(
      (col + pointUV.x) / charsPerRow,
      (row + (1.0 - pointUV.y)) / charRows
    );

    vec4 texColor = texture2D(charAtlas, charUV);

    // 색상 계산 - 녹색/청록색 코드 느낌
    vec3 baseColor = mix(colorPrimary, colorSecondary, pointUV.y * 0.5 + 0.25);

    // 모핑 시 색상 틴트
    baseColor = mix(baseColor, baseColor + morphColorTint, vMorphProgress * 0.5);

    // 깜빡임 효과
    float flicker = 0.9 + 0.1 * sin(time * 8.0 + vCharIndex * 1.5);
    baseColor *= flicker;

    // 최종 알파
    float alpha = texColor.a * vAlpha;

    if (alpha < 0.05) discard;

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

// ==================== Component Props ====================
interface CodeParticleCanvasProps {
  afterImageDamp?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}

// ==================== Component ====================
export function CodeParticleCanvas({
  afterImageDamp = 0.5,
  bloomStrength = 0.6,
  bloomRadius = 0.5,
  bloomThreshold = 0.4,
}: CodeParticleCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef, contentRef, contentVersion, vortexRef } =
    useParticleBackground();
  // 마운트 시 현재 targetMorphRef 값으로 초기화 (효과 모드 전환 시 형태 유지)
  const morphProgressRef = useRef(targetMorphRef.current);
  const transitionProgressRef = useRef(1);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  const preset = sandPreset; // Sand 모드 기반

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

    // 형태 간 전환: transitionProgress를 0으로 리셋하여 부드러운 이동 애니메이션
    // (prevTargetPos에서 새 targetPos로 자연스럽게 전환)
    transitionProgressRef.current = 0;
  }, [contentVersion, contentRef]);

  // Three.js 초기화 및 애니메이션
  useEffect(() => {
    if (!mountRef.current) return;

    const mountElement = mountRef.current;

    // Scene 설정
    const scene = new THREE.Scene();
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
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountElement.appendChild(renderer.domElement);

    // 문자 아틀라스 생성
    const charAtlas = createCodeCharacterAtlas();
    const charsPerRow = 12;
    const charRows = Math.ceil(CODE_CHARS.length / charsPerRow);

    // Geometry 생성
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CODE_PARTICLE_COUNT * 3);
    const charIndices = new Float32Array(CODE_PARTICLE_COUNT);
    const randoms = new Float32Array(CODE_PARTICLE_COUNT);
    const heightLayers = new Float32Array(CODE_PARTICLE_COUNT);
    const particleSizes = new Float32Array(CODE_PARTICLE_COUNT);

    for (let i = 0; i < CODE_PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 550;
      positions[i3 + 1] = (Math.random() - 0.5) * 380;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      // 랜덤 문자 인덱스
      charIndices[i] = Math.floor(Math.random() * CODE_CHARS.length);

      randoms[i] = Math.random();

      const heightRandom = Math.random();
      heightLayers[i] = heightRandom * heightRandom;

      const baseSize = 30 + Math.random() * 10; // 1/6 크기로 축소 (180-240 → 30-40)
      particleSizes[i] = baseSize * (1.0 - heightLayers[i] * 0.4);
    }

    const initialPoints = generatePointsFromContent(contentRef.current);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("charIndex", new THREE.BufferAttribute(charIndices, 1));
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute("heightLayer", new THREE.BufferAttribute(heightLayers, 1));
    geometry.setAttribute("particleSize", new THREE.BufferAttribute(particleSizes, 1));
    geometry.setAttribute("targetPos", new THREE.BufferAttribute(initialPoints, 3));
    geometry.setAttribute(
      "prevTargetPos",
      new THREE.BufferAttribute(new Float32Array(initialPoints), 3)
    );
    geometryRef.current = geometry;

    // 코드 스타일 색상 (녹색/청록색)
    const colorPrimary = new THREE.Vector3(0.0, 1.0, 0.7); // 청록색
    const colorSecondary = new THREE.Vector3(0.0, 0.8, 0.5); // 진한 청록
    const morphColorTint = new THREE.Vector3(0.1, 0.2, 0.1); // 녹색 틴트

    const tweaks = preset.shaderTweaks ?? {};

    // Material 생성
    const material = new THREE.ShaderMaterial({
      uniforms: {
        charAtlas: { value: charAtlas },
        charsPerRow: { value: charsPerRow },
        charRows: { value: charRows },
        time: { value: 0 },
        morphProgress: { value: morphProgressRef.current }, // 현재 값으로 초기화 (모드 전환 시 형태 유지)
        transitionProgress: { value: transitionProgressRef.current },

        // 색상
        colorPrimary: { value: colorPrimary },
        colorSecondary: { value: colorSecondary },
        morphColorTint: { value: morphColorTint },

        // 회오리 상태
        vortexActive: { value: 0 },
        vortexCenter: { value: new THREE.Vector2(0, 0) },
        vortexStrength: { value: 0 },
        vortexRadius: { value: preset.vortex.minRadius },
        vortexHeight: { value: 0 },

        // 부유/바람 설정
        primarySpeed: { value: preset.drift.primarySpeed },
        primaryDirection: { value: preset.drift.primaryDirection },
        lowLayerEffect: { value: preset.drift.lowLayerEffect },
        midLayerEffect: { value: preset.drift.midLayerEffect },
        highLayerEffect: { value: preset.drift.highLayerEffect },
        waveSpeed: { value: preset.drift.waveSpeed },
        waveScale: { value: preset.drift.waveScale },
        clusterStrength: { value: preset.drift.clusterStrength },
        clusterScale: { value: preset.drift.clusterScale },

        // 형성 설정
        turbulence: { value: preset.form.turbulence },
        gustStrength: { value: preset.form.gustStrength },
        gustFrequency: { value: preset.form.gustFrequency },
        convergenceForce: { value: preset.form.convergenceForce },

        // 회오리 설정
        rotationSpeed: { value: preset.vortex.rotationSpeed },
        spiralTightness: { value: preset.vortex.spiralTightness },
        suctionStrength: { value: preset.vortex.suctionStrength },
        liftForce: { value: preset.vortex.liftForce },
        coreDensity: { value: preset.vortex.coreDensity },
        edgeDensity: { value: preset.vortex.edgeDensity },
        tiltAmount: { value: preset.vortex.tiltAmount },
        tiltDirection: { value: preset.vortex.tiltDirection },
        maxVortexHeight: { value: preset.vortex.maxHeight },

        // 테마별 조정
        formIntensityMultiplier: { value: tweaks.formIntensityMultiplier ?? 4.0 },
        aliveBreathScale: { value: tweaks.aliveBreathScale ?? 2.5 },
        vibrationScale: { value: tweaks.vibrationScale ?? 0.7 },
      },
      vertexShader: CODE_VERTEX_SHADER,
      fragmentShader: CODE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    scene.add(new THREE.Points(geometry, material));

    // ==================== Post-processing ====================
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new AfterimagePass(afterImageDamp));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // 문자 변경 타이머
    const charChangeTimers = new Float32Array(CODE_PARTICLE_COUNT);
    for (let i = 0; i < CODE_PARTICLE_COUNT; i++) {
      charChangeTimers[i] = Math.random() * 60;
    }

    // 애니메이션 루프
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const vortexFadeMultiplier = tweaks.vortexFadeMultiplier ?? 160;

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
      material.uniforms.transitionProgress.value = transitionProgressRef.current;

      // 회오리 상태 업데이트
      const vortex = vortexRef.current;

      if (!vortex.active && vortex.strength > 0) {
        vortex.strength = Math.max(0, vortex.strength - VORTEX_FADE_SPEED);
        vortex.radius = preset.vortex.minRadius + vortex.strength * vortexFadeMultiplier;
        vortex.height = vortex.strength * preset.vortex.maxHeight;
      }

      material.uniforms.vortexActive.value = vortex.strength > 0.01 ? 1 : 0;
      material.uniforms.vortexCenter.value.set(vortex.x, vortex.y);
      material.uniforms.vortexStrength.value = vortex.strength;
      material.uniforms.vortexRadius.value = vortex.radius;
      material.uniforms.vortexHeight.value = vortex.height;

      // 문자 랜덤 변경 (코드 깜빡임 효과)
      const charAttr = geometry.getAttribute("charIndex") as THREE.BufferAttribute;
      for (let i = 0; i < CODE_PARTICLE_COUNT; i++) {
        charChangeTimers[i] -= delta * 60;
        if (charChangeTimers[i] <= 0) {
          charAttr.array[i] = Math.floor(Math.random() * CODE_CHARS.length);
          charChangeTimers[i] = 30 + Math.random() * 60; // 0.5~1.5초마다 변경
        }
      }
      charAttr.needsUpdate = true;

      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 리사이즈 핸들러
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      geometryRef.current = null;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      mountElement.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      charAtlas.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [
    targetMorphRef,
    contentRef,
    vortexRef,
    preset,
    afterImageDamp,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
  ]);

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
