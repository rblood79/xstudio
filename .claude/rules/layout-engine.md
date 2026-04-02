---
description: 레이아웃 엔진 관련 파일 작업 시 적용
globs:
  - "packages/layout-flow/**"
  - "**/layout/**"
  - "**/engines/**"
  - "**/LayoutContainer*"
---

# 레이아웃 엔진 규칙

## 엔진 선택

- `display: flex` → TaffyFlexEngine (WASM)
- `display: grid` → TaffyGridEngine (WASM)
- `display: block` / `undefined` → TaffyBlockEngine (WASM)
- 단일 Taffy WASM 엔진 체계

## layoutVersion 계약

- `fullTreeLayoutMap` useMemo는 `layoutVersion` 카운터에 의존
- 레이아웃에 영향을 주는 **모든 코드 경로**에서 `layoutVersion + 1` 증가 필수
- Store 내부: `set((state) => ({ ..., layoutVersion: state.layoutVersion + 1 }))` 패턴
- Store 외부: `useStore.getState().invalidateLayout()` 호출
- `LAYOUT_AFFECTING_PROPS` Set에 해당하는 프로퍼티 변경 시 필수
- 새 레이아웃 영향 prop 추가 시 **2곳 동시 등록 필수**: `inspectorActions.ts`의 `LAYOUT_AFFECTING_PROPS` + `layoutCache.ts`의 `LAYOUT_PROP_KEYS` (캐시 시그니처). 후자 누락 시 캐시 히트로 변경 미반영

## CONTAINER_TAGS

- children을 내부에서 렌더링하는 컴포넌트 (Card, Panel 등)
- height: `'auto'` + `minHeight` → Taffy가 children 높이 계산
- 고정 height 사용 금지 (children 겹침)

## calculateContentHeight

- content-box 높이만 반환 (padding 제외)
- padding은 외부에서 추가

## Parent-delegated props 상속 (Canvas 엔진)

- CSS는 `data-*` 선택자로 부모 → 자식 프로퍼티를 자동 상속하지만, Canvas 엔진은 명시적 전파 필요
- `getChildElements`는 `elementsMap` 원본 반환 — 부모의 size/variant 등 위임 props 미포함
- 해결: `effectiveGetChildElements` 래퍼로 자식에 부모 props 주입 (TagGroup → Tag size 등)
- `enrichWithIntrinsicSize`의 `calculateContentWidth` 재귀 호출과 DFS `filteredChildren` 양쪽에 적용 필수
- **Select/ComboBox size delegation**: fullTreeLayout.ts에서 Select/ComboBox의 size를 SelectTrigger/ComboBoxWrapper에 주입
- **Skia 렌더링 경로도 동기화 필수**: ElementSprite.tsx의 `parentDelegatedSize` selector가 부모/조부모에서 size를 읽어 Spec shapes에 전달

## Label size delegation (DFS 진입 시 주입)

- Label DFS 진입 시 조상 탐색으로 `fontSize`/`lineHeight` 인라인 주입 (`fullTreeLayout.ts`)
- **주입 조건 (CRITICAL)**: `labelStyle.lineHeight == null` 기준으로 주입 여부 결정
  - `fontSize == null` 조건 사용 금지 — factory에서 `fontSize: 14`를 미리 지정한 경우 fontSize 조건은 통과하지 못해 lineHeight 주입이 스킵됨
  - lineHeight 미주입 시 `fontSize * 1.5` fallback 적용 → CSS Preview(`--text-sm--line-height` = 20px)와 불일치
  - 동일 이유로 `getChildElements` 래퍼의 스킵 조건도 `cs.lineHeight != null` 기준 사용 (`cs.fontSize != null` 금지)
- **batch height override**: `Math.ceil(childFs * 1.5)` 대신 LABEL_SIZE_STYLE lineHeight 역참조 필수
  - `fullTreeLayout.ts:1078` — LABEL_SIZE_STYLE에서 size별 lineHeight 값을 읽어 override (CSS Preview 정합성)
- **`lastDelegationAncestor` 패턴**: 최초 발견된 DELEGATION 부모를 기억하고, 상위에 size 소유자가 있으면 갱신
  - standalone Checkbox(size 없음) → `lastDelegationAncestor = Checkbox` → 기본값 "md"
  - CheckboxGroup 내 → Checkbox(래퍼) → CheckboxItems(래퍼) → CheckboxGroup(size 소유) → 해당 size 사용
- **LABEL_WRAPPER_TAGS**: `Checkbox, Radio, CheckboxItems, RadioItems` — size 없이 상위로 통과
- **LABEL_DELEGATION_PARENT_TAGS**: 모든 size-delegation 컨테이너 — DatePicker, DateRangePicker 포함 필수
  - 누락 시 Label height가 24px(fallback fontSize=16 × 1.5)로 오계산
- **LABEL_SIZE_STYLE**: LabelSpec 단일 소스 xs~xl 매핑 (fontSize + lineHeight "px" 단위)
- lineHeight는 반드시 `"20px"` 문자열로 전달 (숫자는 `parseLineHeight`가 배율로 해석)

## Select/ComboBox 부모 높이 추정 (utils.ts)

- Select/ComboBox의 부모 높이 추정 시 `parseLineHeight` 우선 사용 → `Math.ceil(fontSize * 1.5)` fallback 금지
  - `utils.ts`의 `effectiveHeight` 계산: `parseLineHeight(lineHeight, fontSize)` 값이 있으면 우선 적용
  - `lineHeight`가 null이면 `Math.ceil(fontSize * 1.5)` fallback (기존 동작 유지)
  - 목적: LabelSpec lineHeight가 CSS `--text-sm--line-height`(20px)와 일치하도록 보장

## Checkbox/Radio → CheckboxGroup/RadioGroup size 주입 (DFS)

- Checkbox/Radio DFS 진입 시 부모(CheckboxItems → CheckboxGroup) 탐색하여 `size` 주입
- `implicitStyles.ts`가 `containerProps.size`로 indicator marginLeft를 계산하므로 필수
- Store에 size가 없는 자식에만 적용 (이미 size가 있으면 스킵)

## Block-child normalization guard

- fullTreeLayout의 block-child 정규화(`width: 100%` 주입)에서 `enrichWithIntrinsicSize`가 이미 계산한 numeric/px 폭이 있으면 덮어쓰지 않음
- 가드: `typeof existingW === "number"` 또는 `existingW !== "auto" && existingW !== "100%"` 시 skip

## Taffy f32 정밀도 보정

- `enrichWithIntrinsicSize`에서 width 주입 시 `Math.ceil` 적용
- Taffy(f32)와 JS(f64) 간 부동소수점 정밀도 차이로 flex-wrap 컨테이너에서 불필요한 wrap 방지

## PersistentTaffyTree display/grid 전환 감지 (CRITICAL)

- `implicitStyles`가 주입하는 display 변경(GridList `layout` prop 등)은 PersistentTaffyTree의 증분 갱신으로 처리 불가 → **full rebuild 필수**
- `fullTreeLayout.ts` Step 3: `prevDisplay !== curDisplay` 비교로 display 전환 감지
- **gridTemplateColumns 변경도 full rebuild 트리거** — Taffy 증분 갱신이 grid track 변경을 올바르게 처리하지 못함
- `affectedNodeIds`가 있으면 해당 노드만 검사 (성능 최적화), 없으면 전체 배치 노드 검사
- `affectedNodeIds` 필터를 걸 때 `undefined` 조건 누락 금지 — 캐시 미스 시 `affectedNodeIds`가 `undefined`로 전달될 수 있음
- 위반 시: display 전환(flex↔grid↔block) 또는 columns 변경이 새로고침 전까지 캔버스에 반영 안 됨

## 2-Pass 레이아웃 — width 제약 → height 재계산 (범용)

CSS 브라우저는 폭 결정 → 텍스트 줄바꿈 → auto height를 한 번에 처리하지만, Taffy는 enrichment(1-pass)에서 부모 전체 폭 기준으로 height 계산 → 실제 할당 폭과 불일치.

- **fullTreeLayout Step 4.5**: `computeLayout` 후 **모든 노드**의 실제 width vs enrichment width 비교
  - auto height 노드만 대상 (고정 height 스킵)
  - width 차이 > 2px → `enrichWithIntrinsicSize` 재실행 → `computeLayout` 재호출
  - 부모는 Taffy가 자식 height 합산으로 auto height 자동 갱신
- **적용 범위**: grid 1fr 트랙, flex-grow/shrink, flex row wrap, 사용자 지정 width 제약 등 모든 케이스
- `patchBatchStyleFromImplicit`에서 `Array.isArray(val)` 조건 필수 — gridTemplateColumns 배열 패치
- 기존 `TaffyFlexEngine.layoutChildren` 2-pass (라인 269-348)와 동일 원리이나, fullTreeLayout은 PersistentTaffyTree 기반이므로 별도 구현

## Layout Prop 변경 → Canvas 즉시 반영 파이프라인

새 레이아웃 영향 prop 추가 시 **5곳 동시 확인 필수**:

1. `inspectorActions.ts`의 `LAYOUT_AFFECTING_PROPS` — layoutVersion 트리거
2. `layoutCache.ts`의 `LAYOUT_PROP_KEYS` — 캐시 시그니처
3. `ElementsLayer.tsx`의 `pageLayoutSignature` deps — `elementById` 포함 (pageElements는 stale 참조)
4. `fullTreeLayout.ts`의 `patchBatchStyleFromImplicit` — 배열 타입 지원
5. `fullTreeLayout.ts`의 display/grid 전환 감지 — 필요 시 full rebuild 조건 추가

## Collection Item font 주입 (ListBoxItem/GridListItem)

- 자식 Text/Description의 fontSize/fontWeight를 3경로에서 동기화:
  - **CSS**: 부모에 font-size/weight 설정 → 자식 상속 + description override
  - **implicitStyles**: `injectCollectionItemFontStyles()` 헬퍼 — Taffy 높이 계산용
  - **ElementSprite**: `collectionItemFontStyle` selector — TextSprite 렌더링용
- GridListItem에 `minWidth: 0` 주입 — CSS `minmax(0, 1fr)` 동기화

## order_num 재정렬

- `batchUpdateElementOrders()` 사용 필수 (단일 set() + \_rebuildIndexes())
- setTimeout/queueMicrotask 안에서 반드시 `get()`으로 최신 상태 참조 (stale closure 방지)
