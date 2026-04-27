# ADR-911 Phase 3 — Frame Canvas Authoring 시각 path Breakdown

> **상태**: Proposed (2026-04-28 세션 46) — 본격 land 미진입
> **연결 ADR**: [911](../911-layout-frameset-pencil-redesign.md) Phase 3 sub-phase
> **prerequisite**: 본 sub-phase 가 [ADR-912](../912-editing-semantics-ui-5elements.md) 의 Canvas 시각 마커 land 의 prerequisite

## 1. 결함 요약

### 사용자 시나리오

1. FramesTab 에서 새 Frame 추가 (Frame 1, Frame 2 등)
2. Inspector 에서 Layout Preset 선택 (예: "수직 2단", "수직 3단")
3. **기대**: Skia 캔버스에 영역 구분 slot 들이 시각화 (header / content / footer 분리선)
4. **실제**: Skia 캔버스에 page (Home) 사각형만 표시. frame body + slot 영역 미렌더

### 측정 evidence (세션 46 Chrome MCP)

```js
// Builder dev runtime store state
pagePositions: { "234dc7c9-...": { x: 0, y: 0 } }   // ← page 1개만, frame 좌표 0건
editingContextId: null                              // ← frame editing context 진입 path 없음
elementsMap: 8 elements                             // page body + Frame 1 body+2 Slots + Frame 2 body+3 Slots
childrenMap.root = [
  "29f8a4b0",  // page body (page=234dc7c9)
  "91c01890",  // Frame 1 body (layout=f49ac75d) — root 자식이지만 viewport 밖
  "77ae39dc",  // Frame 2 body (layout=9c945c91) — 동일
]
```

### Root cause 진단 (3 layer)

| Layer                   | 결함                                                                                                                                             | 영향                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **L1**: 좌표 등록       | `pagePositions` 가 page id 만 key. frame id 의 좌표 등록 path 부재 (`updatePagePosition: (pageId, x, y)`)                                        | frame body 의 viewport 좌표 없음 → 캔버스에 그릴 영역 없음 |
| **L2**: 그룹 계산       | `computeLayoutGroups(pages, layouts, doc)` 가 page-layout 매핑 (그래픽 그룹 라벨링) 만. frame 자체를 별도 캔버스 영역으로 그릴 그룹화 logic 없음 | frame editing 시 별도 영역 계산 안 됨                      |
| **L3**: editing context | `editingContextId` 가 frame 선택 시 frame.id 로 갱신되지 않음. SkiaCanvas 가 frame editing 모드 인지 path 없음                                   | frame editing 진입 시각 표현 불가                          |

### Cutover 의 의미

- ADR-911 cutover commit `7b6f4eb9` (Phase 2 PR-E4) = **`featureFlags` default true flip 만** (4 file / 38/-8 라인, 실 logic 0건)
- 즉 frame canvas authoring 시각 path 는 **dual-mode (legacy/canonical 모두) 시절부터 미구현**
- cutover 가 회귀를 만든 게 아니라 **ADR-911 design 자체의 fundamental 미완성** 노출
- Gate G2 (시각 회귀 0) 충족 불가 → Phase 2 closure 보류

## 2. Sub-phase 분해

| Sub-phase | 작업                                                                                                                                           | 예상 비용 |   위험   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: |
| **P3-α**  | `pagePositions` 확장 또는 신규 `framePositions` map 도입 — frame id → `{x, y, width, height}` 저장 + 갱신 setter                               |    1d     |   MED    |
| **P3-β**  | `computeLayoutGroups` 확장 — frame 별 캔버스 영역 그룹 추가. selectedReusableFrameId 또는 모든 reusable frame 을 별도 영역으로 계산            |    1d     |   MED    |
| **P3-γ**  | `editingContextId` 갱신 path — frameActions.selectReusableFrame 시 setEditingContextId(frameId) 호출. SkiaCanvas 가 editingContextId 기반 분기 |   0.5d    |   LOW    |
| **P3-δ**  | Skia render path 통합 — BuilderCanvas 의 page viewport 외에 frame viewport 추가. frame body+slot 들이 frame viewport 안에 그려짐               |    2d     | **HIGH** |
| **P3-ε**  | hit-test/drag/selection 통합 — frame 영역도 사용자 인터랙션 가능 (선택, 드래그, hover)                                                         |   1.5d    |   MED    |
| **P3-ζ**  | Chrome MCP 시각 회귀 검증 + roundtrip — Frame 추가 → Layout preset 적용 → Skia slot 시각화 사용자 시나리오 GREEN                               |   0.5d    |   LOW    |

**총 예상**: 6.5d ≈ **1주+** HIGH

## 3. 대안 검토

### 대안 A: 본 sub-phase 분해대로 진입 (frame canvas viewport 신규 도입)

- 위험: 기술(M) / 성능(M) / 유지보수(M) / 마이그레이션(L)
- 장점: pencil app 호환 design 정합 (frame 이 1급 캔버스 영역)
- 단점: 1주+ HIGH 작업, BuilderCanvas 광범위 변경

### 대안 B: page.layout_id 기반 inline 시각화 (frame body 를 page 안에 그림)

- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 장점: pagePositions 확장 불필요. page → frame 통합 시각 표현
- 단점: 한 page 가 한 frame 만 적용 가능 (현재 model). reusable frame 의 다중 page 사용 시 각 page 마다 동일 frame 시각 반복 — 사용자 인지 저하
- pencil app 의 frame editing semantics 와 정합 안 됨

### 대안 C: page.layout_id 자동 cleanup + 사용자 인지 변경 (frame 자체는 시각화 안 함)

- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)
- 장점: 최소 변경. 단순 데이터 정합 fix
- 단점: 사용자가 FramesTab 에서 Frame 추가/편집 시 시각 feedback 0 — UX 손실
- ADR-911 의 핵심 가치 (frame authoring) 자체 포기

### Risk Threshold Check

| 대안 | HIGH+ | 판정                         |
| ---- | :---: | ---------------------------- |
| A    |   0   | 채택 권장 (1주+ 비용 수용)   |
| B    |   0   | 채택 가능, 사용자 인지 단점  |
| C    |   0   | 채택 가능, ADR-911 가치 손실 |

대안 A 채택 권장 — pencil app 호환 design 정합 + 사용자 인지 완성. 단, 본격 land 는 별도 세션 (1주+ HIGH).

## 4. Gate

| Gate     | 시점      | 통과 조건                                                                                                                               | 실패 시                     |
| -------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **G3-α** | P3-α 완료 | (a) `framePositions` 또는 확장된 `pagePositions` 에 frame id 좌표 저장 (b) updatePosition setter 동작 (c) test 5/5 PASS                 | 데이터 모델 재검토          |
| **G3-β** | P3-β 완료 | (a) computeLayoutGroups 가 frame 영역 그룹 반환 (b) 기존 page 그룹화 회귀 0                                                             | layoutGroup 알고리즘 재검토 |
| **G3-γ** | P3-γ 완료 | (a) frame 선택 시 editingContextId 갱신 (b) 다른 element 선택 시 editingContextId null 또는 frame 의 자식                               |                             |
| **G3-δ** | P3-δ 완료 | (a) Skia 캔버스에 frame body 영역 그려짐 (b) frame body 자식 (slot) 도 영역 안에 그려짐 (c) Chrome MCP screenshot 사용자 시나리오 GREEN | render 알고리즘 재검토      |
| **G3-ε** | P3-ε 완료 | (a) frame body 클릭 시 selection (b) drag 가능 (c) hover outline 표시                                                                   |                             |
| **G3-ζ** | P3 종결   | (a) Chrome MCP 사용자 회귀 시나리오 100% GREEN (b) `mockLargeDataV2` 시각 회귀 0 (c) 기존 page 캔버스 회귀 0                            | 부분 land 후 후속           |

## 5. 비고

- 본 sub-phase 진입 시 **1주+ HIGH 작업**. design 단계가 prerequisite — 단순 fix 불가
- ADR-912 (Editing Semantics UI 5요소) 의 Canvas 시각 마커는 **본 P3 base render 위에 land**. 본 결함이 ADR-912 의 prerequisite
- ADR-911 monitoring 6일 대기 framing 무의미 — Gate G2 가 사용자 회귀 보고로 미충족 확정. monitoring 종결이 시각 회귀를 해소하지 않음
- 본 sub-phase 가 ADR-911 Phase 3 의 신규 영역. 기존 Phase 3 (cascade 재작성) 와 별개로 진행 가능 — 두 영역 schema 직교

## 6. 참조

- [ADR-911 본문](../911-layout-frameset-pencil-redesign.md) (진행 로그 2026-04-28 entry)
- [ADR-911 design breakdown 본체](911-layout-frameset-pencil-redesign-breakdown.md)
- [ADR-911 Closure 체크리스트](911-closure-checklist.md) — 본 P3 land 후 종결 체크
- [ADR-912](../912-editing-semantics-ui-5elements.md) — 시각 마커 (본 P3 prerequisite)
- 세션 46 fix commits — `1f732be3` / `f299d373` (LayerTree/Inspector 정상화, Skia 캔버스는 본 P3 작업 후)
