---
description: 레이아웃 엔진 관련 파일 작업 시 적용
globs:
  - "packages/layout-flow/**"
  - "**/layout/**"
  - "**/engines/**"
  - "**/LayoutContainer*"
---

# 레이아웃 엔진 규칙

> 구현 상세는 [layout-details.md](.claude/skills/xstudio-patterns/reference/layout-details.md) 참조

## 엔진 선택

- flex → TaffyFlexEngine, grid → TaffyGridEngine, block/undefined → TaffyBlockEngine (단일 Taffy WASM)

## layoutVersion 계약 (CRITICAL)

- `fullTreeLayoutMap` useMemo는 `layoutVersion` 카운터에 의존
- 레이아웃 영향 **모든 코드 경로**에서 `layoutVersion + 1` 필수
- 새 layout prop 추가 시 **2곳 동시 등록**: `LAYOUT_AFFECTING_PROPS` + `LAYOUT_PROP_KEYS`. **Why**: 후자 누락 → 캐시 히트로 변경 미반영

## CONTAINER_TAGS

- children 렌더링 컴포넌트는 height: `'auto'` + `minHeight`. **Why**: 고정 height → children 겹침

## Parent-delegated props 상속

- Canvas 엔진은 CSS와 달리 명시적 전파 필요 → `effectiveGetChildElements` 래퍼 사용
- `enrichWithIntrinsicSize` 재귀 호출과 DFS `filteredChildren` 양쪽에 적용 필수
- Skia 경로도 동기화: ElementSprite `parentDelegatedSize` selector. **Why**: Store가 자식 size 미저장

## Label size delegation (CRITICAL)

- DFS 진입 시 조상 탐색으로 `fontSize`/`lineHeight` 인라인 주입
- 주입 조건: `labelStyle.lineHeight == null` 기준. **Why**: fontSize 조건 → factory 기본값과 충돌 → lineHeight 미주입 → 1.5배 fallback
- LABEL_SIZE_STYLE: LabelSpec 단일 소스 xs~xl 매핑. lineHeight는 `"20px"` 문자열 필수 (숫자는 배율 해석)
- LABEL_DELEGATION_PARENT_TAGS: DatePicker/DateRangePicker 포함 필수. **Why**: 누락 → Label 24px 오계산
- batch height override: `Math.ceil(fontSize * 1.5)` 대신 LABEL_SIZE_STYLE lineHeight 역참조

## PersistentTaffyTree display/grid 전환 감지 (CRITICAL)

- display 변경 및 gridTemplateColumns 변경 → **full rebuild 필수**. **Why**: Taffy 증분 갱신이 처리 불가
- `affectedNodeIds` 필터 시 `undefined` 조건 누락 금지. **Why**: 캐시 미스 시 undefined 전달 가능

## 2-Pass re-enrichment (CRITICAL)

- Step 4.5에서 **`processedElementsMap` 우선 사용**. **Why**: store 원본은 DFS injection/implicit styles 없음 → 잘못된 height 계산
- merge 시 DFS injection 값을 base로 implicit styles merge (덮어쓰기 금지)

## Grid 트랙 폭 + 2-Pass 안전망

- DFS에서 grid 컨테이너 자식 width를 `(contentWidth - totalGap) / numCols`로 사전 조정
- Step 4.5: 실제 width vs enrichment width 비교 → 차이 시 re-enrich + dirty + recompute
- 2-pass에서 `buildFull()` 호출 금지 — `updateNodeStyle` + `markDirty` + `computeLayout`만 사용

## Layout Prop 변경 → Canvas 반영 (5곳 체크리스트)

1. `LAYOUT_AFFECTING_PROPS` — layoutVersion 트리거
2. `LAYOUT_PROP_KEYS` — 캐시 시그니처
3. `pageLayoutSignature` deps — elementById 포함
4. `patchBatchStyleFromImplicit` — 배열 타입 지원
5. display/grid 전환 감지 — full rebuild 조건

## Overflow Scroll + Flex Shrink 보정

- `overflow !== "visible"` 부모(hidden/clip/scroll/auto)의 flex 자식에 명시적 `flexShrink`가 없으면 `flexShrink: 0` 자동 주입. **Why**: CSS에서 overflow clipped 컨테이너의 자식은 shrink하지 않고 overflow 허용하지만, Taffy는 이 상호작용 미지원 → 기본 `flexShrink: 1`로 자식이 축소됨
- 보정 위치: `fullTreeLayout.ts` DFS post-order (Step 5.7) + `TaffyFlexEngine.ts` `_runTaffyPassRaw`. **Why**: WebGL은 fullTreeLayout, 레거시 경로는 TaffyFlexEngine — 양쪽 모두 필요
- flex-direction과 overflow 축 매칭 필수: `row` → `overflowX`, `column` → `overflowY`. **Why**: 교차축 overflow는 shrink와 무관

## CSS min-width:auto 에뮬레이션 (CRITICAL)

- `enrichWithIntrinsicSize`에서 flex 자식에 `width` 주입 시 `minWidth`도 동일 값으로 동시 설정. **Why**: CSS flex item의 기본 `min-width: auto` = min-content 크기. Taffy는 이를 0으로 처리 → 자식이 0px까지 축소 가능. `overflow: visible`에서도 Preview와 동일하게 자연 너비 유지 필요
- 사용자 명시적 `minWidth` 설정 시 보존 (덮어쓰기 금지)
- `isFlexChild` 파라미터가 true일 때만 적용. **Why**: block 자식은 min-width:auto가 0이므로 주입 불필요

## 기타 규칙

- calculateContentHeight: content-box만 반환 (padding 제외)
- Block-child normalization: 이미 numeric/px 폭 있으면 100% 주입 스킵
- Taffy f32 보정: enrichWithIntrinsicSize에서 `Math.ceil` 적용. **Why**: f32/f64 정밀도 차이 → 불필요한 wrap
- Checkbox/Radio DFS: 부모 탐색으로 size 주입 (implicitStyles indicator 계산용)
- Collection Item font: CSS + implicitStyles + ElementSprite 3경로 동기화
- order_num 재정렬: `batchUpdateElementOrders()` 단일 set(). setTimeout 내 `get()` 필수 (stale closure)

## 금지 패턴

- flex 자식 width 주입 시 minWidth 미설정 금지 → `enrichWithIntrinsicSize`에서 동시 주입 필수
- overflow flexShrink 보정에서 `scroll/auto`만 체크 금지 → `!== "visible"` 필수
- DFS 조건에 `fontSize == null` 사용 금지 → `lineHeight == null` 필수
- Label height에 `Math.ceil(fontSize * 1.5)` 금지 → LABEL_SIZE_STYLE 역참조
- Label lineHeight를 숫자로 전달 금지 → `"20px"` 문자열 필수
- 2-pass에서 `buildFull(batch)` 호출 금지 → updateNodeStyle + markDirty + computeLayout
- Step 4.5에서 processedElementsMap 대신 elementsMap 직접 사용 금지
- CONTAINER_TAGS에 고정 height 사용 금지
- Select/ComboBox 높이에 `Math.ceil(fontSize * 1.5)` 금지 → parseLineHeight 우선
