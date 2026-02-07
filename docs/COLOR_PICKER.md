# Color Picker 상세 설계 문서

> **목표**: Pencil 앱 수준의 컬러 피커 및 Fill/Stroke 시스템 구축
> **현재 상태**: 단색 HSB 피커만 존재, 그래디언트/다중 레이어/EyeDropper 없음
> **참조**: `docs/PENCIL_APP_ANALYSIS.md`, `apps/builder/src/builder/workspace/canvas/skia/types.ts`

---

## 0. 문서 검토 요약 (2026-02)

기존 초안은 방향성이 명확하고, Pencil 기능을 단계별로 잘 쪼갠 점이 강점이다. 다만 현재 저장소 구조/상태관리 패턴과 일부 경로·명령어가 어긋난 부분이 있어 아래를 반영해 보완했다.

### 0.1 보완한 핵심 항목

1. **경로 정합성 보정**
   - `atoms/fillAtoms.ts` 같은 상대 경로 표기를 실제 코드베이스 기준(`apps/builder/src/builder/panels/styles/atoms/fillAtoms.ts`)으로 명확화.
2. **상태관리 흐름 정렬**
   - `useSceneManager()` 기반 예시는 현재 Builder의 Zustand + Jotai 브릿지 흐름과 어긋나므로, `selectedElementAtom`/`appearanceValuesAtom` 패턴과 히스토리 액션 호출 기반으로 정리.
3. **명령어 표준화**
   - 루트 스크립트 기준 `pnpm type-check`로 수정.
4. **릴리즈 안전장치 추가**
   - Feature Flag/마이그레이션 게이트/롤백 체크리스트를 명시해 점진 배포 가능하도록 보강.

### 0.2 유지한 설계 원칙

- Fill/Stroke를 단일 문자열에서 **레이어 모델**로 승격
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
    └── PixiColorSwatchPicker.tsx  ← WebGL 팔레트
```

### 1.2 기존 타입 (이미 정의됨, UI 미연결)

`apps/builder/src/builder/workspace/canvas/skia/types.ts`:

```typescript
// 이미 6종 Fill 타입이 정의되어 있음
type FillStyle =
  | ColorFill            // { type: 'color', rgba: [r,g,b,a] }
  | LinearGradientFill   // { type: 'linear-gradient', start, end, colors, positions }
  | RadialGradientFill   // { type: 'radial-gradient', center, radius, colors, positions }
  | AngularGradientFill  // { type: 'angular-gradient', cx, cy, colors, positions }
  | ImageFill            // { type: 'image', image, tileMode, sampling }
  | MeshGradientFill     // { type: 'mesh-gradient', rows, columns, colors }
```

### 1.3 현재 한계

| 기능 | 현재 | Pencil |
|------|------|--------|
| Fill 타입 | 단색 1개 | 6종 (Color, Image, 3×Gradient, Mesh) |
| Fill 레이어 | 1개 | 다중 (배열, 순서 변경, on/off) |
| Stroke 레이어 | 1개 | 다중 (배열, 개별 너비) |
| 색상 입력 모드 | Hex only | RGBA / HEX / CSS / HSL / HSB 전환 |
| EyeDropper | 없음 | 화면 색상 추출 |
| Scrub Input | 없음 | 드래그로 숫자 값 조정 |
| Fill별 Blend Mode | 없음 | 18+종 |
| Fill별 Opacity | 없음 | 독립 조절 |
| 그래디언트 에디터 | 없음 | 스톱 추가/삭제/드래그, 회전, 중심점 |
| 변수 바인딩 UI | 없음 | `$--변수명` 선택 드롭다운 |

---

## 2. 목표 상태 (TO-BE)

### 2.1 Phase 구분

| Phase | 범위 | 우선순위 |
|-------|------|----------|
| **Phase 1** | Fill 데이터 모델 + 다중 Fill UI + 색상 모드 전환 | P0 |
| **Phase 2** | 그래디언트 에디터 (Linear/Radial/Angular) | P0 |
| **Phase 3** | EyeDropper + Scrub Input + Fill 토글/블렌드 | P1 |
| **Phase 4** | 이미지 Fill + 메쉬 그래디언트 + 변수 바인딩 | P2 |

---

## 3. Phase 1: Fill 데이터 모델 + 다중 Fill UI

### 3.1 데이터 모델

#### 3.1.1 Fill 아이템 타입

```typescript
// apps/builder/src/types/builder/fill.types.ts (신규)

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

#### 3.1.2 Stroke 아이템 타입

```typescript
/** Stroke 정렬 */
export enum StrokeAlignment {
  Inside = 'inside',
  Center = 'center',
  Outside = 'outside',
}

/** Stroke 설정 */
export interface StrokeConfig {
  fills: FillItem[];                    // 다중 스트로크 색상
  width: StrokeWidth;                   // 통합 또는 개별 너비
  alignment: StrokeAlignment;
  lineJoin: 'miter' | 'bevel' | 'round';
  lineCap: 'butt' | 'round' | 'square';
  dashArray?: number[];                 // 점선 패턴
}

/** 스트로크 너비 (통합/개별) */
export type StrokeWidth =
  | number                              // 통합 (모든 변)
  | { top: number; right: number; bottom: number; left: number };  // 개별
```

#### 3.1.3 Element 확장

```typescript
// unified.types.ts Element에 추가할 속성
export interface Element {
  // ... 기존 속성 ...

  /** 다중 Fill 레이어 (Phase 1) */
  fills?: FillItem[];

  /** Stroke 설정 (Phase 1) */
  stroke?: StrokeConfig;
}
```

### 3.2 스토어 연동

#### 3.2.1 Jotai Atom 추가

```typescript
// apps/builder/src/builder/panels/styles/atoms/fillAtoms.ts (신규)

import { atom } from 'jotai';
import type { FillItem, StrokeConfig, ColorInputMode } from '@/types/builder/fill.types';

/** 선택된 요소의 fills 배열 */
export const fillsAtom = atom<FillItem[] | null>(null);

/** 선택된 요소의 stroke 설정 */
export const strokeAtom = atom<StrokeConfig | null>(null);

/** 현재 편집 중인 fill 인덱스 */
export const activeFillIndexAtom = atom<number | null>(null);

/** 현재 편집 중인 fill 아이템 (파생) */
export const activeFillAtom = atom((get) => {
  const fills = get(fillsAtom);
  const index = get(activeFillIndexAtom);
  if (!fills || index === null) return null;
  return fills[index] ?? null;
});

/** 색상 입력 모드 (로컬 유지) */
export const colorInputModeAtom = atom<ColorInputMode>('hex');
```

#### 3.2.2 Fill 액션

```typescript
// apps/builder/src/builder/panels/styles/hooks/useFillActions.ts (신규)

// 주의: 실제 구현은 builder의 Zustand 액션 + Jotai 브릿지 패턴에 맞춘다.
// (sceneManager 직접 의존 대신 element update/history 액션을 경유)

export function useFillActions() {
  const { updateElement, pushHistory } = useBuilderActions();

  /** Fill 추가 */
  const addFill = (type: FillType = FillType.Color) => {
    const newFill = createDefaultFill(type);
    // History 기록 → fills 배열에 push → 인덱스 재구축 → DB Persist
  };

  /** Fill 삭제 */
  const removeFill = (index: number) => { /* ... */ };

  /** Fill 순서 변경 (드래그) */
  const reorderFill = (fromIndex: number, toIndex: number) => { /* ... */ };

  /** Fill 토글 (enabled) */
  const toggleFill = (index: number) => { /* ... */ };

  /** Fill 속성 업데이트 */
  const updateFill = (index: number, patch: Partial<FillItem>) => { /* ... */ };

  /** Stroke Fill 추가 */
  const addStrokeFill = () => { /* ... */ };

  return { addFill, removeFill, reorderFill, toggleFill, updateFill, addStrokeFill };
}
```

### 3.3 Fill 섹션 UI

#### 3.3.1 컴포넌트 트리

```
FillSection (신규)
├── SectionHeader ("Fill" 타이틀 + [+] 추가 버튼)
├── FillLayerList
│   ├── FillLayerRow (각 레이어)
│   │   ├── FillToggle (enabled 체크박스)
│   │   ├── FillPreview (축소 미리보기 사각형)
│   │   ├── FillTypeIcon (Color/Gradient/Image 아이콘)
│   │   ├── FillColorInput (인라인 hex 값 또는 그래디언트 미리보기)
│   │   ├── FillOpacityInput (% 값)
│   │   └── FillDeleteButton (× 삭제)
│   └── ... (드래그로 순서 변경)
└── (클릭 시) FillDetailPopover
    ├── FillTypeSelector (Color | Linear | Radial | Angular | Image)
    ├── ColorPickerPanel (단색일 때)
    │   ├── ColorArea (HSB 2D)
    │   ├── HueSlider
    │   ├── AlphaSlider
    │   ├── ColorInputModeSelector (RGBA | HEX | CSS | HSL | HSB)
    │   ├── ColorInputFields (모드별 동적 렌더)
    │   └── EyeDropperButton (Phase 3)
    ├── GradientEditor (그래디언트일 때, Phase 2)
    └── BlendModeSelector (Phase 3)

StrokeSection (기존 확장)
├── SectionHeader ("Stroke" 타이틀 + [+] 추가 버튼)
├── StrokeFillLayerList (Fill과 동일한 레이어 구조)
├── StrokeAlignmentSelector (Inside | Center | Outside)
├── StrokeWidthInput (통합 또는 개별 토글)
│   └── IndividualWidthInputs (Top/Right/Bottom/Left, 토글 시 표시)
├── LineJoinSelector (Miter | Bevel | Round)
└── LineCapSelector (Butt | Round | Square)
```

#### 3.3.2 파일 구조

```
apps/builder/src/builder/panels/styles/sections/
├── FillSection.tsx              ← 메인 Fill 섹션
├── FillSection.css              ← 스타일
├── StrokeSection.tsx            ← 메인 Stroke 섹션 (기존 확장)
└── StrokeSection.css

apps/builder/src/builder/panels/styles/components/
├── FillLayerRow.tsx             ← 개별 Fill 레이어 행
├── FillDetailPopover.tsx        ← Fill 상세 편집 팝오버
├── FillTypeSelector.tsx         ← Fill 타입 선택 (아이콘 버튼 그룹)
├── ColorPickerPanel.tsx         ← 확장된 컬러 피커 패널
├── ColorInputModeSelector.tsx   ← RGBA/HEX/CSS/HSL/HSB 전환
├── ColorInputFields.tsx         ← 모드별 입력 필드 렌더
├── GradientEditor.tsx           ← 그래디언트 편집기 (Phase 2)
├── GradientBar.tsx              ← 그래디언트 바 (스톱 표시)
├── GradientStopHandle.tsx       ← 드래그 가능한 스톱 핸들
├── BlendModeSelector.tsx        ← 블렌드 모드 드롭다운 (Phase 3)
├── EyeDropperButton.tsx         ← 화면 색상 추출 (Phase 3)
├── ScrubInput.tsx               ← 드래그 숫자 입력 (Phase 3)
└── StrokeWidthControl.tsx       ← 스트로크 너비 (통합/개별)
```

### 3.4 ColorPickerPanel 상세

기존 `PropertyColor`를 대체하는 핵심 컴포넌트.

```typescript
// components/ColorPickerPanel.tsx

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

**드래그 순서 변경**: `@dnd-kit/sortable` 사용 (이미 프로젝트 의존성에 있을 것)

---

## 4. Phase 2: 그래디언트 에디터

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

기존 `skia/types.ts`의 Fill 타입 → CanvasKit 셰이더 변환:

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

---

## 5. Phase 3: EyeDropper + Scrub Input + Blend Mode

### 5.1 EyeDropper

```typescript
// components/EyeDropperButton.tsx

async function pickColorFromScreen(): Promise<string | null> {
  if (!('EyeDropper' in window)) {
    console.warn('EyeDropper API not supported');
    return null;
  }

  try {
    const eyeDropper = new (window as any).EyeDropper();
    const result = await eyeDropper.open();
    return result.sRGBHex; // "#RRGGBB"
  } catch (e) {
    // 사용자가 ESC로 취소한 경우
    return null;
  }
}
```

**브라우저 지원**: Chrome 95+, Edge 95+. Firefox/Safari 미지원.
**폴백**: 미지원 브라우저에서는 버튼 숨김 (`'EyeDropper' in window` 체크).

### 5.2 Scrub Input (드래그 숫자 조정)

Pencil의 `iVt` 컴포넌트 패턴 채용.

```typescript
// components/ScrubInput.tsx

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

**적용 위치**: 모든 숫자 입력 (opacity, rotation, position, stroke width 등)

### 5.3 Blend Mode Selector

```typescript
// components/BlendModeSelector.tsx

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];
```

---

## 6. Phase 4: 이미지 Fill + 메쉬 그래디언트 + 변수 바인딩

### 6.1 이미지 Fill

- 파일 드롭 / 파일 선택 → 이미지 업로드 → URL 저장
- 사이즈 모드: Stretch / Fill / Fit
- opacity 및 blendMode 독립 조절

### 6.2 메쉬 그래디언트

- N×M 그리드의 색상 포인트
- 각 포인트에 베지어 핸들 (left/right/top/bottom)
- 쌍삼차(Bicubic) 보간으로 CanvasKit `MakeVertices(TrianglesStrip)` 렌더

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
Step 1: fill.types.ts 타입 정의
Step 2: fillAtoms.ts Jotai atom 추가
Step 3: FillSection UI 기본 구조 (단색 레이어만)
Step 4: ColorPickerPanel (색상 모드 전환)
Step 5: 다중 Fill 레이어 (추가/삭제/순서/토글)
Step 6: AppearanceSection → FillSection 교체
Step 7: 기존 backgroundColor 마이그레이션
Step 8: GradientEditor (Phase 2)
Step 9: EyeDropper + ScrubInput (Phase 3)
Step 10: 이미지/메쉬/변수 바인딩 (Phase 4)
```

### 7.3 기존 코드 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `unified.types.ts` | `Element`에 `fills?`, `stroke?` 추가 |
| `AppearanceSection.tsx` | FillSection으로 점진적 교체 |
| `styleAtoms.ts` | `fillsAtom`, `strokeAtom` 추가 |
| `useAppearanceValuesJotai.ts` | fills/stroke 구독 추가 |
| `PropertyColor.tsx` | ColorPickerPanel로 대체 (내부 사용은 유지) |
| `skia/types.ts` | 기존 FillStyle 타입 유지 (변환 레이어 추가) |
| `elementCreation.ts` | 새 요소 생성 시 기본 fills 배열 설정 |
| `elementUpdate.ts` | fills/stroke 업데이트 액션 추가 |

---

## 8. 파이프라인 통합

기존 파이프라인 순서에 Fill 시스템 통합:

```
요소 변경 시:
1. Memory Update (즉시)
   ├── fills[] 배열 변경
   └── stroke 설정 변경
2. Index Rebuild (즉시)
3. History Record (즉시)
   └── fills/stroke 전체 스냅샷
4. Fill → Skia 변환 (즉시)
   ├── FillItem → FillStyle (skia/types.ts)
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

### 9.2 Jotai selectAtom 활용

```typescript
// fills 배열에서 특정 인덱스만 구독
const fillAtIndex = selectAtom(
  fillsAtom,
  (fills) => fills?.[index] ?? null,
  (a, b) => JSON.stringify(a) === JSON.stringify(b)
);
```

### 9.3 Gradient 셰이더 캐싱

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

---

## 10. 테스트 전략

| 범위 | 방법 | 파일 |
|------|------|------|
| 타입 안전성 | `pnpm type-check` | `fill.types.ts` |
| 색상 변환 | Unit Test | `colorUtils.test.ts` |
| Fill CRUD | Unit Test | `useFillActions.test.ts` |
| 마이그레이션 | Unit Test | `fillMigration.test.ts` |
| UI 렌더링 | Storybook | `FillSection.stories.tsx` |
| 드래그 인터랙션 | Storybook + E2E | `GradientBar.stories.tsx` |
| 성능 | Canvas FPS 모니터 | 기존 모니터링 패널 활용 |

### 10.1 수용 기준 (Acceptance Criteria)

- 단색 요소를 선택했을 때, 기존 `backgroundColor`는 자동으로 `fills[0]`에 마이그레이션되어 UI에서 동일 색으로 표시된다.
- Fill 레이어 3개 이상에서 **추가/삭제/순서변경/토글**이 undo/redo에 정확히 반영된다.
- ColorArea/Hue/Alpha 드래그 중 프레임 드랍 없이 미리보기가 갱신되고, drag end 시점에만 history entry가 생성된다.
- Linear/Radial/Angular 스톱 편집 후 캔버스(스키아) 결과와 패널 미리보기가 시각적으로 일치한다.
- EyeDropper 미지원 브라우저에서 버튼이 노출되지 않으며, 지원 브라우저에서 취소(ESC) 시 상태가 오염되지 않는다.

### 10.2 Feature Flag / 롤백 전략

- `fills/stroke` 편집 UI는 초기에는 `color-picker-v2` 플래그 하에서만 노출한다.
- 플래그 OFF 시 기존 `AppearanceSection` 단색 편집 경로를 유지해 즉시 롤백 가능해야 한다.
- DB에는 신규 필드를 쓰더라도, 읽기 경로는 `fills ?? backgroundColor` 폴백을 한 릴리즈 이상 유지한다.

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
