# LayoutEngine → @pixi/layout 마이그레이션 계획

## 개요

**목표**: 커스텀 yoga-layout 기반 LayoutEngine을 @pixi/layout의 선언적 flexbox로 완전 대체

**현재 상태**:
- `LayoutEngine.ts`: 약 1,800줄의 복잡한 수동 레이아웃 엔진 (현재 기준)
- yoga-layout 직접 import하여 노드 생성/계산
- 수동 intrinsic size 측정 (measureTextSize, measureCheckboxSize 등)
- 수동 위치 계산 (calculateTabsChildPositions 등)

**목표 상태**:
- @pixi/layout의 선언적 `layout={{ }}` 프로퍼티 사용
- 자동 intrinsic size (Text 등)
- LayoutEngine.ts 완전 삭제

---

## 영향 범위 분석

### apps/builder (직접 영향)
| 경로 | 영향도 | 설명 |
|------|--------|------|
| `workspace/canvas/layout/LayoutEngine.ts` | 삭제 | 약 1,800줄 전체 제거 (현재 기준) |
| `workspace/canvas/ui/Pixi*.tsx` | 높음 | 63개 컴포넌트 레이아웃 코드 단순화 |
| `workspace/canvas/BuilderCanvas.tsx` | 높음 | calculateLayout() 호출 제거 |
| `workspace/canvas/sprites/ElementSprite.tsx` | 높음 | layoutPosition prop 제거 |
| `workspace/canvas/utils/cssVariableReader.ts` | 중간 | preset 함수 일부 제거 |

### packages/shared (간접 영향)
| 경로 | 영향도 | 설명 |
|------|--------|------|
| `src/components/*.tsx` | 없음 | React Aria DOM 컴포넌트, LayoutEngine 미사용 |
| `src/components/styles/*.css` | 없음 | CSS 변수 정의만, 마이그레이션 무관 |

### cssVariableReader.ts 역할 분석

**이 파일은 유지됨** - LayoutEngine과는 별개의 역할

| 함수 유형 | 예시 | 마이그레이션 후 |
|----------|------|----------------|
| Color Preset | `getM3ButtonColors()`, `getVariantColors()` | **유지** - 색상 렌더링 필수 |
| Size Preset | `getSizePreset()`, `getCardSizePreset()` | **유지** - @pixi/layout에 값 전달 |
| Label/Desc Style | `getLabelStylePreset()` | **유지** - 폰트 스타일 필수 |

**변경점:**
- Before: LayoutEngine이 preset 값 → Yoga 노드에 수동 적용
- After: preset 값 → `layout={{ padding: preset.padding }}` 직접 전달

```tsx
// Before (LayoutEngine 내부)
const preset = getCardSizePreset(size);
node.setPadding(Edge.All, preset.padding);  // 수동

// After (@pixi/layout)
const preset = getCardSizePreset(size);
<Container layout={{ padding: preset.padding }}>  // 선언적
```

---

## 현재 진행 상황

- Phase 1: 완료 (`import "@pixi/layout"` 추가, LayoutEngine setYoga 제거)
- Phase 2: 완료 (Panel/Card layout 적용, panel-title padding 반영, card children offset 수정)
- Phase 3: 진행 중 (Button/Badge 텍스트 측정은 localBounds로 교체, LayoutText 전환은 미완)
- Phase 4: 진행 중 (CheckboxGroup/Radio/Input 내부 레이아웃 전환, item hit area는 기존 방식 유지)
- Phase 5: 진행 중 (Tabs에서 TabList/Panel layout 적용, 텍스트 측정/엔진 제거는 미완)
- Phase 6: 착수 (ElementsLayer를 계층 렌더링 + 로컬 오프셋 적용, LayoutEngine 유지)
- Phase 7: 대기

## Phase 1: 인프라 설정 및 @pixi/layout 초기화

### 목표
@pixi/layout을 프로젝트 전역에서 사용 가능하도록 초기화하고, 기존 시스템과 병렬 동작 확인

### 주요 작업
1. `@pixi/layout` import를 앱 진입점에 추가
   - `apps/builder/src/main.tsx` 또는 `BuilderCanvas.tsx` 상단에 `import '@pixi/layout'`
   - LayoutSystem + mixin 등록 → PixiJS DisplayObject에 `.layout` 프로퍼티 추가
2. Yoga 초기화 로직 수정
   - `LayoutEngine`는 레거시 계산용으로만 `loadYoga()` 사용
   - `setYoga()` 직접 호출 제거 (Yoga 로딩은 @pixi/layout 시스템에 위임)
3. 테스트용 간단한 LayoutContainer/LayoutText에 layout 적용하여 동작 확인
   - `LayoutContainer`/`LayoutText`로 JSX 레이아웃 동작 검증

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts`

### 검증 방법
- 앱 실행 후 콘솔 에러 없음 확인
- 기존 레이아웃이 정상 동작하는지 확인 (회귀 없음)
- `LayoutContainer`에 `layout={{ width: 100, height: 50 }}` 적용 후 렌더링 확인
- `LayoutText`의 intrinsic size가 레이아웃에 반영되는지 확인

### 위험/주의점
- @pixi/layout과 기존 LayoutEngine이 동시에 Yoga를 사용할 때 충돌 가능성
- setYoga() 호출 순서 중요

### Phase 1 체크리스트 (초기화/검증)
- `@pixi/layout` import가 PixiJS Application 생성 전에 실행되는지 확인
- `PIXI_COMPONENTS`에 `LayoutContainer`/`LayoutText` 등록 여부 확인
- `LayoutContainer`에 `layout` 적용 시 자식 위치/크기가 자동 갱신되는지 확인
- `LayoutText` 텍스트 길이 변경 시 intrinsic size 반영 여부 확인
- LayoutEngine 경로와 @pixi/layout 경로가 동시에 좌표를 덮어쓰지 않는지 확인
- Yoga 로딩 관련 콘솔 에러/경고 없음 확인
- **진행 현황:** 완료

---

## Phase 2: 기본 컨테이너 컴포넌트 마이그레이션 (Box, Panel, Card)

### 목표
단순한 컨테이너 컴포넌트들을 @pixi/layout 선언적 스타일로 전환

### 주요 작업
1. **PixiPanel.tsx** 마이그레이션
   - 수동 크기 계산 → `layout={{ display: 'flex', flexDirection: 'column', padding: ... }}`
   - title + content 영역 자동 배치
   - `pixiContainer` → `LayoutContainer` 전환

2. **PixiCard.tsx** 마이그레이션
   - content-based height 계산 제거
   - `layout={{ padding, gap }}` 로 대체
   - `pixiContainer` → `LayoutContainer` 전환

3. **BoxSprite.tsx** 확인
   - 기본 Box 요소가 layout 프로퍼티 지원하는지 확인

4. LayoutEngine에서 Panel/Card 관련 측정 코드 주석 처리
   - `getPanelSizePreset()`, `getCardSizePreset()` 호출 부분

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/ui/PixiPanel.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiCard.tsx`
- `apps/builder/src/builder/workspace/canvas/sprites/BoxSprite.tsx`
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts`

### 검증 방법
- Panel 컴포넌트: title + content 영역이 올바르게 배치되는지 확인
- Card 컴포넌트: 내용에 따라 높이가 자동 조절되는지 확인
- 기존 앱에서 Panel/Card가 포함된 페이지 스크린샷 비교

### 위험/주의점
- padding, gap 값이 기존과 동일해야 함
- 기존 CSS 변수 preset과 @pixi/layout 스타일 값 매핑 필요
- **진행 현황:** 완료 (Panel title padding 반영, Card children offset 보정 포함)

---

## Phase 3: 텍스트 기반 컴포넌트 마이그레이션 (Button, Text, Label)

### 목표
@pixi/layout의 자동 Text intrinsic size를 활용하여 수동 텍스트 측정 코드 제거

### 주요 작업
1. **PixiButton.tsx** 마이그레이션
   - `CanvasTextMetrics.measureText()` 호출 제거
   - `layout={{ padding: [paddingY, paddingX], minWidth, minHeight }}` 적용
   - Text 자식이 자동으로 intrinsic size 제공
   - 텍스트 렌더는 `LayoutText` 사용

2. **TextSprite.tsx** 확인/수정
   - @pixi/layout Text 자동 크기 지원 활용
   - `pixiText` → `LayoutText` 전환 고려

3. **PixiLabel.tsx**, **PixiBadge.tsx** 마이그레이션
   - 텍스트 기반 크기 계산 → 자동 intrinsic size
   - `LayoutText` 사용

4. LayoutEngine에서 `measureTextSize()` 함수 및 관련 호출 제거

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiLabel.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiBadge.tsx`
- `apps/builder/src/builder/workspace/canvas/sprites/TextSprite.tsx`
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts`

### 검증 방법
- 다양한 텍스트 길이의 Button 렌더링 확인
- Button size variants (xs, sm, md, lg, xl) 각각 테스트
- 기존 버튼과 픽셀 단위 비교

### 위험/주의점
- @pixi/layout의 Text intrinsic size 계산이 CanvasTextMetrics와 동일한지 확인 필요
- 폰트 로딩 타이밍 이슈 가능
- **진행 현황:** 진행 중 (PixiButton/PixiBadge의 CanvasTextMetrics 제거 완료, LayoutText 전환 미완)

---

## Phase 4: 복합 폼 컴포넌트 마이그레이션 (Checkbox, Radio, Input)

### 목표
CheckboxGroup, RadioGroup, TextField 등 복잡한 폼 컴포넌트를 선언적 레이아웃으로 전환

### 주요 작업
1. **PixiCheckboxGroup.tsx** 마이그레이션
   - `measureCheckboxGroupSize()` 제거
   - `layout={{ display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: 12 }}` 적용
   - 자식 Checkbox 아이템들 자동 배치

2. **PixiRadioGroup.tsx** (또는 관련 컴포넌트) 마이그레이션
   - `measureRadioSize()` 제거
   - 동일한 flexbox 패턴 적용

3. **PixiCheckboxItem.tsx**, **PixiRadioItem.tsx** 수정
   - 개별 아이템 레이아웃: `layout={{ display: 'flex', alignItems: 'center', gap: 8 }}`

4. **PixiInput.tsx** (TextField) 마이그레이션
   - label + input + description 수직 배치
   - `measureTextFieldSize()` 제거
   - 레이아웃 루트는 `LayoutContainer` 사용

5. LayoutEngine에서 관련 함수들 제거:
   - `measureCheckboxSize()`, `measureCheckboxGroupSize()`
   - `measureRadioSize()`, `measureRadioItemSize()`
   - `measureTextFieldSize()`
   - `calculateRadioItemPositions()`, `calculateCheckboxItemPositions()`

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/ui/PixiCheckboxGroup.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiCheckboxItem.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiRadioItem.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiInput.tsx`
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts`

### 검증 방법
- CheckboxGroup: horizontal/vertical orientation 모두 테스트
- RadioGroup: 옵션 개수 변경 시 크기 자동 조절 확인
- TextField: label, description 유무에 따른 레이아웃 확인
- 각 컴포넌트의 hit area가 정확한지 클릭 테스트

### 위험/주의점
- LayoutEngine의 `calculateRadioItemPositions()` 등이 자식 요소 절대 위치를 계산했음
- @pixi/layout으로 전환 시 부모-자식 좌표계 변경 가능
- Selection/hit area 계산에 영향 줄 수 있음
- **진행 현황:** 진행 중 (CheckboxGroup/Radio/Input 내부 layout 적용, CheckboxItem/RadioItem hit area는 기존 방식 유지)

---

## Phase 5: Tabs 컴포넌트 마이그레이션 (가장 복잡)

### 목표
가장 복잡한 Tabs 컴포넌트를 @pixi/layout으로 전환하고 `calculateTabsChildPositions()` 제거

### 주요 작업
1. **PixiTabs.tsx** 구조 재설계
   ```
   Container (layout: flex, direction based on orientation)
   ├── TabList (layout: flex, gap)
   │   ├── Tab1 (자동 intrinsic width from text)
   │   ├── Tab2
   │   └── Tab3
   └── TabPanel Container (layout: flex, flex: 1)
       └── Active Panel Content
   ```

2. Tab 너비 계산 제거
   - 기존: `CanvasTextMetrics.measureText()` → 누적 위치 계산
   - 신규: 각 Tab에 `layout={{ padding }}`, Text가 자동 크기 결정

3. Panel 위치 계산 제거
   - 기존: TabList 크기 기준 수동 offset 계산
   - 신규: flexbox가 자동으로 남은 공간에 Panel 배치

4. `containerWidth` prop 패턴 제거
   - @pixi/layout의 `flex: 1` 또는 `width: '100%'`로 대체

5. LayoutEngine에서 제거:
   - `calculateTabsChildPositions()`
   - `applyOffsetToDescendants()`
   - Tabs 관련 minHeight 계산 로직

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/ui/PixiTabs.tsx`
- `apps/builder/src/builder/workspace/canvas/ui/PixiTabPanel.tsx` (있다면)
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts`

### 검증 방법
- Horizontal tabs: 탭 클릭 시 Panel 전환 확인
- Vertical tabs: TabList가 왼쪽, Panel이 오른쪽에 배치
- 탭 개수 변경 시 TabList 크기 자동 조절
- Panel 내 콘텐츠가 올바르게 배치되는지 확인
- 활성 Panel 변경 시 Tabs 전체 높이 변경 확인

### 위험/주의점
- Tabs는 LayoutEngine에서 가장 복잡한 특수 처리를 받음
- `applyOffsetToDescendants()`가 자손 요소들의 SelectionBox 위치에 영향
- Panel 전환 애니메이션이 있다면 레이아웃 전환 시 깨질 수 있음
- **진행 현황:** 진행 중 (TabList/Panel layout 적용 완료, 텍스트 측정/엔진 제거는 미완)

---

## Phase 6: BuilderCanvas 및 ElementSprite 통합

### 목표
LayoutEngine.calculateLayout() 호출을 제거하고 @pixi/layout이 자동으로 레이아웃 계산하도록 전환

### 주요 작업
1. **BuilderCanvas.tsx** 수정
   - `calculateLayout()` 호출 제거
   - `layoutResult` 상태 제거
   - Body Container에 `layout={{ display: 'flex', ... }}` 적용

2. **ElementSprite.tsx** 수정
   - `layoutPosition` prop 제거
   - 각 Sprite가 부모 Container의 layout에 따라 자동 배치
   - `position` 대신 layout 프로퍼티 사용

3. **ElementsLayer** 구조 변경
   - 기존: 각 요소에 절대 좌표(x, y) 전달
   - 신규: 부모 Container의 layout이 자식 배치 결정

4. Selection/Hit area 계산 수정
   - `layoutResult.positions.get(id)` 대신 DisplayObject의 실제 bounds 사용
   - `element.getBounds()` 또는 `element.position` 활용
   - 뷰포트 스케일/패닝 반영을 위해 월드 좌표 변환 기준 확정 필요

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
- `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`
- `apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx`
- `apps/builder/src/builder/workspace/canvas/selection/useDragInteraction.ts`
- `apps/builder/src/builder/workspace/canvas/hooks/useViewportCulling.ts`

### 검증 방법
- 전체 페이지 렌더링이 기존과 동일한지 확인
- 요소 선택 시 SelectionBox가 올바른 위치에 표시
- 드래그 앤 드롭이 정상 동작
- Viewport culling이 올바르게 작동

### 위험/주의점
- **가장 위험한 Phase** - 핵심 렌더링 파이프라인 변경
- layoutPosition 의존 코드가 많음 (라쏘 선택, 드래그, 리사이즈 등)
- 점진적 전환 권장: 일부 요소만 먼저 테스트
- **진행 현황:** 착수 (ElementsLayer 계층 렌더링 + 로컬 오프셋 적용 완료, LayoutEngine 유지)

---

## Phase 7: 정리 및 LayoutEngine 삭제

### 목표
모든 마이그레이션 완료 후 레거시 코드 완전 제거

### 주요 작업
1. **LayoutEngine.ts 삭제**
   - 파일 전체 삭제 (약 1,800줄, 현재 기준)

2. **layout/index.ts** 정리
   - LayoutEngine 관련 export 제거
   - GridLayout 관련 코드는 유지 (별도 검토 필요)

3. **yoga-layout 직접 import 제거**
   - LayoutEngine 삭제 후 `yoga-layout/load` 직접 import 제거
   - `yoga-layout` 패키지는 @pixi/layout의 peer dependency로 **유지**

4. **타입 정리**
   - `LayoutPosition`, `LayoutResult` 타입 제거 또는 대체

5. **cssVariableReader.ts** 정리
   - 더 이상 사용되지 않는 preset 함수들 제거
   - `getRadioSizePreset()`, `getTextFieldSizePreset()` 등

6. **테스트 및 문서 업데이트**
   - 관련 테스트 파일 수정
   - 주석/문서에서 LayoutEngine 참조 제거

### 영향 파일
- `apps/builder/src/builder/workspace/canvas/layout/LayoutEngine.ts` (삭제)
- `apps/builder/src/builder/workspace/canvas/layout/index.ts`
- `apps/builder/src/builder/workspace/canvas/utils/cssVariableReader.ts`
- `package.json` (의존성 정리)

### 검증 방법
- 전체 앱 빌드 성공
- TypeScript 컴파일 에러 없음
- 모든 페이지 수동 테스트
- E2E 테스트 통과 (있다면)

### 위험/주의점
- 삭제 전 모든 Phase가 완벽히 작동하는지 확인 필수
- Git에서 이전 코드 복구 가능하도록 커밋 관리
- **진행 현황:** 대기

---

## 마이그레이션 순서 요약

```
Phase 1: 인프라 설정 (낮은 위험)
    ↓
Phase 2: Panel, Card (낮은 위험)
    ↓
Phase 3: Button, Text, Label (중간 위험)
    ↓
Phase 4: Checkbox, Radio, Input (중간 위험)
    ↓
Phase 5: Tabs (높은 위험)
    ↓
Phase 6: BuilderCanvas 통합 (매우 높은 위험)
    ↓
Phase 7: 정리 및 삭제 (낮은 위험)
```

## 예상 코드 감소량

| 항목 | 현재 | 예상 |
|------|------|------|
| LayoutEngine.ts | ~1,800줄 | 0줄 (삭제) |
| UI 컴포넌트 측정 코드 | TBD | TBD |
| 위치 계산 코드 | TBD | TBD |
| **총 감소** | - | **TBD (Phase 2~6 완료 후 재산정)** |

---

## 롤백 전략

각 Phase별로:
1. 별도 브랜치에서 작업
2. 기존 코드 주석 처리 (삭제 X) → Phase 7에서 최종 삭제
3. Feature flag로 신/구 시스템 전환 가능하게 구현 고려

---

**다음 작업은 Phase 6의 레이아웃 엔진 제거/Selection 연동 전환입니다.**
