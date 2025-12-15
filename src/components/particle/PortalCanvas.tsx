/**
 * PortalCanvas - Doctor Strange Portal Effect
 *
 * 마블 영화 "닥터 스트레인지"의 차원이동 포털 효과
 * - 주황색/금색 스파크가 원형으로 빠르게 회전
 * - 불규칙한 테두리로 자연스러운 포털 모양
 * - 강한 글로우 효과
 * - 마우스 위치에 따라 포털 중심 이동
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ==================== Constants ====================
const SPARK_COUNT = 4000; // 스파크 파티클 수
const PORTAL_RADIUS = 60; // 기본 포털 반경
const RADIUS_VARIANCE = 12; // 반경 불규칙성
const SPARK_SIZE_MIN = 0.3; // 최소 스파크 크기
const SPARK_SIZE_MAX = 1.5; // 최대 스파크 크기
const ROTATION_SPEED_MIN = 1.5; // 최소 회전 속도
const ROTATION_SPEED_MAX = 4.0; // 최대 회전 속도
const MOUSE_LERP_SPEED = 0.03; // 포털 이동 lerp 속도

// ==================== Vertex Shader ====================
const PORTAL_VERTEX_SHADER = `
  attribute float instanceAngle;
  attribute float instanceSpeed;
  attribute float instanceRadiusOffset;
  attribute float instanceSize;
  attribute float instanceBrightness;
  attribute float instanceLayer;

  uniform float time;
  uniform float portalRadius;
  uniform vec2 portalCenter;

  varying float vBrightness;
  varying float vSpeed;
  varying float vLayer;

  void main() {
    // 회전 각도 계산 (시간에 따라 증가)
    float angle = instanceAngle + time * instanceSpeed;

    // 불규칙한 반경 (기본 + 오프셋 + 파동)
    float radius = portalRadius + instanceRadiusOffset;
    // 다중 주파수 파동으로 불규칙한 테두리
    radius += sin(angle * 3.0 + time * 2.0) * 3.0;
    radius += sin(angle * 7.0 - time * 1.5) * 2.0;
    radius += sin(angle * 13.0 + time * 0.8) * 1.5;

    // 레이어별 반경 조정 (내부 레이어는 더 작음)
    radius *= (0.85 + instanceLayer * 0.15);

    // 원형 위치 계산
    vec3 pos;
    pos.x = portalCenter.x + cos(angle) * radius;
    pos.y = portalCenter.y + sin(angle) * radius;
    // Z축 깊이 변화 (3D 효과)
    pos.z = sin(angle * 2.0 + time * 3.0) * 8.0 * instanceLayer;

    // varying 전달
    vBrightness = instanceBrightness;
    vSpeed = instanceSpeed / ${ROTATION_SPEED_MAX.toFixed(1)};
    vLayer = instanceLayer;

    // 크기 계산 (속도가 빠를수록 작게, 꼬리처럼)
    float size = instanceSize * (1.0 - vSpeed * 0.3);
    // 레이어별 크기 (외곽이 더 큼)
    size *= (0.7 + instanceLayer * 0.3);

    // Billboard 효과
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (200.0 / -mvPosition.z);
  }
`;

// ==================== Fragment Shader ====================
const PORTAL_FRAGMENT_SHADER = `
  uniform float time;

  varying float vBrightness;
  varying float vSpeed;
  varying float vLayer;

  void main() {
    // 원형 마스크 (부드러운 가장자리)
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    if (alpha < 0.01) discard;

    // 색상 그라데이션: 주황색 → 금색 → 흰색
    vec3 orange = vec3(1.0, 0.4, 0.0);
    vec3 gold = vec3(1.0, 0.7, 0.2);
    vec3 white = vec3(1.0, 0.95, 0.8);

    // 속도에 따른 기본 색상
    vec3 baseColor = mix(orange, gold, vSpeed);

    // 밝기에 따라 흰색으로 전환
    vec3 color = mix(baseColor, white, vBrightness * 0.6);

    // 깜빡임 효과
    float flicker = 0.85 + 0.15 * sin(time * 15.0 + vSpeed * 20.0 + vLayer * 10.0);
    color *= flicker;

    // 레이어별 밝기 조정 (외곽이 더 밝음)
    float layerBrightness = 0.6 + vLayer * 0.4;

    // 최종 알파
    float finalAlpha = alpha * vBrightness * layerBrightness;

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

// ==================== Component Props ====================
interface PortalCanvasProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}

// ==================== Component ====================
export function PortalCanvas({
  bloomStrength = 1.8,
  bloomRadius = 0.6,
  bloomThreshold = 0.1,
}: PortalCanvasProps) {
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
    camera.position.set(0, 0, 150);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountElement.appendChild(renderer.domElement);

    // ========== Calculate Frustum ==========
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = 2 * Math.tan((60 * Math.PI) / 360) * 150;
    const frustumWidth = frustumHeight * aspect;
    const halfWidth = frustumWidth / 2;
    const halfHeight = frustumHeight / 2;

    // ========== Create Spark Geometry ==========
    const geometry = new THREE.BufferGeometry();

    const instanceAngles = new Float32Array(SPARK_COUNT);
    const instanceSpeeds = new Float32Array(SPARK_COUNT);
    const instanceRadiusOffsets = new Float32Array(SPARK_COUNT);
    const instanceSizes = new Float32Array(SPARK_COUNT);
    const instanceBrightnesses = new Float32Array(SPARK_COUNT);
    const instanceLayers = new Float32Array(SPARK_COUNT);
    const positions = new Float32Array(SPARK_COUNT * 3);

    for (let i = 0; i < SPARK_COUNT; i++) {
      // 초기 각도 (0 ~ 2π)
      instanceAngles[i] = Math.random() * Math.PI * 2;

      // 회전 속도 (다양하게)
      instanceSpeeds[i] =
        ROTATION_SPEED_MIN +
        Math.random() * (ROTATION_SPEED_MAX - ROTATION_SPEED_MIN);

      // 반경 오프셋 (-RADIUS_VARIANCE ~ +RADIUS_VARIANCE)
      instanceRadiusOffsets[i] = (Math.random() - 0.5) * 2 * RADIUS_VARIANCE;

      // 크기
      instanceSizes[i] =
        SPARK_SIZE_MIN + Math.random() * (SPARK_SIZE_MAX - SPARK_SIZE_MIN);

      // 밝기 (0.3 ~ 1.0)
      instanceBrightnesses[i] = 0.3 + Math.random() * 0.7;

      // 레이어 (0 = 내부, 1 = 외부)
      instanceLayers[i] = Math.random();

      // 초기 위치 (placeholder, shader에서 계산)
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute(
      "instanceAngle",
      new THREE.BufferAttribute(instanceAngles, 1)
    );
    geometry.setAttribute(
      "instanceSpeed",
      new THREE.BufferAttribute(instanceSpeeds, 1)
    );
    geometry.setAttribute(
      "instanceRadiusOffset",
      new THREE.BufferAttribute(instanceRadiusOffsets, 1)
    );
    geometry.setAttribute(
      "instanceSize",
      new THREE.BufferAttribute(instanceSizes, 1)
    );
    geometry.setAttribute(
      "instanceBrightness",
      new THREE.BufferAttribute(instanceBrightnesses, 1)
    );
    geometry.setAttribute(
      "instanceLayer",
      new THREE.BufferAttribute(instanceLayers, 1)
    );

    // ========== Create Material ==========
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        portalRadius: { value: PORTAL_RADIUS },
        portalCenter: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: PORTAL_VERTEX_SHADER,
      fragmentShader: PORTAL_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // ========== Create Points ==========
    const points = new THREE.Points(geometry, material);
    scene.add(points);

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

    // ========== Mouse Tracking ==========
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let portalCenterX = 0;
    let portalCenterY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -((e.clientY / window.innerHeight) * 2 - 1);
      mouseTargetX = ndcX * halfWidth * 0.5; // 이동 범위 제한
      mouseTargetY = ndcY * halfHeight * 0.5;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // ========== Animation ==========
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const time = clock.getElapsedTime();
      material.uniforms.time.value = time;

      // 포털 중심 lerp
      portalCenterX += (mouseTargetX - portalCenterX) * MOUSE_LERP_SPEED;
      portalCenterY += (mouseTargetY - portalCenterY) * MOUSE_LERP_SPEED;
      material.uniforms.portalCenter.value.set(portalCenterX, portalCenterY);

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
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouseMove);
      mountElement.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [bloomStrength, bloomRadius, bloomThreshold]);

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
