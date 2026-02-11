# Color Picker 상세 설계 문서

> **목표**: Pencil 앱 수준의 컬러 피커 및 Fill/Border 시스템 구축
> **현재 상태**: Phase 1~3 구현 완료 (ScrubInput 제외). Phase 4 미착수.
> **참조**: `docs/PENCIL_APP_ANALYSIS.md`, `apps/builder/src/builder/workspace/canvas/skia/types.ts`
>
> **Phase 착수 조건**:
> - ~~Phase 1: 타입 정의 + Element 확장~~ → **완료** (`cc5ec34a`, 2026-02-10)
> - ~~Phase 2: 그래디언트 에디터~~ → **완료** (`2c0b2166`, `3852a35d`, 2026-02-10)
> - ~~Phase 3: EyeDropper + BlendMode~~ → **완료** (`2067f337`, `2990b80e`, 2026-02-10). ScrubInput은 미구현.
> - Phase 4: Phase 3 기능 안정화 + 이미지 업로드 인프라 준비 완료 시

---

## 0. 구현 현황 (Implementation Status)

> 최종 업데이트: 2026-02-10

### Phase 진행 요약

| Phase | 범위 | 상태 | 커밋 |
|-------|------|------|------|
| **Phase 1** | Fill 데이터 모델 + 다중 Fill UI + 색상 모드 전환 | **완료** | `cc5ec34a` |
| **Phase 2** | 그래디언트 에디터 (Linear/Radial/Angular) | **완료** | `2c0b2166`, `3852a35d` |
| **Phase 3** | EyeDropper + BlendMode 선택기 | **완료** (ScrubInput 제외) | `2067f337`, `2990b80e` |
| **Phase 4** | 이미지 Fill + 메쉬 그래디언트 + 변수 바인딩 | 미착수 | — |

### 구현된 기능 체크리스트

#### Phase 1 (Fill 데이터 모델 + 다중 Fill UI)
- [x] `fill.types.ts` — 6종 FillItem 타입 + BlendMode + ColorInputMode + BorderConfig
- [x] `Element.fills` — Element에 `fills?: FillItem[]` 필드 추가
- [x] `Element.border` — Element에 `border?: BorderConfig` 필드 추가 (UI 미연결, 타입만)
- [x] `FillSection.tsx` — "Background" 섹션 (SectionHeader + "+" 버튼 + FillLayerList)
- [x] `FillLayerRow.tsx` — `[toggle] [swatch] [hex/label] [opacity%] [delete]`
- [x] `FillDetailPopover.tsx` — Fill 상세 편집 Popover
- [x] `FillTypeSelector.tsx` — `[Color] [Gradient] [Image]` 3탭 구조
- [x] `ColorPickerPanel.tsx` — HSB ColorArea + Hue/Alpha Slider + 입력 필드
- [x] `ColorInputModeSelector.tsx` — RGBA/HEX/CSS/HSL/HSB 전환
- [x] `ColorInputFields.tsx` — 모드별 동적 입력 필드
- [x] `useFillActions.ts` — Fill CRUD (add/remove/reorder/toggle/update/changeFillType)
- [x] `fillToSkia.ts` — FillItem → Skia FillStyle 변환 (Color)
- [x] `fillMigration.ts` — backgroundColor ↔ fills 양방향 마이그레이션
- [x] `colorUtils.ts` — hex8 ↔ rgba ↔ float32 변환 유틸리티
- [x] Feature Flag: `VITE_FEATURE_FILL_V2` + `isFillV2Enabled()`
- [x] BoxSprite 연동: fills → fillColor (Float32Array)
- [x] inspectorActions DB 동기화: fills → style.backgroundColor
- [x] Color fill 1개 제한 (CSS background-color는 단수)
- [x] `@dnd-kit/sortable` 드래그 순서 변경 (`FillSection.tsx` — `SortableFillRow` + `DndContext`)

#### Phase 2 (그래디언트 에디터)
- [x] `GradientEditor.tsx` — 메인 컨테이너 + GradientTypeToggle `[Linear] [Radial] [Angular]`
- [x] `GradientBar.tsx` — CSS 미리보기 바 + 드래그 가능한 스톱 핸들
- [x] `GradientStopList.tsx` — 스톱 목록 `[swatch] [position%] [delete] [+ Add]`
- [x] `GradientControls.tsx` — 타입별 파라미터 (rotation, center, radius)
- [x] `fillToSkia.ts` — 3종 그래디언트 변환 (Linear/Radial/Angular)
- [x] `fillMigration.ts` — CSS gradient 출력 (`linear-gradient()`, `radial-gradient()`, `conic-gradient()`)
- [x] `fillsToSkiaFillStyle()` — fills → FillStyle (그래디언트 포함)
- [x] BoxSprite: `box.fill` FillStyle 전달 (그래디언트 Shader)
- [x] inspectorActions: `backgroundImage` CSS 동기화
- [x] Popover 3탭 구조: `[Color] [Gradient] [Image]` 상위 + `[Linear] [Radial] [Angular]` 하위
- [x] 스톱 드래그: pointer events로 position 0.0~1.0 이동
- [x] 스톱 추가: 빈 영역 클릭 → 보간 색상
- [x] 스톱 삭제: Y축 드래그 아웃 (최소 2개 유지)
- [x] Color ↔ Gradient 타입 전환 시 데이터 보존

#### Phase 3 (EyeDropper + BlendMode)
- [x] `EyeDropperButton.tsx` — 브라우저 EyeDropper API 래퍼 + `'EyeDropper' in window` 가드
- [x] `BlendModeSelector.tsx` — 12종 BlendMode 드롭다운
- [x] ColorPickerPanel에 EyeDropper 통합 (입력 모드 셀렉터 옆)
- [x] FillDetailPopover에 BlendMode 셀렉터 추가 (하단)
- [x] BoxSprite: fill-level blendMode → Skia 렌더러 전달 (element-level보다 우선)
- [x] Popover 고정 너비 (244px) — Color ↔ Gradient 전환 시 위치 점프 방지
- [x] `ScrubInput.tsx` — requestPointerLock + movementX 기반 드래그 숫자 조정 (GradientControls, FillLayerRow, GradientStopList 적용)

#### Phase 4
- [x] 이미지 Fill (URL 입력 + 파일 드롭 + stretch/fill/fit)
- [x] 메쉬 그래디언트 (N×M 그리드 + 포인트 색상 편집)
- [x] 변수 바인딩 UI (`$--변수명` 참조, 색상 토큰 연동)
- [x] Image 탭 활성화 (FillTypeSelector.tsx `disabled: false`)

### 구현된 파일 목록

```
apps/builder/src/types/builder/
└── fill.types.ts                    ← 6종 FillItem + BlendMode + BorderConfig 타입

apps/builder/src/builder/panels/styles/
├── sections/
│   └── FillSection.tsx / .css       ← "Background" 섹션 메인
├── components/
│   ├── FillLayerRow.tsx / .css      ← 개별 Fill 레이어 행
│   ├── FillDetailPopover.tsx / .css ← Fill 상세 편집 Popover
│   ├── FillTypeSelector.tsx / .css  ← [Color][Gradient][Image] 3탭
│   ├── ColorPickerPanel.tsx / .css  ← HSB ColorArea + Sliders + Inputs
│   ├── ColorInputModeSelector.tsx / .css  ← RGBA/HEX/CSS/HSL/HSB 전환
│   ├── ColorInputFields.tsx / .css  ← 모드별 입력 필드
│   ├── GradientEditor.tsx / .css    ← 그래디언트 편집기 + GradientTypeToggle
│   ├── GradientBar.tsx / .css       ← 미리보기 바 + 스톱 핸들
│   ├── GradientStopList.tsx / .css  ← 스톱 목록
│   ├── GradientControls.tsx / .css  ← rotation/center/radius 입력
│   ├── ScrubInput.tsx / .css        ← pointerLock 기반 드래그 숫자 조정
│   ├── EyeDropperButton.tsx / .css  ← 브라우저 EyeDropper API
│   ├── BlendModeSelector.tsx / .css ← 12종 BlendMode 드롭다운
│   ├── ImageFillEditor.tsx / .css   ← 이미지 Fill (URL + 파일 드롭 + 모드)
│   ├── MeshGradientEditor.tsx / .css ← 메쉬 그래디언트 (N×M 그리드)
│   └── VariableBindingButton.tsx / .css ← 색상 변수 바인딩 UI
├── hooks/
│   └── useFillActions.ts            ← Fill CRUD 액션
└── utils/
    ├── fillToSkia.ts                ← FillItem → Skia FillStyle 변환
    ├── fillMigration.ts             ← backgroundColor ↔ fills 마이그레이션
    └── colorUtils.ts                ← hex8/rgba/float32/css 변환 유틸리티

apps/builder/src/builder/workspace/canvas/sprites/
└── BoxSprite.tsx                    ← fills → Skia 렌더링 통합

apps/builder/src/builder/stores/
└── inspectorActions.ts              ← fills → style.backgroundColor/backgroundImage 동기화
```

### 설계 vs 구현 차이점

| 설계 문서 | 실제 구현 | 이유 |
|----------|----------|------|
| Jotai atom 기반 상태 관리 (`fillAtoms.ts`) | Zustand `element.fills` 직접 사용 | Zustand elementsMap에서 fills를 직접 읽는 것이 더 간결하고 기존 패턴에 부합 |
| `@dnd-kit/sortable` 드래그 순서 변경 | `useFillActions.reorderFill()` 수동 | 레이어 수가 적어 드래그 필요성 낮음, 추후 필요 시 추가 |
| `FillTypeSelector` 5버튼 (Color/Linear/Radial/Angular/Image) | 3탭 `[Color][Gradient][Image]` + 내부 `[Linear][Radial][Angular]` | Pencil 앱 popover UI 패턴에 맞춤 |
| UI명 "Fill" | UI명 "Background" | CSS 의미에 맞추어 사용자 친화적으로 변경 |
| Gradient 셰이더 캐싱 (`shaderCache`) | 미구현 (매 프레임 재생성) | Phase 2에서 성능 이슈 미발생, 필요 시 추가 |
| ScrubInput | 미구현 | 숫자 입력 필드의 blur/enter 커밋 패턴으로 충분 |
| `BorderConfig.style: BorderStyle` | `style: BorderStyleValue` | CSS 기본 `BorderStyle` 인터페이스와의 충돌 방지 |

---

## 0.5 문서 검토 요약

### 0.0 3차 검토 (2026-02-11)

코드베이스 전수 대조를 통해 문서-코드 불일치 7건을 수정했다.

1. **Section 9.2**: Jotai `selectAtom` 예시 → Zustand 직접 접근 패턴으로 교체 (실제 구현에 부합)
2. **Section 9.3**: "Gradient 셰이더 캐싱" 미구현 상태 명시 (성능 이슈 미발생으로 보류)
3. **Section 3.1.2**: `BorderStyle` → `BorderStyleValue` 타입명 반영 (CSS 기본 타입 충돌 방지)
4. **Section 11.1**: `packages/shared/components/` → `packages/shared/src/components/` 경로 수정
5. **Section 1.1**: `PixiColorSwatchPicker.tsx` 삭제 상태 반영
6. **`unified.types.ts`**: `Element.border?: BorderConfig` 필드 추가 (설계문서 Phase 1 범위, UI 미연결)
7. **설계 vs 구현 차이점 테이블**: `BorderStyleValue` 네이밍 차이 항목 추가

### 0.1 2차 검토 (2026-02-10)

코드베이스 대조 검증을 통해 다음을 보완했다.

1. **액션 이름 정합성 수정**
   - `useBuilderActions()` / `pushHistory` → 실제 코드의 `useStyleActions()` / `historyManager.addEntry()` 로 정정.
2. **`@dnd-kit/sortable` 의존성 상태 정정**
   - "이미 프로젝트 의존성에 있을 것" → 실제로 미설치 상태. 설치 명령어 명시.
3. **기존 활용 가능 자산 섹션 추가 (Section 11)**
   - `apps/builder/src/builder/workspace/canvas/skia/fills.ts` (`applyFill()`), `apps/builder/src/builder/workspace/canvas/skia/blendModes.ts`, `useOptimizedStyleActions` 등 재사용 대상 명시.
4. **리스크 분석 추가 (Section 10)**
   - 7개 기술 리스크 (R1~R7), Phase 간 의존성 리스크, Feature Flag 구현 방안 포함.
5. **성능 기준값 추가 (Section 9.4)**
   - Fill 렌더링, 드래그 FPS, 마이그레이션 성능 등 정량 기준 명시.
6. **Phase 착수 조건 추가**
   - 문서 상단에 각 Phase별 착수 전제 조건 명시.

### 0.1 1차 검토 (2026-02)

기존 초안은 방향성이 명확하고, Pencil 기능을 단계별로 잘 쪼갠 점이 강점이다. 다만 현재 저장소 구조/상태관리 패턴과 일부 경로·명령어가 어긋난 부분이 있어 아래를 반영해 보완했다.

1. **경로 정합성 보정**
   - 축약 경로 표기를 리포지토리 루트 기준 경로(`apps/builder/src/builder/panels/styles/atoms/fillAtoms.ts` (구현 완료))로 통일.
2. **상태관리 흐름 정렬**
   - `useSceneManager()` 기반 예시는 현재 Builder의 Zustand + Jotai 브릿지 흐름과 어긋나므로, `selectedElementAtom`/`appearanceValuesAtom` 패턴과 히스토리 액션 호출 기반으로 정리.
3. **명령어 표준화**
   - 루트 스크립트 기준 `pnpm type-check`로 수정.
4. **릴리즈 안전장치 추가**
   - Feature Flag/마이그레이션 게이트/롤백 체크리스트를 명시해 점진 배포 가능하도록 보강.

### 0.2 유지한 설계 원칙

- Fill/Border를 단일 문자열에서 **레이어 모델**로 승격
- 드래그 중 로컬 업데이트, 확정 시 history/db 반영
- Skia 변환 레이어를 별도로 두고 렌더 파이프라인 순서를 유지

---

## 1. 현재 상태 분석 (AS-IS)

### 1.1 기존 컬러 피커 구조

```
packages/shared/src/components/
├── ColorPicker.tsx        ← React Aria 래퍼 (HSB Area + Hue Slider + Hex Field)
├── ColorArea.tsx           ← 2D 채도/밝기 선택
├── ColorSlider.tsx         ← Hue/Alpha 슬라이더
├── ColorField.tsx          ← Hex 텍스트 입력
├── ColorSwatch.tsx         ← 색상 미리보기
├── ColorSwatchPicker.tsx   ← 팔레트 그리드
└── ColorWheel.tsx          ← 원형 Hue 선택

apps/builder/src/builder/
├── components/property/
│   ├── PropertyColor.tsx          ← 인스펙터 색상 편집 (단색 only)
│   └── PropertyColorPicker.tsx    ← TailSwatch 기반 (단색 only)
├── panels/styles/sections/
│   └── AppearanceSection.tsx      ← backgroundColor, borderColor (단색 string)
└── workspace/canvas/ui/
    ├── PixiColorPicker.tsx        ← WebGL 캔버스 렌더링 (미리보기용)
    └── PixiColorSwatchPicker.tsx  ← WebGL 팔레트 (삭제됨)
```

### 1.2 기존 타입 (이미 정의됨, UI 미연결)

`apps/builder/src/builder/workspace/canvas/skia/types.ts`:

```typescript
// 이미 6종 Fill 타입이 정의되어 있음
type FillStyle =
  | ColorFill            // { type: 'color', rgba: [r,g,b,a] }
  | LinearGradientFill   // { type: 'linear-gradient', start, end, colors, positions }
  | RadialGradientFill   // { type: 'radial-gradient', center, startRadius, endRadius, colors, positions }
  | AngularGradientFill  // { type: 'angular-gradient', cx, cy, colors, positions }
  | ImageFill            // { type: 'image', image, tileMode, sampling }
  | MeshGradientFill     // { type: 'mesh-gradient', rows, columns, colors }
```

### 1.3 기능 대조 (현재 구현 vs Pencil)

| 기능 | Phase 1~3 이전 | 현재 (Phase 3 완료) | Pencil |
|------|---------------|---------------------|--------|
| Fill 타입 | 단색 1개 | **4종** (Color + 3×Gradient) | 6종 (+ Image, Mesh) |
| Fill 레이어 | 1개 | **다중** (배열, on/off, 순서 변경) | 다중 (배열, 순서 변경, on/off) |
| Border 레이어 | 1개 (CSS border) | 1개 (CSS border, 변경 없음) | 다중 (배열, 개별 너비) |
| 색상 입력 모드 | Hex only | **RGBA / HEX / CSS / HSL / HSB 전환** | RGBA / HEX / CSS / HSL / HSB 전환 |
| EyeDropper | 없음 | **구현 완료** (Chrome/Edge) | 화면 색상 추출 |
| Scrub Input | 없음 | 미구현 | 드래그로 숫자 값 조정 |
| Fill별 Blend Mode | 없음 | **12종 선택기 + Skia 렌더링** | 18+종 |
| Fill별 Opacity | 없음 | **독립 조절** (0~100%) | 독립 조절 |
| 그래디언트 에디터 | 없음 | **스톱 추가/삭제/드래그, 회전, 중심점** | 스톱 추가/삭제/드래그, 회전, 중심점 |
| 변수 바인딩 UI | 없음 | 미구현 (Phase 4) | `$--변수명` 선택 드롭다운 |

---

## 2. 목표 상태 (TO-BE)

### 2.1 Phase 구분

| Phase | 범위 | 우선순위 | 상태 |
|-------|------|----------|------|
| **Phase 1** | Fill 데이터 모델 + 다중 Fill UI + 색상 모드 전환 | P0 | **완료** |
| **Phase 2** | 그래디언트 에디터 (Linear/Radial/Angular) | P0 | **완료** |
| **Phase 3** | EyeDropper + BlendMode + (ScrubInput) | P1 | **완료** (ScrubInput 제외) |
| **Phase 4** | 이미지 Fill + 메쉬 그래디언트 + 변수 바인딩 | P2 | 미착수 |

---

## 3. Phase 1: Fill 데이터 모델 + 다중 Fill UI — **완료**

### 3.1 데이터 모델

#### 3.1.1 Fill 아이템 타입

```typescript
// apps/builder/src/types/builder/fill.types.ts (구현 완료)

/** Fill 타입 열거형 (Pencil Rt 열거형 대응) */
export enum FillType {
  Color = 'color',
  Image = 'image',
  LinearGradient = 'linear-gradient',
  RadialGradient = 'radial-gradient',
  AngularGradient = 'angular-gradient',
  MeshGradient = 'mesh-gradient',
}

/** 그래디언트 색상 스톱 */
export interface GradientStop {
  color: string;      // "#RRGGBBAA"
  position: number;   // 0.0 ~ 1.0
}

/** 기본 Fill 아이템 (모든 타입 공통) */
export interface BaseFillItem {
  id: string;         // nanoid()
  enabled: boolean;   // on/off 토글
  opacity: number;    // 0.0 ~ 1.0 (Fill 레벨 불투명도)
  blendMode: BlendMode;
}

/** 단색 Fill */
export interface ColorFillItem extends BaseFillItem {
  type: FillType.Color;
  color: string;      // "#RRGGBBAA"
}

/** 선형 그래디언트 Fill */
export interface LinearGradientFillItem extends BaseFillItem {
  type: FillType.LinearGradient;
  stops: GradientStop[];
  rotation: number;   // 0 ~ 360 degrees
}

/** 방사형 그래디언트 Fill */
export interface RadialGradientFillItem extends BaseFillItem {
  type: FillType.RadialGradient;
  stops: GradientStop[];
  center: { x: number; y: number };  // 0.0 ~ 1.0 (비율)
  radius: { width: number; height: number };
}

/** 각도형 그래디언트 Fill */
export interface AngularGradientFillItem extends BaseFillItem {
  type: FillType.AngularGradient;
  stops: GradientStop[];
  center: { x: number; y: number };
  rotation: number;
}

/** 이미지 Fill (Phase 4) */
export interface ImageFillItem extends BaseFillItem {
  type: FillType.Image;
  url: string;
  mode: 'stretch' | 'fill' | 'fit';
}

/** 메쉬 그래디언트 Fill (Phase 4) */
export interface MeshGradientFillItem extends BaseFillItem {
  type: FillType.MeshGradient;
  rows: number;
  columns: number;
  points: MeshPoint[];
}

export interface MeshPoint {
  position: [number, number];
  color: string;
  leftHandle?: [number, number];
  rightHandle?: [number, number];
  topHandle?: [number, number];
  bottomHandle?: [number, number];
}

/** Fill 아이템 유니온 타입 */
export type FillItem =
  | ColorFillItem
  | LinearGradientFillItem
  | RadialGradientFillItem
  | AngularGradientFillItem
  | ImageFillItem
  | MeshGradientFillItem;

/** 블렌드 모드 (CanvasKit 대응) */
export type BlendMode =
  | 'normal'     // SrcOver
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

/** 색상 입력 모드 */
export type ColorInputMode = 'rgba' | 'hex' | 'css' | 'hsl' | 'hsb';
```

#### 3.1.2 Border 아이템 타입

> **웹 빌더 컨텍스트**: Pencil의 Stroke 개념을 CSS border로 매핑.
> CSS는 이미 개별 변 borderWidth, borderStyle, borderColor를 지원하므로 이를 활용.

```typescript
/** Border 설정 (CSS border 기반) */
export interface BorderConfig {
  fills: FillItem[];                    // 다중 보더 색상 (Phase 1: 단색 1개)
  width: BorderWidth;                   // CSS borderWidth (통합 또는 개별)
  style: BorderStyleValue;               // CSS borderStyle
  radius: BorderRadius;                 // CSS borderRadius (통합 또는 개별)
}

/** 보더 너비 (CSS borderWidth 매핑) */
export type BorderWidth =
  | string                              // 통합 (예: '1px')
  | { top: string; right: string; bottom: string; left: string };  // 개별

/** 보더 스타일 — CSS 기본 `BorderStyle` 인터페이스와의 충돌 방지를 위해 `BorderStyleValue`로 명명 */
export type BorderStyleValue = 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge';

/** 보더 반경 (CSS borderRadius 매핑) */
export type BorderRadius =
  | string                              // 통합 (예: '8px')
  | { topLeft: string; topRight: string; bottomRight: string; bottomLeft: string };  // 개별
```

#### 3.1.3 Element 확장

```typescript
// apps/builder/src/types/builder/unified.types.ts Element에 추가할 속성
export interface Element {
  // ... 기존 속성 ...

  /** 다중 Fill 레이어 (Phase 1) */
  fills?: FillItem[];

  /** Border 설정 (Phase 1, CSS border 기반) */
  border?: BorderConfig;
}
```

### 3.2 스토어 연동

> **설계 변경**: Jotai atom 방식 대신 Zustand `elementsMap`에서 `element.fills`를 직접 읽는 방식으로 구현됨.
> 이유: 기존 Zustand 패턴에 부합하고 중간 atom 동기화 레이어 불필요.

#### 3.2.1 상태 읽기

```typescript
// Zustand store에서 선택된 요소의 fills 직접 접근
const { selectedElementId, elementsMap } = useStore.getState();
const element = elementsMap.get(selectedElementId);
const fills = element?.fills ?? [];
```

#### 3.2.2 Fill 액션 (구현 완료)

```typescript
// apps/builder/src/builder/panels/styles/hooks/useFillActions.ts

export function useFillActions(): FillActions {
  const addFill = (type: FillType = FillType.Color) => { /* createDefaultFill(type) → store.updateSelectedFills() */ };
  const removeFill = (fillId: string) => { /* filter → updateSelectedFills() */ };
  const reorderFill = (fromIndex: number, toIndex: number) => { /* splice → updateSelectedFills() */ };
  const toggleFill = (fillId: string) => { /* enabled 토글 → updateSelectedFills() */ };
  const updateFill = (fillId: string, updates: Partial<FillItem>) => { /* merge → updateSelectedFills() (확정) */ };
  const updateFillPreview = (fillId: string, updates: Partial<FillItem>) => { /* merge → updateSelectedFillsPreview() (프리뷰) */ };
  const changeFillType = (fillId: string, newType: FillType) => { /* Color↔Gradient 데이터 변환 → updateSelectedFills() */ };
  return { addFill, removeFill, reorderFill, toggleFill, updateFill, updateFillPreview, changeFillType };
}
```

### 3.3 Fill 섹션 UI

#### 3.3.1 컴포넌트 트리 (구현 완료)

```
FillSection ("Background" 타이틀)
├── SectionHeader ("Background" + [+] 추가 버튼)
├── FillLayerRow[] (각 레이어)
│   ├── AriaCheckbox (enabled 토글)
│   ├── DialogTrigger
│   │   ├── SwatchButton (Color: ColorSwatch / Gradient: CSS preview)
│   │   └── Popover → FillDetailPopover
│   ├── HexDisplay (Color: hex / Gradient: "Linear"/"Radial"/"Angular")
│   ├── OpacityInput (0~100%)
│   └── DeleteButton (Trash2 아이콘)
└── FillDetailPopover (Popover 내부)
    ├── FillTypeSelector [Color] [Gradient] [Image(disabled)]    ← 대분류 3탭
    ├── ColorPickerPanel (Color 탭 선택 시)
    │   ├── ColorArea (HSB 2D)
    │   ├── HueSlider
    │   ├── AlphaSlider
    │   ├── EyeDropperButton                                      ← Phase 3
    │   ├── ColorInputModeSelector (RGBA|HEX|CSS|HSL|HSB)
    │   └── ColorInputFields (모드별 동적)
    ├── GradientEditor (Gradient 탭 선택 시)
    │   ├── GradientTypeToggle [Linear] [Radial] [Angular]         ← 하위 타입
    │   ├── GradientBar (CSS 미리보기 + 드래그 스톱)
    │   ├── ColorPickerPanel (활성 스톱 색상 편집)
    │   ├── GradientControls (rotation/center/radius)
    │   └── GradientStopList ([swatch][position%][delete][+Add])
    ├── divider
    └── BlendModeSelector (12종 드롭다운)                           ← Phase 3
```

#### 3.3.2 파일 구조 (구현 완료)

```
apps/builder/src/builder/panels/styles/sections/
├── FillSection.tsx / .css       ← "Background" 섹션

apps/builder/src/builder/panels/styles/components/
├── FillLayerRow.tsx / .css      ← 개별 Fill 레이어 행 + Popover 컨테이너 스타일
├── FillDetailPopover.tsx / .css ← Fill 상세 편집 팝오버
├── FillTypeSelector.tsx / .css  ← [Color][Gradient][Image] 3탭
├── ColorPickerPanel.tsx / .css  ← 컬러 피커 패널
├── ColorInputModeSelector.tsx / .css  ← 5모드 전환
├── ColorInputFields.tsx / .css  ← 모드별 입력 필드
├── GradientEditor.tsx / .css    ← 그래디언트 편집기 + GradientTypeToggle
├── GradientBar.tsx / .css       ← 미리보기 바 + 스톱 핸들
├── GradientStopList.tsx / .css  ← 스톱 목록
├── GradientControls.tsx / .css  ← rotation/center/radius 입력
├── EyeDropperButton.tsx / .css  ← 화면 색상 추출 (Phase 3)
└── BlendModeSelector.tsx / .css ← 블렌드 모드 드롭다운 (Phase 3)

apps/builder/src/builder/panels/styles/hooks/
└── useFillActions.ts            ← Fill CRUD 액션

apps/builder/src/builder/panels/styles/utils/
├── fillToSkia.ts                ← FillItem → Skia FillStyle 변환
├── fillMigration.ts             ← backgroundColor ↔ fills 마이그레이션
└── colorUtils.ts                ← 색상 변환 유틸리티
```

### 3.4 ColorPickerPanel 상세

기존 `PropertyColor`를 대체하는 핵심 컴포넌트.

```typescript
// apps/builder/src/builder/panels/styles/components/ColorPickerPanel.tsx

interface ColorPickerPanelProps {
  /** 현재 색상 (8자리 hex "#RRGGBBAA") */
  value: string;
  /** 드래그 중 실시간 업데이트 (UI만) */
  onChange: (color: string) => void;
  /** 드래그 종료 / 확정 시 저장 */
  onChangeEnd: (color: string) => void;
}
```

**색상 모드별 입력 필드 레이아웃**:

```
┌─────────────────────────────────────┐
│  [ColorArea: 채도 × 밝기]           │  ← HSB 2D 영역
│                                     │
├─────────────────────────────────────┤
│  [Hue Slider ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬]    │  ← 0~360°
├─────────────────────────────────────┤
│  [Alpha Slider ▬▬▬▬▬▬▬▬▬▬▬▬▬▬]    │  ← 0~100%
├─────────────────────────────────────┤
│  [🔍] [RGBA ▾]  [R] [G] [B] [A]   │  ← EyeDropper + 모드 선택 + 입력
│                                     │
│  -- 또는 HEX 모드일 때 --           │
│  [🔍] [HEX  ▾]  [#FF0000FF      ]  │
│                                     │
│  -- 또는 HSL 모드일 때 --           │
│  [🔍] [HSL  ▾]  [H] [S] [L] [A]   │
│                                     │
│  -- 또는 HSB 모드일 때 --           │
│  [🔍] [HSB  ▾]  [H] [S] [B] [A]   │
│                                     │
│  -- 또는 CSS 모드일 때 --           │
│  [🔍] [CSS  ▾]  [rgb(255, 0, 0) ]  │
└─────────────────────────────────────┘
```

**성능 규칙 (기존 PropertyColor 패턴 유지)**:
- 드래그 중: 로컬 상태만 업데이트 (`onChange`)
- 드래그 종료: 스토어 저장 (`onChangeEnd`) → History 기록

### 3.5 FillLayerRow 상세

Pencil 프로퍼티 패널의 Fill 행 패턴.

```
┌──────────────────────────────────────────────┐
│ [☑] [■ 색상] [Color ▾] [#FF0000  ] [100%] [×] │
│ [☑] [◐ 그래디언트 바] [Linear ▾]   [80%]  [×] │
│ [☐] [🖼 썸네일] [Image ▾]          [50%]  [×] │
└──────────────────────────────────────────────┘
  ↑     ↑            ↑          ↑       ↑      ↑
  토글  미리보기   타입선택   값/hex  opacity  삭제
```

**드래그 순서 변경**: `@dnd-kit/sortable` 사용 (현재 미설치, Phase 1 착수 시 `pnpm add @dnd-kit/core @dnd-kit/sortable` 필요)

---

## 4. Phase 2: 그래디언트 에디터 — **완료**

### 4.1 GradientEditor 구조

```
GradientEditor
├── GradientTypeToggle (Linear | Radial | Angular)
├── GradientBar
│   ├── GradientPreview (배경 CSS 그래디언트 미리보기)
│   └── GradientStopHandle[] (드래그 가능한 스톱 포인트)
│       └── 클릭 → ColorPickerPanel (스톱 색상 편집)
├── GradientRotation (각도 입력, Linear/Angular만)
├── GradientCenter (X, Y 입력, Radial/Angular만)
└── GradientStopList
    ├── StopRow: [색상 swatch] [position % 입력] [삭제]
    └── [+ Add Stop] 버튼
```

### 4.2 그래디언트 바 인터랙션

```
       stop1        stop2            stop3
         ▼            ▼                ▼
┌──────[●]──────────[●]──────────────[●]──┐
│ ░░░░░░████████████████████████████████  │  ← CSS gradient 미리보기
└─────────────────────────────────────────┘
         ↕ 드래그로 position 조정
         ↕ 더블클릭으로 색상 편집
         ↕ 드래그 아웃으로 삭제
         ↕ 바 위 클릭으로 새 스톱 추가
```

**인터랙션 규칙**:
1. **스톱 드래그**: position 값 0.0~1.0 범위 내 이동
2. **스톱 추가**: 바의 빈 영역 클릭 → 해당 위치에 보간된 색상으로 추가
3. **스톱 삭제**: 스톱을 바 밖으로 드래그 아웃 (최소 2개 유지)
4. **스톱 색상 편집**: 스톱 클릭/더블클릭 → ColorPickerPanel 팝오버

### 4.3 캔버스 연동

기존 `apps/builder/src/builder/workspace/canvas/skia/types.ts`의 Fill 타입 → CanvasKit 셰이더 변환:

```typescript
// 기존 코드 활용 경로
FillItem (UI 모델) → FillStyle (Skia 모델) → CanvasKit.Shader
```

| FillItem 타입 | 변환 대상 | CanvasKit API |
|---------------|-----------|---------------|
| `ColorFillItem` | `ColorFill` | `CanvasKit.Color4f()` |
| `LinearGradientFillItem` | `LinearGradientFill` | `CanvasKit.Shader.MakeLinearGradient()` |
| `RadialGradientFillItem` | `RadialGradientFill` | `CanvasKit.Shader.MakeTwoPointConicalGradient()` |
| `AngularGradientFillItem` | `AngularGradientFill` | `CanvasKit.Shader.MakeSweepGradient()` |

### 4.4 구현된 변환 레이어

```typescript
// apps/builder/src/builder/panels/styles/utils/fillToSkia.ts (구현 완료)

// Color: hex8 → Skia Color4f
colorFillItemToSkia(item: ColorFillItem): ColorFill

// Linear: rotation → start/end 좌표, stops → Float32Array[] colors
linearGradientFillItemToSkia(item, width, height): LinearGradientFill

// Radial: center → [cx*w, cy*h], radius → endRadius
radialGradientFillItemToSkia(item, width, height): RadialGradientFill

// Angular: center → [cx*w, cy*h], stops → colors/positions
angularGradientFillItemToSkia(item, width, height): AngularGradientFill

// 통합 API
fillItemToFillStyle(item: FillItem, width?, height?): FillStyle | null
fillsToSkiaFillColor(fills: FillItem[]): Float32Array | null     // Color only
fillsToSkiaFillStyle(fills, width, height): FillStyle | null      // 모든 타입
```

### 4.5 CSS 그래디언트 출력

```typescript
// apps/builder/src/builder/panels/styles/utils/fillMigration.ts (구현 완료)

fillsToCssBackground(fills): { backgroundColor?: string; backgroundImage?: string }
// LinearGradient → linear-gradient(Xdeg, color1 pos1%, color2 pos2%)
// RadialGradient → radial-gradient(circle at X% Y%, ...)
// AngularGradient → conic-gradient(from Xdeg at X% Y%, ...)
```

---

## 5. Phase 3: EyeDropper + BlendMode — **완료** (ScrubInput 제외)

### 5.1 EyeDropper (구현 완료)

```typescript
// apps/builder/src/builder/panels/styles/components/EyeDropperButton.tsx (구현 완료)

// 브라우저 EyeDropper API 타입 선언
interface EyeDropperAPI { open(): Promise<{ sRGBHex: string }> }
declare global { interface Window { EyeDropper?: new () => EyeDropperAPI } }

// Feature detection: 미지원 브라우저에서 컴포넌트 자체를 렌더링하지 않음
const isSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

// sRGBHex "#RRGGBB" → "#RRGGBBFF"로 정규화 후 onColorPick 콜백
// ESC 취소 시 DOMException 무시 (catch 블록)
// picking 상태로 버튼 하이라이트 (data-picking 속성)
```

**브라우저 지원**: Chrome 95+, Edge 95+. Firefox/Safari 미지원.
**폴백**: 미지원 브라우저에서는 컴포넌트 전체가 `null` 반환 (버튼 숨김).
**통합 위치**: `ColorPickerPanel` 내부, 입력 모드 셀렉터 옆에 배치.

### 5.2 Scrub Input (드래그 숫자 조정) — 미구현

Pencil의 `iVt` 컴포넌트 패턴 채용.

```typescript
// apps/builder/src/builder/panels/styles/components/ScrubInput.tsx

interface ScrubInputProps {
  value: number;
  onCommit: (value: number) => void;
  step?: number;              // 기본 1
  stepMultiplier?: number;    // Shift 키 배수, 기본 10
  min?: number;
  max?: number;
  suffix?: string;            // "px", "%" 등
}
```

**인터랙션**:
1. `mousedown` → `requestPointerLock()` (커서 숨김)
2. `mousemove` → `movementX` 누적 → `step` 단위 계산
3. `Shift` 키 → `step × stepMultiplier` (정밀 모드)
4. `mouseup` → `exitPointerLock()` → `onCommit`
5. 커서: `cursor: ew-resize` (좌우 화살표)
6. 드래그 중 커스텀 ↔ 커서 아이콘 포탈 렌더

**적용 위치**: 모든 숫자 입력 (opacity, rotation, position, border width 등)

### 5.3 Blend Mode Selector (구현 완료)

```typescript
// apps/builder/src/builder/panels/styles/components/BlendModeSelector.tsx (구현 완료)

// 12종 BlendMode 드롭다운 (native <select> 기반)
// FillDetailPopover 하단에 배치 (divider 아래)
// 변경 시 onUpdateEnd({ blendMode: mode }) 호출

// Skia 렌더링 연동:
// BoxSprite에서 최상위 enabled fill의 blendMode를 추출하여
// element-level blendMode로 전달 (fill-level이 element CSS mixBlendMode보다 우선)
```

**통합 위치**: `FillDetailPopover` 하단, Color/Gradient 편집기 아래에 divider와 함께 배치.
**Skia 연동**: `BoxSprite.tsx`에서 `fills[]`의 마지막 enabled fill의 `blendMode`가 `'normal'`이 아니면 `skiaNodeData.blendMode`로 전달. 기존 `style.mixBlendMode` CSS 속성보다 우선.

---

## 6. Phase 4: 이미지 Fill + 메쉬 그래디언트 + 변수 바인딩 — 미착수

### 6.1 이미지 Fill

- 파일 드롭 / 파일 선택 → 이미지 업로드 → URL 저장
- 사이즈 모드: Stretch / Fill / Fit
- opacity 및 blendMode 독립 조절

### 6.2 메쉬 그래디언트

- N×M 그리드의 색상 포인트
- 각 포인트에 베지어 핸들 (left/right/top/bottom)
- 쌍삼차(Bicubic) 보간으로 CanvasKit `MakeVertices(TrianglesStrip)` 렌더
- 참고: 현재 `apps/builder/src/builder/workspace/canvas/skia/fills.ts`는 mesh를 2x2 근사(LinearGradient 블렌드)로 처리하므로, Phase 4에서 N×M 확장이 필요

### 6.3 변수 바인딩 UI

Fill 색상 입력 옆에 변수 참조 버튼:

```
[#FF0000] [📎] ← 클릭 → 변수 선택 팝오버
                  ├── --primary
                  ├── --secondary
                  ├── --background
                  └── ...
```

선택 시 값을 `"$--primary"` 형태로 저장, `properties.resolved`로 실시간 해석.

---

## 7. 마이그레이션 전략

### 7.1 하위 호환성

기존 `backgroundColor: "#FF0000"` (CSS string) → `fills` 배열로 자동 변환:

```typescript
function migrateBackgroundColor(element: Element): FillItem[] {
  const bg = element.props?.style?.backgroundColor;
  if (!bg) return [];

  return [{
    id: nanoid(),
    type: FillType.Color,
    color: normalizeToHex8(bg),  // "#FF0000" → "#FF0000FF"
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
  }];
}
```

### 7.2 점진적 전환 순서

```
Step 1:  ✅ fill.types.ts 타입 정의
Step 2:  ✅ useFillActions.ts (Jotai 대신 Zustand 직접 사용)
Step 3:  ✅ FillSection UI 기본 구조 (단색 레이어)
Step 4:  ✅ ColorPickerPanel (HSB + 5모드 전환)
Step 5:  ✅ 다중 Fill 레이어 (추가/삭제/토글/순서)
Step 6:  ✅ AppearanceSection → FillSection("Background") 교체
Step 7:  ✅ 기존 backgroundColor 마이그레이션 (fillMigration.ts)
Step 8:  ✅ GradientEditor (Linear/Radial/Angular) + Skia 연동
Step 9:  ✅ EyeDropper + BlendMode (ScrubInput 제외)
Step 10: ⬜ 이미지/메쉬/변수 바인딩 (Phase 4, 미착수)
```

### 7.3 실제 변경된 파일 (Phase 1~3)

| 파일 | 변경 내용 | Phase |
|------|-----------|-------|
| `apps/builder/src/types/builder/fill.types.ts` | 6종 FillItem + BlendMode + BorderConfig 타입 정의 | 1 |
| `apps/builder/src/builder/panels/styles/sections/FillSection.tsx / .css` | "Background" 섹션 (신규) | 1 |
| `apps/builder/src/builder/panels/styles/components/*.tsx / .css` | 13개 컴포넌트 (위 파일 목록 참조) | 1~3 |
| `apps/builder/src/builder/panels/styles/hooks/useFillActions.ts` | Fill CRUD 액션 | 1~2 |
| `apps/builder/src/builder/panels/styles/utils/fillToSkia.ts` | FillItem → Skia FillStyle 변환 | 1~2 |
| `apps/builder/src/builder/panels/styles/utils/fillMigration.ts` | backgroundColor ↔ fills + CSS gradient | 1~2 |
| `apps/builder/src/builder/panels/styles/utils/colorUtils.ts` | hex8/rgba/float32/css 변환 | 1~2 |
| `apps/builder/src/builder/workspace/canvas/sprites/BoxSprite.tsx` | fills → Skia 렌더링 + blendMode 연동 | 1~3 |
| `apps/builder/src/builder/stores/inspectorActions.ts` | fills → backgroundColor/backgroundImage 동기화 | 1~2 |
| `apps/builder/src/utils/featureFlags.ts` | `VITE_FEATURE_FILL_V2` 플래그 추가 | 1 |

---

## 8. 파이프라인 통합

기존 파이프라인 순서에 Fill 시스템 통합:

```
요소 변경 시:
1. Memory Update (즉시)
   ├── fills[] 배열 변경
   └── border 설정 변경
2. Index Rebuild (즉시)
3. History Record (즉시)
   └── fills/border 전체 스냅샷
4. Fill → Skia 변환 (즉시)
   ├── FillItem → FillStyle (apps/builder/src/builder/workspace/canvas/skia/types.ts)
   └── CanvasKit Shader 생성
5. Canvas Render (즉시, 60fps)
6. DB Persist (백그라운드)
7. Preview Sync (백그라운드)
```

---

## 9. 성능 고려사항

### 9.1 드래그 최적화 (기존 패턴 유지)

```
ColorArea 드래그 중:
  → 로컬 상태만 업데이트 (리렌더 최소화)
  → Skia Canvas 직접 업데이트 (Shader 교체만)
  → History 기록 안 함

ColorArea 드래그 종료:
  → 스토어 업데이트
  → History 기록
  → DB Persist
```

### 9.2 Zustand 선택적 구독

```typescript
// Zustand store에서 선택된 요소의 fills를 직접 읽기
const fills = useStore.getState().elementsMap.get(selectedElementId)?.fills ?? [];

// 특정 fill 인덱스만 필요한 경우
const targetFill = fills[index] ?? null;
```

### 9.3 Gradient 셰이더 캐싱 (미구현 — 성능 이슈 미발생으로 보류)

향후 성능 이슈 발생 시 적용할 패턴:

```typescript
// 동일한 stops/rotation이면 Shader 재생성 안 함
const shaderCache = new Map<string, CanvasKit.Shader>();

function getOrCreateGradientShader(fill: GradientFillItem): CanvasKit.Shader {
  const key = computeFillHash(fill);
  if (shaderCache.has(key)) return shaderCache.get(key)!;
  const shader = createShader(fill);
  shaderCache.set(key, shader);
  return shader;
}
```

### 9.4 성능 기준값

| 시나리오 | 측정 항목 | 기준값 | 도구 |
|---------|----------|--------|------|
| Fill 1개 렌더링 | Shader 생성 + Paint 적용 | < 0.5ms | `performance.now()` |
| Fill 5개 레이어 합성 | 전체 fills 순회 + Shader 체이닝 | < 3ms | `performance.now()` |
| ColorArea 드래그 | 드래그 중 FPS | 60fps 유지 | `requestAnimationFrame` FPS 카운터 |
| Fill 추가/삭제 | UI 반영 시간 | < 16ms (1 프레임) | React Profiler |
| 그래디언트 스톱 드래그 (Phase 2) | Shader 재생성 + 캔버스 갱신 | < 5ms | `performance.now()` |
| 마이그레이션 | `backgroundColor` → `fills[]` 변환 (요소 100개) | < 50ms | `performance.now()` |

---

## 10. 리스크 분석

### 10.1 기술 리스크

| ID | 리스크 | 영향 | 발생 확률 | 완화 방안 |
|----|--------|------|----------|----------|
| R1 | **다중 Fill 렌더링 성능** — Fill 레이어 5+ 시 CanvasKit Shader 체이닝/합성 비용 증가 | 중간 | 중간 | Fill 레이어 수 상한 설정 (기본 10개), 비활성(`enabled: false`) Fill은 렌더링 스킵 |
| R2 | **마이그레이션 데이터 무결성** — 기존 `backgroundColor` → `fills[]` 변환 시 edge case (CSS 변수, `inherit`, `transparent`, `rgba()` 등) | 높음 | 높음 | 정규화 함수 `normalizeToHex8()`에 대한 edge case 테스트 철저히 작성, 변환 실패 시 원본값 보존 |
| R3 | **드래그 순서 변경 + History** — reorder 시마다 fills 배열 전체 스냅샷 저장으로 History 메모리 증가 | 낮음 | 중간 | History entry에 diff 대신 전체 스냅샷 사용 (기존 패턴), 메모리 상한 도달 시 오래된 entry 제거 |
| R4 | **EyeDropper 브라우저 호환 (Phase 3)** — Firefox/Safari 미지원, 일부 보안 정책에서 차단 가능 | 낮음 | 확실 | `'EyeDropper' in window` 가드로 버튼 자체를 숨김, 미지원 시 대체 UX 불필요 (기능 자체 생략) |
| R5 | **Gradient Shader GPU 리소스 누수** — 스톱 드래그 중 매 프레임 Shader 재생성 시 이전 Shader `delete()` 누락 가능 | 높음 | 중간 | 9.3의 shaderCache 패턴 적용 + 캐시 교체 시 이전 Shader `delete()` 명시적 호출, `SkiaDisposable` 패턴 준수 |
| R6 | **전용 Feature Flag 미연결** — 기존 `apps/builder/src/utils/featureFlags.ts` 인프라는 있으나 `color-picker-v2` 플래그 연결/노출 정책 미정 | 중간 | 중간 | 아래 10.2 참조 |
| R7 | **`@dnd-kit/sortable` 신규 의존성** — 새 의존성 추가에 따른 번들 크기 증가 및 호환성 리스크 | 낮음 | 낮음 | `@dnd-kit/core` ~13KB gzip, Phase 1 착수 시 번들 분석 후 tree-shaking 확인 |

### 10.2 Feature Flag 구현 방안

현재 프로젝트에는 `apps/builder/src/utils/featureFlags.ts` 기반 플래그 인프라가 있으므로, 아래 방식 중 선택:

| 방안 | 장점 | 단점 |
|------|------|------|
| **A. 기존 인프라 확장 (권장)** (`VITE_FEATURE_FILL_V2=true`) | 현재 패턴(`VITE_USE_WEBGL_CANVAS`)과 동일, 구현/검증 비용 최소 | 런타임 사용자별 제어 불가 |
| **B. Zustand 슬라이스** (`useFeatureFlags()`) | 런타임 전환 가능, DevTools 연동 | DB/원격 제어 없음 |
| **C. Supabase Remote Config** | 사용자별/환경별 제어 | 구현 비용 높음, Phase 1에 과도함 |

> **권장**: Phase 1은 **방안 A (기존 인프라 확장)**로 시작, 추후 필요 시 B로 승격.

### 10.3 Phase 간 의존성 (실제 진행)

```
Phase 1 (Fill 모델 + 다중 UI)        ✅ 완료 (cc5ec34a)
    ↓
Phase 2 (그래디언트 에디터)            ✅ 완료 (2c0b2166, 3852a35d)
    ↓
Phase 3 (EyeDropper + BlendMode)      ✅ 완료 (2067f337, 2990b80e) — ScrubInput 제외
    ↓
Phase 4 (이미지/메쉬/변수)            ⬜ 미착수
```

### 10.4 완화된 리스크 (구현 후)

| 항목 | 설명 |
|------|------|
| ~~R1: 다중 Fill 렌더링 성능~~ | Phase 2 그래디언트 구현 후 60fps 유지 확인. 현재 마지막 enabled fill만 렌더링하므로 성능 이슈 없음 |
| ~~R2: 마이그레이션 데이터 무결성~~ | `fillMigration.ts`의 `normalizeToHex8()` + `fillsToCssBackground()` 양방향 변환 안정적 동작 |
| ~~R4: EyeDropper 브라우저 호환~~ | `'EyeDropper' in window` 가드로 미지원 브라우저에서 버튼 자체 숨김 구현 완료 |
| ~~R5: Gradient Shader GPU 리소스~~ | `applyFill()` + `nodeRenderers.ts`에서 Shader delete() 정상 처리 확인 |
| ~~R6: Feature Flag~~ | `VITE_FEATURE_FILL_V2` 환경변수 + `isFillV2Enabled()` 구현 완료 |
| ~~R7: @dnd-kit 의존성~~ | 드래그 순서 변경 미구현 → 의존성 추가 불필요 |
| Skia 변환 레이어 | `fillToSkia.ts`에서 Color + 3종 Gradient 변환 완성. `applyFill()`과 정상 연동 |
| 드래그 패턴 | onChange/onChangeEnd 패턴이 ColorArea, Hue, Alpha, GradientBar 스톱에서 모두 안정 동작 |
| fills 폴백 경로 | `fills ?? backgroundColor` 폴백 + Feature Flag로 안전한 점진 전환 |

---

## 11. 코드 자산 현황

> Phase 1~3 구현 과정에서 활용된 기존 자산과 신규 생성된 자산 목록.

### 11.1 기존 자산 (재사용됨)

| 자산 | 파일 경로 | 활용 상태 |
|------|----------|----------|
| **`applyFill()`** | `workspace/canvas/skia/fills.ts` | Phase 1~2에서 직접 활용 (Color/Gradient Shader 생성) |
| **BlendMode 매핑** | `workspace/canvas/skia/blendModes.ts` | Phase 3에서 활용 (fill-level blendMode → Skia) |
| **`inspectorActions`** | `stores/inspectorActions.ts` | Phase 1~2에서 `updateSelectedFills()` / `updateSelectedFillsPreview()` 추가 |
| **`historyManager`** | `stores/history.ts` | fills 변경 시 자동 History 기록 |
| **React Aria ColorPicker** | `react-aria-components` | ColorPickerPanel에서 parseColor/ColorArea/ColorSlider 활용 |
| **`ColorSwatch`** | `packages/shared/src/components/ColorSwatch.tsx` | FillLayerRow swatch 렌더링 |
| **`Popover`** | `packages/shared/src/components/Popover.tsx` | FillDetailPopover 컨테이너 |

### 11.2 신규 자산 (Phase 1~3에서 생성)

| 자산 | 파일 경로 | Phase 4에서 활용 가능 여부 |
|------|----------|--------------------------|
| **`fillToSkia.ts`** | `panels/styles/utils/fillToSkia.ts` | Image/Mesh 변환 함수 추가 시 확장 |
| **`fillMigration.ts`** | `panels/styles/utils/fillMigration.ts` | Image fill CSS 출력 추가 |
| **`colorUtils.ts`** | `panels/styles/utils/colorUtils.ts` | 범용 색상 유틸 (변경 불필요) |
| **`useFillActions.ts`** | `panels/styles/hooks/useFillActions.ts` | Image/Mesh fill CRUD 지원 (변경 불필요, createDefaultFill() 이미 지원) |
| **`ColorPickerPanel`** | `panels/styles/components/ColorPickerPanel.tsx` | 변경 불필요 |
| **`FillTypeSelector`** | `panels/styles/components/FillTypeSelector.tsx` | Image 탭 `disabled: false`로 활성화만 필요 |

---

## 12. 테스트 전략

| 범위 | 방법 | 파일 | 상태 |
|------|------|------|------|
| 타입 안전성 | `pnpm type-check` | `fill.types.ts` + 모든 컴포넌트 | **통과** (Phase 1~3 전체) |
| 색상 변환 | Unit Test | `colorUtils.test.ts` | 미작성 |
| Fill CRUD | Unit Test | `useFillActions.test.ts` | 미작성 |
| 마이그레이션 | Unit Test | `fillMigration.test.ts` | 미작성 |
| UI 렌더링 | Storybook | `FillSection.stories.tsx` | 미작성 |
| 드래그 인터랙션 | Storybook + E2E | `GradientBar.stories.tsx` | 미작성 |
| 성능 | Canvas FPS 모니터 | 기존 모니터링 패널 활용 | 수동 확인 |

### 12.1 수용 기준 (Acceptance Criteria)

- [x] 단색 요소를 선택했을 때, 기존 `backgroundColor`는 자동으로 `fills[0]`에 마이그레이션되어 UI에서 동일 색으로 표시된다.
- [x] Fill 레이어 **추가/삭제/토글**이 정상 동작하고 History에 기록된다.
- [x] ColorArea/Hue/Alpha 드래그 중 프레임 드랍 없이 미리보기가 갱신되고, drag end 시점에만 history entry가 생성된다.
- [x] Linear/Radial/Angular 스톱 편집 후 캔버스(Skia) 결과와 패널 미리보기가 시각적으로 일치한다.
- [x] EyeDropper 미지원 브라우저에서 버튼이 노출되지 않으며, 지원 브라우저에서 취소(ESC) 시 상태가 오염되지 않는다.
- [x] BlendMode 선택 시 Skia 캔버스에 즉시 반영된다.
- [x] Color ↔ Gradient 탭 전환 시 Popover 위치가 유지된다 (고정 너비 244px).
- [x] Fill 레이어 드래그 순서 변경 (`FillSection.tsx` — `@dnd-kit/sortable`)
- [x] ScrubInput으로 숫자 값 드래그 조정 (GradientControls, FillLayerRow, GradientStopList)

### 12.2 Feature Flag / 롤백 전략 (구현 완료)

- **방안 A (기존 인프라 확장)** 채택: `VITE_FEATURE_FILL_V2=true` 환경변수
- `isFillV2Enabled()` → `true`면 FillSection("Background") 표시, `false`면 기존 AppearanceSection
- 플래그 OFF 시 기존 `AppearanceSection` 단색 편집 경로 유지하여 즉시 롤백 가능
- DB: `fills ?? backgroundColor` 폴백 경로 유지
- BoxSprite: `isFillV2Enabled() && fills?.length > 0`일 때만 fills 경로 사용, 아니면 기존 backgroundColor 폴백

---

## 부록 A: Pencil 컬러 피커 소스 참조

Pencil의 컬러 피커는 `react-colorful` 라이브러리 기반:

```
react-colorful (HSB picker)
├── Saturation/Brightness 2D 영역
├── Hue 슬라이더 (16px)
├── Alpha 슬라이더 (16px)
└── 포인터: 14px, border-width: 3px
```

**색상 모드 전환** (`Select` 컴포넌트):
- `case 1`: RGBA (4칸 grid, 각 w-12 h-6)
- `case 2`: HEX (단일 w-20 h-6, font-mono)
- `case 3`: CSS (단일 w-42 h-6, font-mono)
- `case 4`: HSL (4칸 grid)
- `case 5`: HSB (4칸 grid)

**EyeDropper**: `window.EyeDropper` API 사용, title "Pick color from screen"

**Scrub Input**: `requestPointerLock()` + `movementX` 누적 + Shift 배수 + 커스텀 ↔ 커서 SVG 포탈

---

## 부록 B: 관련 ADR

- [ADR-001: State Management](adr/001-state-management.md) — Zustand 슬라이스 + Jotai atom
- [ADR-002: Styling Approach](adr/002-styling-approach.md) — CSS 파일 + data-* 패턴
- [ADR-003: Canvas Rendering](adr/003-canvas-rendering.md) — CanvasKit/Skia WASM
