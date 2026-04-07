# ADR-100 CSS3 렌더링 확장 — Design Spec

## 개요

현행 CanvasKit/Skia 단독 렌더링 엔진(ADR-100 Phase 9 완료)의 **점진적 확장**이다. 신규 엔진 설계가 아니며, 기존 파일(effects.ts, fills.ts, nodeRendererText.ts 등)을 직접 수정한다. CSS3 시각 정합성을 82% → 97%로 올리고, 동적 효과(transitions, animations) 엔진을 통합한다.

## 결정 사항 요약

| 항목             | 결정                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| 스코프           | G1~G7 갭 수정 + backdrop-filter + text-shadow + mask-image + transitions + animations + 추가 필터 |
| 접근법           | Bottom-Up (렌더러 → 통합)                                                                         |
| transitions 통합 | Pull 모델 (renderFrame → tick → dirty)                                                            |
| mask-image 범위  | gradient + URL image mask, SkSL RuntimeEffect 통합 (alpha + luminance)                            |
| animations       | 범용 엔진만 (UI는 이후 별도)                                                                      |
| oklab 보간       | 순수 TS 구현 (sRGB↔oklab 변환 + stop 증폭)                                                        |
| sticky/fixed     | 기존 stickyResolver.ts 파이프라인 통합 + position: fixed viewport 배치                            |

## 구현 순서 (Bottom-Up)

1. G1~G7 렌더링 정합성 갭 수정
2. text-shadow (2-pass 렌더링)
3. backdrop-filter (saveLayer 보강)
4. mask-image (SkSL RuntimeEffect)
5. 추가 필터 (ColorMatrix) + outline-style
6. position: sticky/fixed 파이프라인 통합
7. transitions 렌더 루프 통합
8. animations @keyframes 엔진

---

## 1. G1~G7 렌더링 정합성 갭 수정

### G1: box-shadow + border-radius

- **현재**: shadow가 직사각형 bounds에 그려져 borderRadius 요소에서 모서리 밖에 shadow 삐져나옴
- **수정**: `renderBox()`에서 shadow 렌더 시 `RRect`(borderRadius 포함)로 `MakeDropShadow` 적용
- **파일**: `nodeRendererBorders.ts`

### G2: box-shadow spread

- **현재**: spread 값 무시됨
- **수정**: spread > 0이면 RRect를 spread만큼 확대, spread < 0이면 축소 후 shadow 렌더. CanvasKit에 spread 직접 지원 없으므로 RRect 크기 조정으로 근사
- **파일**: `nodeRendererBorders.ts`

### G3: blur sigma 정확도

- **현재**: `radius / 2` 사용
- **수정**: W3C 공식 `radius / (2 * Math.sqrt(2 * Math.log(2)))` ≈ `radius / 2.355` 적용
- **파일**: `effects.ts`, `nodeRendererBorders.ts` (shadow blur)

### G4: text-shadow

- **현재**: `textShadows` 필드가 타입에 존재하나 렌더링 미구현
- **수정**: 섹션 2(text-shadow)에서 구현
- **파일**: `nodeRendererText.ts`, `buildTextNodeData.ts`

### G5: repeating-gradient

- **현재**: `linear-gradient`/`radial-gradient`만 처리, repeating 변형 무시
- **수정**: `fills.ts`에서 gradient 타입 파싱 시 `repeating-` 접두사 감지 → `TileMode.Repeat` 설정
- **파일**: `fills.ts`

### G6: radial-gradient 키워드

- **현재**: `closest-side`, `farthest-corner` 등 CSS 키워드 미처리
- **수정**: 키워드를 컨테이너 크기 기준 수치로 변환하는 `resolveRadialExtent()` 함수 추가
- **파일**: `fills.ts`

### G7: oklab 보간

- **현재**: sRGB 공간 보간 (중간 톤이 탁함)
- **수정**: `srgbToOklab()` / `oklabToSrgb()` 변환 + gradient stop 증폭 (원본 stop 사이에 8~16개 중간점 삽입하여 sRGB gradient에 전달)
- **파일**: `fills.ts`, 새 유틸 `colorSpace.ts` (~80줄)

---

## 2. text-shadow (2-pass 렌더링)

### 동작

텍스트에 그림자를 적용. 글자 형태를 따르는 shadow. 다중 shadow 지원.

### 타입

기존 `TextShadow`: `{offsetX, offsetY, sigma, color}` (nodeRendererTypes.ts에 정의됨)

### 렌더링 (nodeRendererText.ts)

1. `textShadows` 배열을 **역순** 순회 (CSS 스펙: 첫 번째 shadow가 맨 위)
2. 각 shadow마다:
   - `canvas.save()` → `canvas.translate(offsetX, offsetY)`
   - blur sigma > 0이면 `ImageFilter.MakeBlur()` + `saveLayer`
   - shadow color로 Paragraph 생성 (원본과 동일 레이아웃, 색상만 변경)
   - `canvas.restore()`
3. 원본 텍스트 Paragraph 렌더

### Paragraph 캐시

shadow용 Paragraph는 원본과 color만 다름 → 캐시 키에 color 포함. shadow 개수가 적으므로(보통 1~2개) 캐시 부담 미미.

### 파일 변경

- `nodeRendererText.ts` — 2-pass shadow 렌더링 로직
- `buildTextNodeData.ts` — CSS `text-shadow` 파싱 강화 (다중 shadow, color 기본값)
- `styleConverter.ts` — `text-shadow` CSS 문자열 → `TextShadow[]` 변환

---

## 3. backdrop-filter

### 동작

요소 뒤의 콘텐츠에 blur/grayscale 등 필터를 적용. 유리 효과(glassmorphism).

### 현재 상태

`effects.ts`에 `backdrop-filter` EffectStyle 타입 존재, `beginRenderEffects()`에 saveLayer + MakeBlur 코드 존재. 실제 "뒤쪽 콘텐츠 캡처 → blur → 위에 요소 합성" 동작 검증 필요.

### 구현

1. `renderCommands.ts`: `CMD_ELEMENT_BEGIN`에 `backdropFilter` 필드 추가
2. `executeRenderCommands()`: 요소 렌더 전에:
   - `SaveLayerRec`에 `ImageFilter.MakeBlur(sigmaX, sigmaY)` 배경 필터 지정
   - `canvas.saveLayer(bounds, backdropPaint)` → 뒤쪽 콘텐츠에 필터 적용
   - 요소 자체를 그린 후 `canvas.restore()`
3. 추가 필터: blur 외 `saturate()`, `brightness()`, `grayscale()` → `ColorFilter.MakeMatrix()` 체이닝
4. 성능: `createsStackingContext()` 플래그 추가, backdrop 요소 변경 시 `content` 프레임 강제

### 파일 변경

- `effects.ts` — 기존 구현 검증 및 보강
- `renderCommands.ts` — backdrop 필드 전달
- `buildBoxNodeData.ts` / `buildSpecNodeData.ts` — CSS `backdrop-filter` 파싱
- `types.ts` — BackdropFilter 타입 (blur + color-matrix 합성)

---

## 4. mask-image (SkSL RuntimeEffect)

### 동작

요소의 가시 영역을 마스크로 제한. gradient fade + image shape cutout + luminance mask.

### SkSL shader

```sksl
uniform shader content;   // 요소 렌더 결과
uniform shader mask;       // gradient 또는 image shader
uniform int mode;          // 0=alpha, 1=luminance

half4 main(float2 coord) {
    half4 c = content.eval(coord);
    half4 m = mask.eval(coord);
    half a = (mode == 0) ? m.a : dot(m.rgb, half3(0.2126, 0.7152, 0.0722));
    return c * a;
}
```

- RuntimeEffect.Make()로 컴파일, 프레임 간 캐싱
- mask shader: `fills.ts`의 gradient shader 또는 `Shader.MakeImage()`

### 렌더링 흐름

1. 요소를 offscreen Surface에 렌더 → `makeImageSnapshot()` → content shader
2. mask source 생성:
   - gradient → `Shader.MakeLinearGradient()` / `MakeTwoPointConicalGradient()`
   - image → `imageCache.loadSkImage()` → `Shader.MakeImage()`
3. RuntimeEffect에 content + mask + mode uniform 바인딩
4. 결과를 main canvas에 `drawRect()` + effect shader

### mask-mode 결정

- `mask-image: url(*.svg)` → luminance (CSS spec `match-source`)
- `mask-image: url(*.png/jpg/webp)` → alpha
- `mask-image: linear-gradient(...)` → alpha
- 사용자 명시적 `mask-mode` 속성 있으면 우선

### mask-size / mask-position

- gradient: 기본 전체 영역
- image: `contain` / `cover` / `auto` 지원 — 기존 `computeImageFit()` 재활용

### 파일 변경

- 새 파일: `nodeRendererMask.ts` (~120줄) — SkSL 컴파일 + 캐시 + apply/release
- `types.ts` — `MaskImageStyle` 타입 (`source`, `mode`, `size`, `position`)
- `buildBoxNodeData.ts` / `buildSpecNodeData.ts` — `mask-image` + `mask-mode` 파싱
- `renderCommands.ts` — mask 필드 전달
- `styleConverter.ts` — `mask-image` 문자열 파싱

---

## 5. 추가 필터 (ColorMatrix) + outline-style

### CSS filter → ColorMatrix (5x4)

| CSS filter        | 변환 방식                          |
| ----------------- | ---------------------------------- |
| `grayscale(n)`    | luminance 가중치 행렬              |
| `sepia(n)`        | 세피아 색조 행렬                   |
| `invert(n)`       | `1-2n` 대각 + `n` offset           |
| `brightness(n)`   | `n` 대각                           |
| `contrast(n)`     | `n` 대각 + `(1-n)/2` offset        |
| `saturate(n)`     | luminance 가중치 + saturation 조절 |
| `hue-rotate(deg)` | RGB 회전 행렬                      |

다중 필터 → 행렬 곱으로 단일 ColorMatrix 합성 → `ColorFilter.MakeMatrix()` 한 번 호출.

### outline-style (dashed/dotted)

- `Paint.setPathEffect(CanvasKit.PathEffect.MakeDash(intervals, phase))`
- dashed: `[dashLen, gapLen]`, dotted: `[1, gapLen]` (round cap + 짧은 dash)
- `nodeRendererBorders.ts` outline 렌더 경로에 PathEffect 분기 추가

### 파일 변경

- `styleConverter.ts` — `parseCSSFilter()` + 7개 행렬 생성 함수
- `effects.ts` — `multiplyColorMatrices()` 유틸
- `nodeRendererBorders.ts` — outline PathEffect 분기
- `buildBoxNodeData.ts` — `filter` CSS 속성 파싱 강화

---

## 6. CSS Transitions — 렌더 루프 통합 (Pull 모델)

### TransitionManager (새 파일, ~150줄)

스타일 변경 감지 → TransitionState 생성 → tick → dirty 노드 갱신.

### 스타일 변경 감지 (StoreRenderBridge 확장)

- `incrementalSync()`에서 요소의 이전/현재 스타일 비교
- `transition` CSS 속성이 있는 요소만 추적
- 변경된 속성마다 `TransitionManager.start(elementId, prop, from, to, duration, easing)` 호출

### 보간 가능 속성 (초기 지원)

| 카테고리 | 속성                                              |
| -------- | ------------------------------------------------- |
| 색상     | backgroundColor, color, borderColor, opacity      |
| 크기     | width, height, borderRadius, padding, margin, gap |
| 변환     | transform (translate, scale, rotate)              |
| 그림자   | boxShadow (offset, blur, spread, color)           |

- 숫자: 직접 lerp
- 색상: sRGB component-wise lerp
- transform: 개별 함수 분해 후 각각 lerp

### Pull 모델 통합 (SkiaRenderer)

- `renderFrame()` 시작 시 `TransitionManager.tick(now)` 호출
- 반환: `dirtyNodeIds: Set<string>`
- dirty 노드 있으면:
  - 보간값을 해당 SkiaNodeData에 override
  - 프레임 타입을 `content`로 승격
  - rAF 유지
- 모든 transition 완료 → 정상 프레임 분류 복귀

### 생명주기

- 요소 삭제 시 관련 transition 정리
- `transition: none` 설정 시 즉시 완료

### 파일 변경

- 새 파일: `transitionManager.ts` (~150줄)
- `transitionEngine.ts` — 변경 없음 (수학 유틸 그대로 사용)
- `SkiaRenderer.ts` — tick 호출 + 프레임 승격
- `StoreRenderBridge.ts` — transition 트리거 추가
- `types.ts` — `TransitionConfig` 타입

---

## 7. CSS Animations (@keyframes) 엔진

### AnimationEngine (새 파일, ~200줄)

```typescript
interface KeyframeAnimation {
  keyframes: Keyframe[];       // [{offset: 0, props: {...}}, {offset: 0.5, ...}, {offset: 1, ...}]
  duration: number;            // ms
  delay: number;
  easing: string;
  iterationCount: number;      // Infinity 가능
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}

start(elementId: string, name: string, animation: KeyframeAnimation): void
stop(elementId: string, name?: string): void
tick(now: number): Set<string>  // dirty nodeIds
isActive(): boolean
```

### Keyframe 보간 로직

1. 경과 시간 → iteration 번호 + iteration 내 progress (0~1)
2. direction에 따라 progress 반전 여부 결정
3. progress로 keyframe 구간 탐색 (이전/다음 keyframe)
4. 구간 내 local progress → easing 적용 → 속성별 lerp
5. fillMode에 따라 시작 전/종료 후 값 결정

### 공유 보간 유틸 (interpolators.ts, ~80줄)

TransitionManager와 AnimationEngine이 공유:

- `lerpNumber(a, b, t)`
- `lerpColor(a, b, t)` — sRGB component-wise
- `lerpTransform(a, b, t)` — translate/scale/rotate 분해
- `lerpBoxShadow(a, b, t)`

### 렌더 루프 통합

```
SkiaRenderer.renderFrame():
  TransitionManager.tick(now) → dirtyA
  AnimationEngine.tick(now)   → dirtyB
  dirtyAll = dirtyA ∪ dirtyB
```

- animation 값이 transition 값보다 우선 (CSS 스펙)
- 둘 중 하나라도 active이면 rAF 유지

### 파일 변경

- 새 파일: `animationEngine.ts` (~200줄)
- 새 파일: `interpolators.ts` (~80줄)
- `transitionManager.ts` — interpolators.ts 임포트로 전환
- `SkiaRenderer.ts` — animationEngine.tick() 추가

---

## 8. position: sticky / fixed — 파이프라인 통합

### 현재 상태

`stickyResolver.ts`에 순수 함수(`resolveStickyY`, `resolveStickyX`)가 완성되어 있음 (Stickyfill 3단계 패턴: normal → stuck → limit). 테스트 포함. **렌더 파이프라인에 미통합**.

### sticky 통합 설계

**1. 레이아웃 post-processing (fullTreeLayout.ts 또는 renderCommands.ts):**

- DFS 순회 중 `position: sticky` 요소 감지
- 해당 요소의 스크롤 가능 조상(scrollable ancestor) 탐색
- `resolveStickyY/X()`에 레이아웃 결과 + scrollState 전달
- 보정된 y/x를 최종 렌더 좌표로 사용

**2. 스크롤 연동:**

- `scrollState.scrollOffset` 변경 시 sticky 요소 좌표 재계산 필요
- 기존 `scrollState.scrollVersion` 카운터가 캐시 무효화에 사용되므로, sticky 보정도 이 카운터에 의존
- sticky 요소가 있는 스크롤 컨테이너의 스크롤 이벤트 → sticky 좌표 갱신 → 프레임 `content` 승격

**3. 컨테이너 bounds 결정:**

- sticky 요소의 제한 컨테이너 = 가장 가까운 scrollable ancestor (overflow !== visible)
- `containerTop/Bottom/Left/Right` = 해당 컨테이너의 content box bounds
- `childrenMap`으로 조상 순회하여 결정

**4. treeBoundsMap 동기화:**

- sticky 보정 후 좌표가 treeBoundsMap에도 반영되어야 selection outline/hover가 정확
- `buildTreeBoundsMap`에서 sticky 보정 적용

### position: fixed 설계

- sticky와 유사하나 **컨테이너 제한 없음**
- 뷰포트(canvas viewport) 기준 절대 배치
- `renderCommands.ts`에서 fixed 요소는 camera transform을 역적용하여 viewport 고정 위치 유지
- 용도: 빌더 내 floating toolbar, 고정 헤더 프리뷰

### 파일 변경

- `renderCommands.ts` — sticky/fixed 요소 좌표 보정 분기
- `fullTreeLayout.ts` 또는 `skiaTreeBuilder.ts` — DFS 순회 중 sticky resolver 호출
- `buildTreeBoundsMap` — sticky 보정 좌표 반영
- `stickyResolver.ts` — 변경 없음 (기존 순수 함수 유지)
- `types.ts` — `PositionType` 확장 (sticky/fixed 플래그)

### 예상 규모

- 신규: 0줄 (resolver 이미 완성)
- 통합 코드: ~80줄 (렌더 파이프라인 + bounds 동기화)

---

## 파일 변경 요약

### 새 파일 (4개, ~480줄)

| 파일                   | 역할                                    | 규모   |
| ---------------------- | --------------------------------------- | ------ |
| `colorSpace.ts`        | sRGB↔oklab 변환 + gradient stop 증폭    | ~80줄  |
| `nodeRendererMask.ts`  | SkSL mask 컴파일 + 캐시 + apply/release | ~120줄 |
| `transitionManager.ts` | 변경 감지 + tick + dirty 관리           | ~150줄 |
| `animationEngine.ts`   | @keyframes 범용 엔진                    | ~200줄 |
| `interpolators.ts`     | 공유 보간 유틸 (lerp)                   | ~80줄  |

### 수정 파일

| 파일                                          | 변경 내용                                                        |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `nodeRendererBorders.ts`                      | G1/G2 shadow RRect + outline PathEffect                          |
| `nodeRendererText.ts`                         | G4 text-shadow 2-pass                                            |
| `effects.ts`                                  | G3 sigma 공식 + multiplyColorMatrices                            |
| `fills.ts`                                    | G5 repeating + G6 radial 키워드 + G7 oklab                       |
| `styleConverter.ts`                           | text-shadow/mask-image/filter 파싱                               |
| `buildBoxNodeData.ts`                         | backdrop-filter/mask-image/filter 파싱                           |
| `buildSpecNodeData.ts`                        | backdrop-filter/mask-image 파싱                                  |
| `renderCommands.ts`                           | backdrop/mask 필드 전달 + sticky/fixed 좌표 보정                 |
| `types.ts`                                    | BackdropFilter/MaskImageStyle/TransitionConfig/PositionType 타입 |
| `SkiaRenderer.ts`                             | transition/animation tick + 프레임 승격                          |
| `StoreRenderBridge.ts`                        | transition 트리거                                                |
| `transitionEngine.ts`                         | 변경 없음 (기존 수학 유틸 유지)                                  |
| `stickyResolver.ts`                           | 변경 없음 (기존 순수 함수 유지)                                  |
| `fullTreeLayout.ts` 또는 `skiaTreeBuilder.ts` | sticky resolver 호출 + bounds 동기화                             |
| `buildTreeBoundsMap`                          | sticky 보정 좌표 반영                                            |

### 예상 총 규모

- 신규: ~630줄 (5개 파일)
- 수정: ~560줄 (sticky/fixed 통합 ~80줄 추가)
- **합계: ~1,190줄**

---

## 성능 고려

| 기능                   | 비용                         | 대응                                          |
| ---------------------- | ---------------------------- | --------------------------------------------- |
| backdrop-filter        | saveLayer (GPU 오프스크린)   | createsStackingContext 플래그, 최소화 권장    |
| mask-image             | offscreen Surface + SkSL     | RuntimeEffect 캐싱, Surface 재사용            |
| text-shadow            | shadow 개수 × Paragraph 생성 | LRU 캐시 (color 키 포함)                      |
| transitions/animations | 매 프레임 tick               | dirty set으로 변경 노드만 갱신, idle 시 0 CPU |
| oklab 보간             | stop 증폭 (8~16x)            | gradient 생성 시 1회, 렌더 시 영향 없음       |
| ColorMatrix            | 행렬 곱 합성                 | 단일 MakeMatrix 호출로 GPU 부담 최소          |

## 테스트 전략

각 섹션별 unit test:

- G1~G7: 수치 정확도 (sigma 공식, radial extent, oklab 변환)
- text-shadow: 렌더 호출 순서 검증
- mask-image: SkSL 컴파일 성공 + mode 분기
- transitions: computeTransitionValue + tick→dirty 흐름
- animations: keyframe 보간 + direction/fillMode
- interpolators: lerp 함수 정확도
- ColorMatrix: 합성 결과 검증
- sticky/fixed: 기존 stickyResolver 테스트 + 파이프라인 통합 후 bounds 정확도 (WPT 스타일 브라우저 비교 5+ 케이스)
