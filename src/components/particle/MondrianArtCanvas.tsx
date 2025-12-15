/**
 * MondrianArtCanvas - 몬드리안 Composition A 스타일 이펙트
 *
 * 황금비율 기반 격자 분할과 원색 팔레트로 몬드리안 작품을 오마주합니다.
 * - 황금비 (φ = 1.618...) 기반 재귀적 분할
 * - 빨강, 파랑, 노랑 원색 + 흰색, 검정 무채색
 * - 선 없이 순수한 면의 조합
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ==================== 상수 ====================
const PHI = 1.618033988749895; // 황금비
const DEFAULT_DEPTH = 8; // 기본 분할 깊이
const MIN_CELL_SIZE = 40; // 최소 셀 크기 (px)
const REGENERATE_INTERVAL = 12000; // 격자 재생성 주기 (ms)
const TRANSITION_DURATION = 1500; // 전환 애니메이션 시간 (ms)

// ==================== 색상 팔레트 ====================
const MONDRIAN_COLORS = {
  red: new THREE.Color(0xcc2222), // 빨강
  blue: new THREE.Color(0x1a1acc), // 파랑
  yellow: new THREE.Color(0xe8d820), // 노랑
  white: new THREE.Color(0xf5f5f0), // 흰색 (약간 따뜻한)
  black: new THREE.Color(0x1a1a1a), // 검정 (셀 배경용)
};

// 색상 가중치 (흰색 많이, 원색 적게 - 원작 스타일)
const COLOR_WEIGHTS = [
  { color: "white", weight: 0.52 },
  { color: "red", weight: 0.14 },
  { color: "blue", weight: 0.14 },
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
  // 최소 크기 도달 시 종료
  if (depth === 0 || width < minSize * 1.5 || height < minSize * 1.5) {
    return [
      {
        x,
        y,
        width,
        height,
        color: pickWeightedColor(),
      },
    ];
  }

  // 분할하지 않을 확률 (깊이가 깊을수록 증가)
  const skipProbability = Math.max(0, (DEFAULT_DEPTH - depth) * 0.08);
  if (Math.random() < skipProbability) {
    return [
      {
        x,
        y,
        width,
        height,
        color: pickWeightedColor(),
      },
    ];
  }

  // 가로/세로 비율에 따른 분할 방향 결정
  const aspectRatio = width / height;
  const vertical =
    aspectRatio > 1.2
      ? Math.random() > 0.2 // 넓으면 세로 분할 우세
      : aspectRatio < 0.8
        ? Math.random() > 0.8 // 높으면 가로 분할 우세
        : Math.random() > 0.5; // 정사각형에 가까우면 랜덤

  if (vertical) {
    // 황금비 또는 랜덤 비율로 분할
    const useGoldenRatio = Math.random() > 0.4;
    const ratio = useGoldenRatio
      ? Math.random() > 0.5
        ? 1 / PHI
        : 1 - 1 / PHI
      : Math.random() * 0.4 + 0.3;
    const split = width * ratio;

    return [
      ...generateMondrianGrid(x, y, split, height, depth - 1, minSize),
      ...generateMondrianGrid(
        x + split,
        y,
        width - split,
        height,
        depth - 1,
        minSize
      ),
    ];
  } else {
    const useGoldenRatio = Math.random() > 0.4;
    const ratio = useGoldenRatio
      ? Math.random() > 0.5
        ? 1 / PHI
        : 1 - 1 / PHI
      : Math.random() * 0.4 + 0.3;
    const split = height * ratio;

    return [
      ...generateMondrianGrid(x, y, width, split, depth - 1, minSize),
      ...generateMondrianGrid(
        x,
        y + split,
        width,
        height - split,
        depth - 1,
        minSize
      ),
    ];
  }
}

// ==================== Shader ====================
const MONDRIAN_VERTEX_SHADER = `
  attribute vec3 instanceColor;
  attribute float instanceOpacity;
  attribute vec2 instanceCellSize;

  varying vec3 vColor;
  varying vec2 vUv;
  varying float vOpacity;
  varying vec2 vCellSize;

  void main() {
    vColor = instanceColor;
    vUv = uv;
    vOpacity = instanceOpacity;
    vCellSize = instanceCellSize;

    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const MONDRIAN_FRAGMENT_SHADER = `
  uniform float time;

  varying vec3 vColor;
  varying vec2 vUv;
  varying float vOpacity;
  varying vec2 vCellSize;

  void main() {
    // 1px 선 두께 계산 (셀 크기 기반)
    float lineWidthX = 1.0 / vCellSize.x;
    float lineWidthY = 1.0 / vCellSize.y;

    // 모서리 감지 (1px 선)
    float edgeX = min(
      smoothstep(0.0, lineWidthX, vUv.x),
      smoothstep(1.0, 1.0 - lineWidthX, vUv.x)
    );
    float edgeY = min(
      smoothstep(0.0, lineWidthY, vUv.y),
      smoothstep(1.0, 1.0 - lineWidthY, vUv.y)
    );
    float edge = edgeX * edgeY;

    // 검정선 색상
    vec3 lineColor = vec3(0.08);

    // 색상: 모서리는 검정, 내부는 instanceColor
    vec3 color = mix(lineColor, vColor, edge);

    // 약간의 노이즈/텍스처 효과 (캔버스 느낌)
    float noise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
    color += (noise - 0.5) * 0.012;

    gl_FragColor = vec4(color, vOpacity);
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
    scene.background = new THREE.Color(0xf5f5f0); // 따뜻한 흰색 배경

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

    // ==================== Geometry & Material ====================
    const planeGeometry = new THREE.PlaneGeometry(1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: MONDRIAN_VERTEX_SHADER,
      fragmentShader: MONDRIAN_FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // ==================== 격자 생성 및 메시 설정 ====================
    let currentRectangles = generateMondrianGrid(
      0,
      0,
      width,
      height,
      DEFAULT_DEPTH
    );
    let targetRectangles: Rectangle[] = [];
    let transitionProgress = 1;
    let transitionStartTime = 0;

    // 최대 셀 개수 (재생성 시 변동 대비)
    const maxInstances = 200;
    const mesh = new THREE.InstancedMesh(planeGeometry, material, maxInstances);
    mesh.count = currentRectangles.length;
    scene.add(mesh);

    // 인스턴스 속성 버퍼
    const instanceColors = new Float32Array(maxInstances * 3);
    const instanceOpacities = new Float32Array(maxInstances);
    const instanceCellSizes = new Float32Array(maxInstances * 2);

    planeGeometry.setAttribute(
      "instanceColor",
      new THREE.InstancedBufferAttribute(instanceColors, 3)
    );
    planeGeometry.setAttribute(
      "instanceOpacity",
      new THREE.InstancedBufferAttribute(instanceOpacities, 1)
    );
    planeGeometry.setAttribute(
      "instanceCellSize",
      new THREE.InstancedBufferAttribute(instanceCellSizes, 2)
    );

    const dummy = new THREE.Object3D();

    function updateMesh(rectangles: Rectangle[], opacity: number = 1) {
      mesh.count = rectangles.length;

      rectangles.forEach((rect, i) => {
        // 위치 및 크기 설정
        dummy.position.set(
          rect.x + rect.width / 2 - width / 2,
          -(rect.y + rect.height / 2 - height / 2), // Y 반전
          0
        );
        dummy.scale.set(rect.width, rect.height, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // 색상 설정
        instanceColors[i * 3] = rect.color.r;
        instanceColors[i * 3 + 1] = rect.color.g;
        instanceColors[i * 3 + 2] = rect.color.b;

        // 불투명도
        instanceOpacities[i] = opacity;

        // 셀 크기 (1px 선 계산용)
        instanceCellSizes[i * 2] = rect.width;
        instanceCellSizes[i * 2 + 1] = rect.height;
      });

      mesh.instanceMatrix.needsUpdate = true;
      (
        planeGeometry.getAttribute("instanceColor") as THREE.BufferAttribute
      ).needsUpdate = true;
      (
        planeGeometry.getAttribute("instanceOpacity") as THREE.BufferAttribute
      ).needsUpdate = true;
      (
        planeGeometry.getAttribute("instanceCellSize") as THREE.BufferAttribute
      ).needsUpdate = true;
    }

    // 초기 메시 설정
    updateMesh(currentRectangles);

    // ==================== 애니메이션 ====================
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let lastRegenerateTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const elapsedMs = time * 1000;
      material.uniforms.time.value = time;

      // 전환 애니메이션
      if (transitionProgress < 1) {
        const elapsed = elapsedMs - transitionStartTime;
        transitionProgress = Math.min(1, elapsed / TRANSITION_DURATION);

        // easeInOutCubic
        const eased =
          transitionProgress < 0.5
            ? 4 * transitionProgress * transitionProgress * transitionProgress
            : 1 -
              Math.pow(-2 * transitionProgress + 2, 3) / 2;

        // 페이드 전환
        if (eased < 0.5) {
          // 페이드 아웃
          updateMesh(currentRectangles, 1 - eased * 2);
        } else {
          // 페이드 인
          updateMesh(targetRectangles, (eased - 0.5) * 2);
        }

        if (transitionProgress >= 1) {
          currentRectangles = targetRectangles;
          updateMesh(currentRectangles, 1);
        }
      }

      // 주기적 재생성
      if (
        elapsedMs - lastRegenerateTime > REGENERATE_INTERVAL &&
        transitionProgress >= 1
      ) {
        lastRegenerateTime = elapsedMs;
        targetRectangles = generateMondrianGrid(
          0,
          0,
          width,
          height,
          DEFAULT_DEPTH
        );
        transitionProgress = 0;
        transitionStartTime = elapsedMs;
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

      // 새 크기로 격자 재생성
      currentRectangles = generateMondrianGrid(
        0,
        0,
        newWidth,
        newHeight,
        DEFAULT_DEPTH
      );
      updateMesh(currentRectangles);
    };

    window.addEventListener("resize", handleResize);

    // ==================== 클린업 ====================
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      scene.remove(mesh);
      planeGeometry.dispose();
      material.dispose();
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
