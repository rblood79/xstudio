// ==================== 공통 Simplex Noise 함수 ====================
const SIMPLEX_NOISE_GLSL = `
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
`;

// ==================== 통합 Vertex Shader ====================
export const PARTICLE_VERTEX_SHADER = `
  attribute float random;
  attribute float heightLayer;
  attribute float particleSize;
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

  // 테마별 조정
  uniform float formIntensityMultiplier;
  uniform float aliveBreathScale;
  uniform float vibrationScale;
  uniform float baseAlphaLow;
  uniform float baseAlphaHigh;

  varying float vAlpha;
  varying float vHeightLayer;
  varying float vMorph;
  varying float vVortexInfluence;
  varying float vDistortion;

  ${SIMPLEX_NOISE_GLSL}

  void main() {
    vec3 currentTarget = mix(prevTargetPos, targetPos, transitionProgress);
    vec3 pos = position;

    float layerFactor = heightLayer;

    // ========== 평상시: 부유/바람 효과 ==========
    float baseMove = time * primarySpeed;
    float moveNoise = snoise(vec3(pos.x * 0.008, pos.y * 0.008, time * 0.2)) * 0.4;

    // 층별 움직임
    float lowEffect = (1.0 - layerFactor) * lowLayerEffect;
    float lowMove = sin(time * 1.8 + random * 6.28 + pos.x * 0.01) * lowEffect;

    float midEffect = (1.0 - abs(layerFactor - 0.5) * 2.0) * midLayerEffect;
    float midMove = sin(time * 0.6 + pos.y * 0.005 + random * 3.14) * midEffect * 8.0;

    float highEffect = layerFactor * highLayerEffect;
    float highMoveX = cos(time * 0.2 + random * 6.28) * highEffect * 12.0;
    float highMoveY = sin(time * 0.25 + random * 4.0) * highEffect * 10.0;

    // 물결
    float wave = sin(time * waveSpeed + pos.x * waveScale * 40.0) *
                 cos(time * waveSpeed * 0.6 + pos.y * waveScale * 25.0) *
                 (1.0 - layerFactor) * 4.0;

    // 군집
    vec3 clusterPos = vec3(pos.x * clusterScale, pos.y * clusterScale, time * 0.1);
    float clusterX = snoise(clusterPos) * clusterStrength * 20.0;
    float clusterY = snoise(clusterPos + vec3(100.0, 0.0, 0.0)) * clusterStrength * 15.0;

    // 순환 바람 (Curl 스타일 - 한 방향이 아닌 회전하는 흐름)
    vec3 windPos = vec3(pos.xy * 0.003, time * 0.08);
    float windAngle = snoise(windPos) * 6.28; // 노이즈 기반 방향
    vec2 circularWind = vec2(cos(windAngle), sin(windAngle)) * primarySpeed * 8.0;

    // 중심으로 약하게 수렴 (너무 멀어지지 않도록)
    float distFromCenter = length(pos.xy);
    float convergeFactor = smoothstep(100.0, 250.0, distFromCenter);
    vec2 toCenter = -normalize(pos.xy + vec2(0.001)) * convergeFactor * 2.0;

    vec3 driftMove = vec3(
      circularWind.x + moveNoise * 8.0 + highMoveX + clusterX + lowMove + toCenter.x,
      circularWind.y + midMove + wave + clusterY + highMoveY + toCenter.y,
      snoise(vec3(pos.xy * 0.008, time * 0.3)) * 4.0 * (0.3 + layerFactor * 0.7)
    );

    // ========== 회오리 효과 ==========
    float vortexInfluence = 0.0;
    vec3 vortexMove = vec3(0.0);

    if (vortexActive > 0.5 && vortexStrength > 0.01) {
      vec2 toVortex = pos.xy - vortexCenter;
      float distToVortex = length(toVortex);
      float normalizedDist = distToVortex / vortexRadius;

      vortexInfluence = smoothstep(1.2, 0.0, normalizedDist) * vortexStrength;

      if (vortexInfluence > 0.01) {
        float angle = atan(toVortex.y, toVortex.x);
        float spiralAngle = angle + time * rotationSpeed * (1.0 + vortexStrength);
        float rotSpeed = rotationSpeed * (1.0 + (1.0 - normalizedDist) * 1.5);
        spiralAngle += time * rotSpeed;

        float spiralRadius = distToVortex * (1.0 + vortexStrength * spiralTightness * 0.3);

        vec2 rotatedPos = vec2(
          cos(spiralAngle) * spiralRadius,
          sin(spiralAngle) * spiralRadius
        );

        float suction = suctionStrength * vortexInfluence * (1.0 - layerFactor * 0.3);
        vec2 suctionDir = -normalize(toVortex + vec2(0.001));

        float lift = liftForce * vortexInfluence * vortexStrength;
        lift *= (1.0 - normalizedDist * 0.4);

        float maxLift = vortexHeight * (1.0 - normalizedDist * 0.2);
        float currentLift = lift * (1.0 - smoothstep(0.0, maxLift, pos.y + 80.0));

        float tilt = tiltAmount * vortexStrength * pos.y * 0.008 * tiltDirection;

        vortexMove = vec3(
          (rotatedPos.x - toVortex.x) * vortexInfluence + suctionDir.x * suction + tilt,
          currentLift + (rotatedPos.y - toVortex.y) * vortexInfluence * 0.4,
          suctionDir.y * suction * 0.4
        );

        vec3 turbNoisePos = vec3(pos.xy * 0.015, time * 1.2);
        vortexMove += vec3(
          snoise(turbNoisePos) * 6.0,
          snoise(turbNoisePos + vec3(50.0, 0.0, 0.0)) * 5.0,
          snoise(turbNoisePos + vec3(0.0, 50.0, 0.0)) * 3.0
        ) * vortexInfluence * vortexStrength;
      }
    }

    // ========== 텍스트 형성 모드 ==========
    vec3 formMove = vec3(0.0);

    if (morphProgress > 0.01) {
      vec3 turbPos = vec3(pos.xy * 0.01, time * 0.5);
      float turbX = snoise(turbPos) * turbulence;
      float turbY = snoise(turbPos + vec3(80.0, 0.0, 0.0)) * turbulence * 0.7;

      float gustTime = time * gustFrequency;
      float gust = sin(gustTime + random * 6.28) * cos(gustTime * 0.6) * gustStrength;

      formMove = vec3(turbX + gust, turbY, snoise(turbPos + vec3(0.0, 80.0, 0.0)) * turbulence * 0.4);
    }

    // ========== 최종 위치 계산 ==========
    vec3 morphedPos = mix(position, currentTarget, morphProgress);

    float driftIntensity = (1.0 - morphProgress) * (1.0 - morphProgress);
    morphedPos += driftMove * driftIntensity;

    float formIntensity = morphProgress * (1.0 - morphProgress) * formIntensityMultiplier;
    morphedPos += formMove * formIntensity * 0.6;

    morphedPos += vortexMove * (1.0 - morphProgress * 0.25);

    pos = morphedPos;

    // ========== 형태 유지 시 살아있는 움직임 ==========
    if (morphProgress > 0.5) {
      float aliveIntensity = (morphProgress - 0.5) * 2.0;

      float breathe = sin(time * 1.0) * 0.4 + sin(time * 0.5) * 0.25;
      vec3 breatheMove = normalize(currentTarget) * breathe * aliveBreathScale * aliveIntensity;

      float wavePhase = length(currentTarget.xy) * 0.04 + time * 1.8;
      float waveAmp = sin(wavePhase + random * 6.28) * 0.4;
      vec3 waveMove = vec3(
        cos(wavePhase) * waveAmp,
        sin(wavePhase * 0.7) * waveAmp,
        sin(wavePhase * 1.0) * waveAmp * 0.25
      ) * aliveIntensity;

      vec3 jitter = vec3(
        sin(time * 6.0 + random * 25.0),
        cos(time * 5.5 + random * 20.0),
        sin(time * 4.5 + random * 15.0)
      ) * 0.6 * aliveIntensity;

      float edgeFactor = smoothstep(0.0, 40.0, length(currentTarget.xy));
      vec3 edgeWobble = vec3(
        sin(time * 2.5 + currentTarget.x * 0.08) * 0.6,
        cos(time * 2.0 + currentTarget.y * 0.08) * 0.6,
        sin(time * 1.5) * 0.3
      ) * edgeFactor * aliveIntensity;

      pos += breatheMove + waveMove + jitter + edgeWobble;
    }

    // 기본 진동
    vec3 vibration = vec3(
      sin(time * 4.0 + random * 15.0) * 0.3,
      cos(time * 3.5 + random * 12.0) * 0.3,
      sin(time * 2.5 + random * 8.0) * 0.2
    ) * (morphProgress * vibrationScale + vortexInfluence * 0.7);
    pos += vibration;

    // ========== 출력 ==========
    float distFade = 1.0 - smoothstep(180.0, 350.0, length(pos.xy));
    float vortexBrightness = 1.0 + vortexInfluence * 0.4;
    float formBrightness = 1.0 + morphProgress * 0.25;

    float layerAlpha = mix(baseAlphaLow, baseAlphaHigh, layerFactor);

    vAlpha = layerAlpha * distFade * vortexBrightness * formBrightness;
    vHeightLayer = heightLayer;
    vMorph = morphProgress;
    vVortexInfluence = vortexInfluence;
    vDistortion = vortexInfluence * vortexStrength + morphProgress * 0.25;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float layerSize = mix(1.2, 0.8, layerFactor);
    float vortexSize = 1.0 + vortexInfluence * 0.3;
    float formSize = 1.0 + morphProgress * 0.15;

    float finalSize = particleSize * layerSize * vortexSize * formSize;
    gl_PointSize = (finalSize / -mvPos.z) * (0.9 + random * 0.3);
  }
`;

// ==================== 통합 Fragment Shader ====================
export const PARTICLE_FRAGMENT_SHADER = `
  uniform vec3 colorPrimary;
  uniform vec3 colorSecondary;
  uniform vec3 colorDust;
  uniform float time;
  uniform vec3 morphColorTint;
  uniform vec3 hazeColor;

  varying float vAlpha;
  varying float vHeightLayer;
  varying float vMorph;
  varying float vVortexInfluence;
  varying float vDistortion;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    float alpha = exp(-dist * dist * 4.0);
    alpha = smoothstep(0.0, 1.0, alpha);
    alpha *= vAlpha;

    vec3 baseColor = mix(colorSecondary, colorDust, vHeightLayer);
    baseColor = mix(baseColor, colorPrimary, vVortexInfluence * 0.4);
    baseColor += morphColorTint * vMorph;
    baseColor += vec3(0.03, 0.03, 0.03) * sin(time * 0.6 + vHeightLayer * 3.14);

    float haze = vDistortion * 0.12;
    baseColor = mix(baseColor, hazeColor, haze);

    gl_FragColor = vec4(baseColor, alpha * 0.85);
  }
`;
