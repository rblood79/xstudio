/**
 * MatrixRainCanvas - Matrix Digital Rain Effect (Enhanced)
 *
 * 영화 《매트릭스》의 인트로에서 등장하는 디지털 비(Digital Rain) 효과
 * - InstancedMesh + PlaneGeometry로 선명한 문자 렌더링
 * - 실제 3D 깊이감과 원근감
 * - 호버 시 문자들이 형태 위에서 충돌하여 흘러내리는 효과
 * - Three.js InstancedMesh 기반 고성능 렌더링
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
const CHAR_COUNT = Math.min(PARTICLE_COUNT, 3000); // 성능을 위해 제한
const COLUMN_COUNT = 50;
const CHAR_SIZE = 1.2; // 3D 월드 단위
const TEXTURE_CHAR_SIZE = 128; // 텍스처 해상도
const DEPTH_RANGE = 150; // Z축 깊이 범위
const TRANSITION_SPEED = 0.02;

// 매트릭스 문자셋
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

// ==================== Character Texture Atlas ====================
function createCharacterAtlas(): THREE.CanvasTexture {
  const charsPerRow = 12;
  const rows = Math.ceil(MATRIX_CHARS.length / charsPerRow);
  const atlasWidth = charsPerRow * TEXTURE_CHAR_SIZE;
  const atlasHeight = rows * TEXTURE_CHAR_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext("2d")!;

  // 배경 투명
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  // 폰트 설정 - 선명한 렌더링
  ctx.font = `bold ${TEXTURE_CHAR_SIZE * 0.75}px "MS Gothic", "Meiryo", "Hiragino Kaku Gothic Pro", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < MATRIX_CHARS.length; i++) {
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    const x = col * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;
    const y = row * TEXTURE_CHAR_SIZE + TEXTURE_CHAR_SIZE / 2;

    // 글로우 효과
    ctx.shadowColor = "rgba(0, 255, 100, 1)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#00ff66";
    ctx.fillText(MATRIX_CHARS[i], x, y);

    // 더 선명하게 한번 더
    ctx.shadowBlur = 0;
    ctx.fillText(MATRIX_CHARS[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

// ==================== Vertex Shader for Instanced Mesh ====================
const MATRIX_INSTANCE_VERTEX = `
  attribute vec3 instancePosition;
  attribute float instanceCharIndex;
  attribute float instanceBrightness;
  attribute float instanceDepth;
  attribute float instanceSpeed;

  uniform float time;
  uniform float morphProgress;
  uniform sampler2D targetPositions;
  uniform vec2 targetSize;
  uniform float screenHeight;

  varying vec2 vUv;
  varying float vBrightness;
  varying float vCharIndex;
  varying float vDepth;
  varying float vCollision;

  void main() {
    vUv = uv;
    vCharIndex = instanceCharIndex;
    vDepth = instanceDepth;

    vec3 pos = instancePosition;

    // 타겟 위치 가져오기 (충돌 검사용)
    float normalizedIndex = gl_InstanceID / float(${CHAR_COUNT});
    vec2 targetUV = vec2(mod(float(gl_InstanceID), targetSize.x) / targetSize.x,
                         floor(float(gl_InstanceID) / targetSize.x) / targetSize.y);
    vec4 targetData = texture2D(targetPositions, targetUV);
    vec3 targetPos = targetData.xyz;

    // 충돌 검사: 문자가 타겟 형태 근처에 있는지
    float distToTarget = length(pos.xy - targetPos.xy);
    float collisionRadius = 8.0;
    float collision = smoothstep(collisionRadius, 0.0, distToTarget) * morphProgress;
    vCollision = collision;

    // 충돌 시: 타겟 위치에서 잠시 머물다가 옆으로 흘러내림
    if (collision > 0.1) {
      // 타겟 위치로 끌어당김
      pos.xy = mix(pos.xy, targetPos.xy, collision * 0.8);
      // 아래로 더 천천히 흐름
      pos.y -= collision * time * instanceSpeed * 0.3;
      // 약간 옆으로 흘러내림
      pos.x += sin(time * 2.0 + float(gl_InstanceID) * 0.1) * collision * 2.0;
    }

    // 깊이에 따른 스케일 (원근감)
    float depthScale = 1.0 - instanceDepth * 0.4;

    // 밝기 (머리는 밝게, 깊이에 따라 어둡게)
    vBrightness = instanceBrightness * (1.0 - instanceDepth * 0.5);

    // 충돌 시 더 밝게
    vBrightness += collision * 0.5;

    // 인스턴스 위치에 로컬 버텍스 추가
    vec3 transformed = position * ${CHAR_SIZE.toFixed(1)} * depthScale + pos;

    // Billboard: 항상 카메라를 향하도록
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    mvPosition.xyz += position * ${CHAR_SIZE.toFixed(1)} * depthScale;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ==================== Fragment Shader ====================
const MATRIX_INSTANCE_FRAGMENT = `
  uniform sampler2D charAtlas;
  uniform float charsPerRow;
  uniform float charRows;
  uniform float time;

  varying vec2 vUv;
  varying float vBrightness;
  varying float vCharIndex;
  varying float vDepth;
  varying float vCollision;

  void main() {
    // 아틀라스에서 문자 UV 계산
    float charIdx = floor(vCharIndex);
    float col = mod(charIdx, charsPerRow);
    float row = floor(charIdx / charsPerRow);

    vec2 charUV = vec2(
      (col + vUv.x) / charsPerRow,
      (row + (1.0 - vUv.y)) / charRows
    );

    vec4 texColor = texture2D(charAtlas, charUV);

    // 녹색 색상
    vec3 baseGreen = vec3(0.0, 1.0, 0.4);
    vec3 brightGreen = vec3(0.5, 1.0, 0.6);
    vec3 headWhite = vec3(0.9, 1.0, 0.95);

    // 밝기에 따른 색상
    vec3 color;
    if (vBrightness > 0.9) {
      // 머리: 흰색
      color = mix(brightGreen, headWhite, (vBrightness - 0.9) * 10.0);
    } else {
      // 꼬리: 녹색 그라데이션
      color = mix(baseGreen * 0.3, brightGreen, vBrightness);
    }

    // 충돌 시 더 밝은 색상
    color = mix(color, headWhite, vCollision * 0.5);

    // 깜빡임 효과
    float flicker = 0.9 + 0.1 * sin(time * 10.0 + vCharIndex * 2.5);
    color *= flicker;

    // 깊이에 따른 안개 효과
    float fog = 1.0 - vDepth * 0.3;
    color *= fog;

    // 알파
    float alpha = texColor.a * vBrightness;

    // 충돌 시 더 강한 알파
    alpha = mix(alpha, min(alpha * 1.5, 1.0), vCollision);

    if (alpha < 0.05) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ==================== Component Props ====================
interface MatrixRainCanvasProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  speedMultiplier?: number;
}

// ==================== Component ====================
export function MatrixRainCanvas({
  bloomStrength = 1.2,
  bloomRadius = 0.8,
  bloomThreshold = 0.1,
  speedMultiplier = 1.0,
}: MatrixRainCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { targetMorphRef, contentRef, contentVersion } = useParticleBackground();
  const morphProgressRef = useRef(0);
  const targetTextureRef = useRef<THREE.DataTexture | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // 타겟 위치 업데이트
  useEffect(() => {
    if (!targetTextureRef.current) return;

    const targetPoints = generatePointsFromContent(contentRef.current);
    const textureSize = Math.ceil(Math.sqrt(CHAR_COUNT));
    const data = new Float32Array(textureSize * textureSize * 4);

    for (let i = 0; i < CHAR_COUNT; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      data[i4] = targetPoints[i3] || 0;
      data[i4 + 1] = targetPoints[i3 + 1] || 0;
      data[i4 + 2] = targetPoints[i3 + 2] || 0;
      data[i4 + 3] = 1;
    }

    targetTextureRef.current.image.data.set(data);
    targetTextureRef.current.needsUpdate = true;
  }, [contentVersion, contentRef]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountElement = mountRef.current;

    // ========== Scene Setup ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // 안개 효과로 깊이감 강화
    scene.fog = new THREE.Fog(0x000000, 100, 400);

    const camera = new THREE.PerspectiveCamera(
      75, // 넓은 FOV로 원근감 강화
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
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
    const charAtlas = createCharacterAtlas();
    const charsPerRow = 12;
    const charRows = Math.ceil(MATRIX_CHARS.length / charsPerRow);

    // ========== Target Positions Texture ==========
    const textureSize = Math.ceil(Math.sqrt(CHAR_COUNT));
    const targetData = new Float32Array(textureSize * textureSize * 4);
    const targetTexture = new THREE.DataTexture(
      targetData,
      textureSize,
      textureSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    targetTexture.needsUpdate = true;
    targetTextureRef.current = targetTexture;

    // ========== Calculate Layout ==========
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = 2 * Math.tan((75 * Math.PI) / 360) * 100;
    const frustumWidth = frustumHeight * aspect;
    const halfWidth = frustumWidth / 2;
    const halfHeight = frustumHeight / 2;

    // ========== Instanced Geometry ==========
    const planeGeo = new THREE.PlaneGeometry(1, 1);

    // 인스턴스 속성
    const instancePositions = new Float32Array(CHAR_COUNT * 3);
    const instanceCharIndices = new Float32Array(CHAR_COUNT);
    const instanceBrightnesses = new Float32Array(CHAR_COUNT);
    const instanceDepths = new Float32Array(CHAR_COUNT);
    const instanceSpeeds = new Float32Array(CHAR_COUNT);

    // 열 설정
    const charsPerColumn = Math.ceil(CHAR_COUNT / COLUMN_COUNT);
    const columnWidth = (frustumWidth * 1.2) / COLUMN_COUNT;

    // 열별 데이터
    const columnData: {
      speed: number;
      length: number;
      depth: number;
      headY: number;
    }[] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      columnData.push({
        speed: (0.3 + Math.random() * 0.7) * speedMultiplier,
        length: 8 + Math.floor(Math.random() * 20),
        depth: Math.random(), // 0~1 깊이
        headY: halfHeight + Math.random() * halfHeight * 2,
      });
    }

    // 인스턴스 초기화
    let instanceIndex = 0;
    for (let col = 0; col < COLUMN_COUNT && instanceIndex < CHAR_COUNT; col++) {
      const colData = columnData[col];
      const columnX = -halfWidth * 1.1 + col * columnWidth + columnWidth / 2;

      for (let row = 0; row < charsPerColumn && instanceIndex < CHAR_COUNT; row++) {
        const i3 = instanceIndex * 3;

        // 위치
        instancePositions[i3] = columnX + (Math.random() - 0.5) * 2;
        instancePositions[i3 + 1] = colData.headY - row * CHAR_SIZE * 1.5;
        instancePositions[i3 + 2] = -colData.depth * DEPTH_RANGE;

        // 문자 인덱스
        instanceCharIndices[instanceIndex] = Math.floor(Math.random() * MATRIX_CHARS.length);

        // 밝기: 머리는 1.0, 꼬리로 갈수록 감소
        const brightness = row === 0 ? 1.0 :
          (row < colData.length ? Math.max(0.1, 1.0 - (row / colData.length) * 0.9) : 0.05);
        instanceBrightnesses[instanceIndex] = brightness;

        // 깊이
        instanceDepths[instanceIndex] = colData.depth;

        // 속도
        instanceSpeeds[instanceIndex] = colData.speed;

        instanceIndex++;
      }
    }

    // ========== Instanced Mesh ==========
    const instancedGeo = planeGeo.clone();
    instancedGeo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(instancePositions, 3));
    instancedGeo.setAttribute("instanceCharIndex", new THREE.InstancedBufferAttribute(instanceCharIndices, 1));
    instancedGeo.setAttribute("instanceBrightness", new THREE.InstancedBufferAttribute(instanceBrightnesses, 1));
    instancedGeo.setAttribute("instanceDepth", new THREE.InstancedBufferAttribute(instanceDepths, 1));
    instancedGeo.setAttribute("instanceSpeed", new THREE.InstancedBufferAttribute(instanceSpeeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        charAtlas: { value: charAtlas },
        charsPerRow: { value: charsPerRow },
        charRows: { value: charRows },
        time: { value: 0 },
        morphProgress: { value: 0 },
        targetPositions: { value: targetTexture },
        targetSize: { value: new THREE.Vector2(textureSize, textureSize) },
        screenHeight: { value: frustumHeight },
      },
      vertexShader: MATRIX_INSTANCE_VERTEX,
      fragmentShader: MATRIX_INSTANCE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    materialRef.current = material;

    const mesh = new THREE.InstancedMesh(instancedGeo, material, CHAR_COUNT);
    mesh.frustumCulled = false;

    // 각 인스턴스의 변환 행렬 (기본값)
    const dummy = new THREE.Object3D();
    for (let i = 0; i < CHAR_COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    scene.add(mesh);

    // ========== Post-processing ==========
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // ========== Animation ==========
    const clock = new THREE.Clock();
    let animationFrameId: number;

    // 문자 변경 타이머
    const charChangeTimers = new Float32Array(CHAR_COUNT);
    for (let i = 0; i < CHAR_COUNT; i++) {
      charChangeTimers[i] = Math.random() * 30;
    }

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      material.uniforms.time.value = time;

      // 모핑 진행도
      const morphSpeed = targetMorphRef.current > morphProgressRef.current ? MORPH_IN_SPEED : MORPH_OUT_SPEED;
      morphProgressRef.current += (targetMorphRef.current - morphProgressRef.current) * morphSpeed;
      material.uniforms.morphProgress.value = morphProgressRef.current;

      // 인스턴스 속성 업데이트
      const posAttr = instancedGeo.getAttribute("instancePosition") as THREE.InstancedBufferAttribute;
      const charAttr = instancedGeo.getAttribute("instanceCharIndex") as THREE.InstancedBufferAttribute;
      const brightAttr = instancedGeo.getAttribute("instanceBrightness") as THREE.InstancedBufferAttribute;
      const depthAttr = instancedGeo.getAttribute("instanceDepth") as THREE.InstancedBufferAttribute;

      let charIndex = 0;
      for (let col = 0; col < COLUMN_COUNT && charIndex < CHAR_COUNT; col++) {
        const colData = columnData[col];
        const columnX = -halfWidth * 1.1 + col * columnWidth + columnWidth / 2;

        // 깊이에 따른 속도 조절 (뒤쪽이 느림)
        const depthSpeedFactor = 1.0 - colData.depth * 0.5;
        const moveAmount = colData.speed * depthSpeedFactor * delta * 30;

        let headY = -Infinity;

        for (let row = 0; row < charsPerColumn && charIndex < CHAR_COUNT; row++) {
          const idx = charIndex;
          const i3 = idx * 3;

          // Y 이동
          const newY = posAttr.array[i3 + 1] - moveAmount;
          posAttr.array[i3 + 1] = newY;

          if (row === 0) {
            headY = newY;
          }

          // 문자 변경 (머리는 더 빈번)
          const isHead = row === 0;
          charChangeTimers[idx] -= delta * 60 * (isHead ? 4 : 1);
          if (charChangeTimers[idx] <= 0) {
            charAttr.array[idx] = Math.floor(Math.random() * MATRIX_CHARS.length);
            charChangeTimers[idx] = isHead ? (2 + Math.random() * 5) : (8 + Math.random() * 25);
          }

          charIndex++;
        }

        // 리셋
        if (headY < -halfHeight - 30) {
          const startIdx = col * charsPerColumn;
          const newHeadY = halfHeight + 30 + Math.random() * 60;
          const newLength = 8 + Math.floor(Math.random() * 20);
          const newDepth = Math.random();

          colData.headY = newHeadY;
          colData.length = newLength;
          colData.depth = newDepth;
          colData.speed = (0.3 + Math.random() * 0.7) * speedMultiplier;

          for (let row = 0; row < charsPerColumn && startIdx + row < CHAR_COUNT; row++) {
            const idx = startIdx + row;
            const i3 = idx * 3;

            posAttr.array[i3] = columnX + (Math.random() - 0.5) * 2;
            posAttr.array[i3 + 1] = newHeadY - row * CHAR_SIZE * 1.5;
            posAttr.array[i3 + 2] = -newDepth * DEPTH_RANGE;

            charAttr.array[idx] = Math.floor(Math.random() * MATRIX_CHARS.length);

            const brightness = row === 0 ? 1.0 :
              (row < newLength ? Math.max(0.1, 1.0 - (row / newLength) * 0.9) : 0.05);
            brightAttr.array[idx] = brightness;

            depthAttr.array[idx] = newDepth;
          }
        }
      }

      posAttr.needsUpdate = true;
      charAttr.needsUpdate = true;
      brightAttr.needsUpdate = true;
      depthAttr.needsUpdate = true;

      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // ========== Resize ==========
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
      targetTextureRef.current = null;
      materialRef.current = null;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      mountElement.removeChild(renderer.domElement);
      instancedGeo.dispose();
      planeGeo.dispose();
      material.dispose();
      charAtlas.dispose();
      targetTexture.dispose();
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
