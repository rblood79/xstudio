# ADR-903 P3-D-4 Phase D — Chrome MCP 통합 검증 시나리오

> 본 문서는 P3-D-4 Phase B (postMessage schema bump) + Phase C (usePageManager canonical 전환) 통합 후
> Chrome MCP 로 실 Builder 앱에서 회귀 / 정합성을 검증하는 시나리오 모음이다.
>
> **다음 세션 (Phase D 진입) 에서 본 시나리오를 순서대로 실행한다.**
>
> 부모 문서: [903-phase3d-runtime-breakdown.md](903-phase3d-runtime-breakdown.md)
> ADR 본문: [ADR-903](../completed/903-ref-descendants-slot-composition-format-migration-plan.md)

---

## 사전 상태 확인 (세션 시작 시 필수)

아래 7가지를 모두 확인한 후 시나리오 실행에 진입한다.

```bash
# 1. PR #1 (Phase A RED), #2 (Phase B postMessage), #3 (Phase C canonical) 머지 여부
git log --oneline origin/main..HEAD
# 기대값: 출력 없음 (현재 브랜치 = main HEAD)

# 2. 타입 체크 전수 PASS
pnpm type-check

# 3. 단위 테스트 전수 PASS
pnpm test --run

# 4. dev server 기동 가능 확인
pnpm dev 2>&1 | head -5
# 기대값: port 5173 (또는 stdout 에 출력되는 실제 포트) 진입 가능

# 5. Phase B 변경 사항 — postMessage version 필드가 "composition-1.0" 인지 소스 확인
grep -r '"composition-1.0"' apps/builder/src --include='*.ts' -l
```

**6. Compare Mode 또는 Preview toggle 활성화 (CRITICAL)**:

- Builder UI 우측 상단 "Compare Mode (Preview + Skia)" 또는 "Preview" 버튼 **사용자 직접 클릭** 필수
- React Aria ToggleButton 은 javascript native `click()` 또는 `dispatchEvent(new MouseEvent("click"))` 에 미반응 — `aria-pressed` 변경 안 됨
- 이 toggle 없이는 iframe 미존재 → postMessage intercept 불가 → 시나리오 A/B/C/D 전체 실행 불가
- 검증 중 iframe 가 unmount 되면 toggle 다시 활성화 필요 (re-render 가 iframe 재mount 유발 가능)

**7. page 2개 이상 사전 생성 (B-1 필수)**:

- B-1 (page 전환 element 누락 0) 시나리오는 page 2개 이상 환경에서만 검증 가능
- 빈 프로젝트로 진입 시 NodesPanel "Add Page" 버튼으로 사전 추가
- B-2 (layout-linked page) 는 layout 1개 이상 + 그 layout 을 사용하는 page 1개 이상

**PR 미머지 상태에서 실행 시**: P3-D-1 (factory ownership) 미머지면 B-2 시나리오가 FAIL 예상 — 알려진 미정합이므로 기록 후 계속 진행.

---

## 검증 환경

| 항목               | 값                                                |
| ------------------ | ------------------------------------------------- |
| Builder dev server | `pnpm dev` (apps/builder, 포트 5173 기본)         |
| Preview iframe     | Compare Mode/Preview toggle ON 시에만 mount       |
| postMessage schema | `composition-1.0` (UPDATE_ELEMENTS 한정, Phase B) |
| 검증 도구          | Chrome MCP (`mcp__claude-in-chrome__*`)           |
| 사전 메모리        | `feedback-chrome-mcp-patterns.md` 패턴 재사용     |

### Phase B version scope (UPDATE_ELEMENTS 한정 — 의도된 결정)

`useIframeMessenger.ts` 의 send 함수 중 **`UPDATE_ELEMENTS` 만** `version: "composition-1.0"` 적용. 다른 9 message types (`UPDATE_LAYOUTS`, `UPDATE_PAGES`, `UPDATE_PAGE_INFO`, `UPDATE_DATA_TABLES`, `UPDATE_API_ENDPOINTS`, `UPDATE_VARIABLES`, `THEME_BASE_TYPOGRAPHY`, `THEME_VARS`, `SET_DARK_MODE`) 는 version 필드 미사용.

**이유**: ADR-903 design (`903-phase3d-runtime-breakdown.md` L36/L388) 의 version scheme 정의가 **canonical document 식별 용** — canonical document 의 핵심은 elements 이므로 version 도 element message 한정. 다른 message types 는 canonical 외부 구성 요소.

**검증 시 주의**: 다른 message types 의 `version: null` 은 정상. UPDATE_ELEMENTS 만 `composition-1.0` 검증 대상.

### Chrome MCP 도구 최소 목록 (세션 시작 시 사전 로드)

| 도구                    | 역할                          |
| ----------------------- | ----------------------------- |
| `tabs_context_mcp`      | 탭 그룹 세팅                  |
| `navigate`              | Builder URL 진입              |
| `read_console_messages` | Console 에러 필터링           |
| `javascript_tool`       | Store / postMessage 직접 검사 |
| `find`                  | DOM 요소 위치 파악            |
| `gif_creator`           | 다단계 검증 흐름 녹화 (권장)  |

### Store access 패턴 (세션 16 확립)

```javascript
// Builder dev 환경 전역 노출
const store = window.__composition_STORE__;
const st = store.getState();
// 주요: elementsMap (Map), currentPageId, selectedElementId, currentProjectId
// write: addElement, updateElementProps, deleteElement
```

---

## 시나리오 그룹 A — postMessage Schema (Phase B)

### A-1. version 필드 확인

**목적**: Phase B 에서 bump 한 `version: "composition-1.0"` 이 Preview 측에 정상 전달되는지 확인.

**절차**:

1. Builder 첫 로드 완료 대기 (Skia canvas 등장 확인)
2. `javascript_tool` 로 Preview iframe 의 최근 수신 message 의 `version` 필드 출력

```javascript
// Preview iframe 에서 마지막 수신 message 확인
const iframe = document.querySelector("iframe");
const doc = iframe?.contentDocument;
const win = iframe?.contentWindow;
// Preview 가 수신 message 를 window.__lastMessage 에 저장하는지 여부는 Phase C 구현에 따라 다름.
// 대안: Builder 측 postMessage 발신 직전에 intercept
const origPostMessage = window.postMessage;
window.__interceptedMessages = [];
window.postMessage = function (msg, ...args) {
  if (msg?.type === "UPDATE_ELEMENTS") {
    window.__interceptedMessages.push(msg);
  }
  return origPostMessage.call(this, msg, ...args);
};
// 이후 page 전환 또는 element 조작 유도 후 확인
window.__interceptedMessages.at(-1)?.version;
```

**통과 조건**: `"composition-1.0"` 반환
**실패 시 회귀 패턴**: 이전 schema (`"legacy-1.0"` 또는 `undefined`) → Phase B PR 미머지 또는 message 발신 경로가 둘 이상이어서 한 경로가 미갱신.

---

### A-2. pageInfo 필드 확장 확인

**목적**: Phase B 에서 추가한 `pageInfo.reusableFrameId` 필드가 postMessage 페이로드에 포함되는지 확인.

**절차**:

1. 페이지 1개 이상 존재하는 프로젝트 열기
2. `javascript_tool` 로 `UPDATE_ELEMENTS` message 의 `pageInfo` 키 목록 출력

```javascript
// A-1 에서 세팅한 intercept 재사용 또는 재선언
const msg = window.__interceptedMessages?.at(-1);
msg?.pageInfo ? Object.keys(msg.pageInfo) : "no pageInfo intercepted yet";
// Page 전환 후 재실행
```

**통과 조건**: `pageInfo` 객체에 `reusableFrameId` 키 존재 (값이 null 이어도 키 자체 존재 시 PASS)
**실패 시 회귀 패턴**: `layoutId` 만 존재 → Phase B 의 `pageInfo` 타입 확장이 발신 경로에 반영 안 됨.

---

### A-3. BC alias 작동 — Preview 렌더 정상

**목적**: Phase B 변경 후에도 Preview 측 messageHandler 가 `layoutId` + `reusableFrameId` 두 alias 를 모두 인식하여 렌더 유지.

**절차**:

1. Preview 패널 열기 (aria-label="Preview" 버튼 클릭)
2. 페이지 전환 1회 + element 추가 1회
3. Preview iframe DOM 에서 blank 없음 + Console 에러 없음 확인

```javascript
// Preview 패널 열기
const previewBtn = [...document.querySelectorAll("button[aria-label]")].find(
  (b) => b.getAttribute("aria-label") === "Preview",
);
previewBtn?.click();
await new Promise((r) => setTimeout(r, 1500));

// iframe DOM 정상 확인
const iframe = document.querySelector("iframe");
const doc = iframe?.contentDocument;
const elementCount = doc?.querySelectorAll("[data-element-id]").length ?? 0;
elementCount; // 0 이면 blank 가능성
```

**통과 조건**: Preview iframe 내 `[data-element-id]` 요소 > 0, Console error 0
**실패 시 회귀 패턴**: alias 인식 실패 → Preview messageHandler 가 `layoutId` 만 처리하고 `reusableFrameId` 미인식.

---

## 시나리오 그룹 B — Page 전환 + Layout (Phase C)

### B-1. 일반 페이지 전환 — element 누락 0

**목적**: Page A → Page B → Page A 왕복 전환 시 각 page 의 element 가 누락 없이 Preview 에 표시.

**절차**:

1. 2개 이상 page 각각에 element 1개 이상 존재하는 프로젝트 준비 (없으면 `addElement` 로 생성)
2. Page A 선택 → Preview element 수 기록
3. Page B 선택 → Preview element 수 기록
4. Page A 재선택 → Preview element 수 재확인

```javascript
const st = window.__composition_STORE__?.getState();
const pages = st?.pages ?? [];
// 현재 페이지의 element 수
const currentPageId = st?.currentPageId;
const elementsOnPage = [...(st?.elementsMap?.values() ?? [])].filter(
  (e) => e.page_id === currentPageId && e.tag !== "body",
);
`currentPageId=${currentPageId}, elements=${elementsOnPage.length}`;
```

**통과 조건**: 왕복 전환 후 각 page 의 element 수 일치 (Page A 2회 측정값 동일), Preview blank 0
**실패 시 회귀 패턴**: Phase C minimal stub 에서 `layoutElements` 미병합 → page 전환 시 일부 element 누락.

---

### B-2. Layout-linked page — element 표시 (P3-D-1 전제)

**목적**: layout(reusable frame) 에 linked 된 page 에서 layout elements 가 정상 표시.

**사전 조건**: P3-D-1 (factory ownership) PR 머지 후에만 PASS 가능. 미머지 상태에서는 알려진 FAIL — 기록 후 B-3 으로 진행.

**절차**:

1. layout 에 연결된 page 선택
2. Preview 에서 layout elements (layout 에 속한 container 등) 가 표시되는지 확인
3. Builder store 에서 `selectedReusableFrameId` 또는 `currentLayoutId` 값 확인

```javascript
const st = window.__composition_STORE__?.getState();
// Phase C 이후: selectedReusableFrameId (Phase B rename 적용 시)
// Phase C 이전: currentLayoutId
const frameId = st?.selectedReusableFrameId ?? st?.currentLayoutId ?? null;
`frameId=${frameId}`;
```

**통과 조건** (P3-D-1 머지 후): `frameId` non-null, layout elements Preview 표시 정상
**알려진 미정합** (P3-D-1 미머지): `frameId` non-null 이어도 layout elements 누락 가능

---

### B-3. canonical resolver 호출 확인

**목적**: page 전환 시 `selectCanonicalDocument` 가 실제로 호출되는지 trace.

**절차**:

1. `javascript_tool` 로 `selectCanonicalDocument` 함수 존재 여부 확인
2. 함수에 console.trace 래핑 적용 후 page 전환 유도
3. Console 에서 호출 stack 확인

```javascript
const st = window.__composition_STORE__?.getState();
// store selector 이름은 Phase C 구현에 따라 다름 — 아래는 예시 패턴
const hasSelector =
  typeof st?.selectCanonicalDocument === "function" ||
  typeof window.__canonicalDocumentResolver === "function";
`hasSelector=${hasSelector}`;

// 대안: console message 필터로 Phase C 가 출력하는 debug log 확인
// mcp__claude-in-chrome__read_console_messages({ pattern: 'canonical' })
```

**통과 조건**: 호출 trace 1회 이상 확인 (또는 Phase C debug log 존재)
**실패 시 회귀 패턴**: canonical resolver 미연결 → page 전환 시 legacy `currentLayoutId` 경로만 사용.

---

## 시나리오 그룹 C — Element CRUD 회귀

각 케이스는 **Preview 즉시 반영 (200ms 이내)** 을 통과 기준으로 한다.

### C-1. 추가 (4종)

**대상**: Image / Text / Button / Container

```javascript
const st = window.__composition_STORE__?.getState();
const bodyId = [...(st?.elementsMap?.values() ?? [])].find(
  (e) => e.tag === "body",
)?.id;
const pageId = st?.currentPageId;

for (const tag of ["Image", "Text", "Button", "Container"]) {
  const id = crypto.randomUUID();
  await st?.addElement({
    id,
    tag,
    parent_id: bodyId,
    page_id: pageId,
    order_num: Math.floor(Math.random() * 1_000_000),
    props: {},
  });
  await new Promise((r) => setTimeout(r, 300));
}
("add 4 elements done");
```

**통과 조건**: Preview iframe 에서 4종 모두 `[data-element-id]` 로 확인 가능, Console error 0

---

### C-2. 수정

**절차**:

1. C-1 에서 추가한 Button element 선택
2. style props 1개 (예: `width: "200px"`) 변경
3. Preview 즉시 반영 확인

```javascript
const st = window.__composition_STORE__?.getState();
const btnEl = [...(st?.elementsMap?.values() ?? [])].find(
  (e) => e.tag === "Button",
);
if (btnEl) {
  st?.updateElementProps(btnEl.id, { style: { width: "200px" } });
}
```

**통과 조건**: Preview 내 해당 element width 200px 반영

---

### C-3. 삭제

**절차**:

1. C-1 에서 추가한 Image element 삭제
2. Preview 에서 사라짐 확인

```javascript
const st = window.__composition_STORE__?.getState();
const imgEl = [...(st?.elementsMap?.values() ?? [])].find(
  (e) => e.tag === "Image",
);
if (imgEl) {
  st?.deleteElement(imgEl.id);
}
```

**통과 조건**: Preview iframe 에서 해당 `data-element-id` 소멸 확인

---

### C-4. Drag 이동

**목적**: Drag 이동 후 위치 변경이 Preview 에 정합.

**절차**:

1. Builder Canvas 에서 element 하나 drag (UI 조작 또는 `updateElementProps` 로 position 직접 변경)
2. Preview 에서 위치 변경 반영 확인

```javascript
const st = window.__composition_STORE__?.getState();
const btnEl = [...(st?.elementsMap?.values() ?? [])].find(
  (e) => e.tag === "Button",
);
if (btnEl) {
  // x/y 직접 변경 (drag 시뮬레이션)
  st?.updateElementProps(btnEl.id, {
    style: { left: "100px", top: "80px" },
  });
}
```

**통과 조건**: Preview iframe 에서 position 변경 반영

---

## 시나리오 그룹 D — 재로드 후 복원

### D-1. F5 새로고침

**목적**: 세션 종료 후 재로드 시 pages + elements 모두 복원.

**절차**:

1. C-1~C-4 작업 완료 상태에서 현재 page / element 수 기록
2. F5 새로고침 (`javascript_tool` 로 `location.reload()`)
3. 재로드 완료 후 동일 project 재진입
4. page / element 수 비교

```javascript
// 새로고침 전 snapshot
const st = window.__composition_STORE__?.getState();
const snapshot = {
  projectId: st?.currentProjectId,
  pageCount: st?.pages?.length ?? 0,
  elementCount: st?.elementsMap?.size ?? 0,
};
window.__preReloadSnapshot__ = snapshot;
JSON.stringify(snapshot);
// 새로고침 전 이 값을 메모한 후 location.reload() 수행
```

```javascript
// 새로고침 후 비교
const st = window.__composition_STORE__?.getState();
const after = {
  pageCount: st?.pages?.length ?? 0,
  elementCount: st?.elementsMap?.size ?? 0,
};
JSON.stringify(after);
```

**통과 조건**: 재로드 전후 `pageCount` 및 `elementCount` 동일

---

### D-2. 다른 project 로 전환

**목적**: project 1 → project 2 → project 1 복귀 시 project 1 의 모든 page + element 정합.

**절차**:

1. project 1 상태 snapshot
2. 다른 project 로 전환 (UI 또는 store 직접)
3. project 1 으로 복귀
4. 복귀 후 snapshot 비교

**통과 조건**: 복귀 후 `pageCount` + `elementCount` = 전환 전 값

---

## 회귀 체크 포인트 5종 (모든 시나리오 공통)

각 시나리오 실행 후 아래 5가지를 공통으로 확인한다.

| #    | 체크 항목                                    | 확인 방법                                                |
| ---- | -------------------------------------------- | -------------------------------------------------------- |
| RC-1 | Preview blank 발생                           | iframe DOM `[data-element-id]` 수 > 0                    |
| RC-2 | Console error 출력                           | `read_console_messages({ pattern: 'error' })`            |
| RC-3 | postMessage parse 실패                       | Console 에 `schema`, `parse`, `invalid` 포함 메시지 없음 |
| RC-4 | `element.page_id` / `element.layout_id` 소실 | `elementsMap` 내 임의 element 의 해당 필드 존재 확인     |
| RC-5 | canonical doc null 반환                      | `selectCanonicalDocument` 반환값 non-null 확인           |

```javascript
// RC-1~5 일괄 확인 스크립트
const st = window.__composition_STORE__?.getState();
const sampleEl = [...(st?.elementsMap?.values() ?? [])].find(
  (e) => e.tag !== "body",
);
const iframe = document.querySelector("iframe");
const doc = iframe?.contentDocument;

const checks = {
  "RC-1 preview blank":
    (doc?.querySelectorAll("[data-element-id]").length ?? 0) > 0,
  "RC-4 page_id exists": sampleEl?.page_id !== undefined,
  "RC-4 layout_id key": "layout_id" in (sampleEl ?? {}),
};
JSON.stringify(checks, null, 2);
// RC-2 RC-3 RC-5 는 read_console_messages + selectCanonicalDocument 별도 호출로 확인
```

---

## 통과 기준 요약

| 시나리오 | 통과 조건                          | P3-D-1 전제 |
| -------- | ---------------------------------- | ----------- |
| A-1      | `version === "composition-1.0"`    | 불필요      |
| A-2      | `pageInfo.reusableFrameId` 키 존재 | 불필요      |
| A-3      | Preview blank 0, Console error 0   | 불필요      |
| B-1      | 왕복 전환 element 수 일치          | 불필요      |
| B-2      | layout elements 표시 정상          | **필수**    |
| B-3      | canonical resolver 호출 1회 이상   | 불필요      |
| C-1      | 4종 추가 Preview 즉시 반영         | 불필요      |
| C-2      | style 수정 즉시 반영               | 불필요      |
| C-3      | 삭제 후 Preview 소멸               | 불필요      |
| C-4      | drag 이동 Preview 정합             | 불필요      |
| D-1      | 새로고침 후 page/element 수 동일   | 불필요      |
| D-2      | project 전환 복귀 정합             | 불필요      |

- **총 12 case** (B-2 는 P3-D-1 머지 후만 PASS)
- **Console error 0** — 모든 시나리오 공통
- **Preview blank 0** — 모든 시나리오 공통

---

## 실패 시 절차

1. **회귀 케이스 분류** — 시나리오 ID + 증상 (blank / error message / 값 불일치)
2. **systematic-debugging** skill 4단계:
   - 증상 재현 → 가설 수립 → 코드 경로 추적 → 최소 재현 케이스
3. **cross-check** skill — CSS↔Skia 정합 재검증 (C 그룹 실패 시)
4. **schema 불일치** → Phase B 발신/수신 경로 grep 재확인
5. **canonical resolver 누락** → Phase C `usePageManager` 연결 경로 재추적
6. **필요 시** Phase B 또는 C 의 변경 단독 rollback 후 재검증

---

## Phase D 완결 기준 + 다음 단계

### 완결 기준

- 12 case 전원 PASS (B-2 는 P3-D-1 머지 후)
- RC-1~5 전원 PASS
- `pnpm type-check` + `pnpm test --run` 전수 PASS

### 완결 시 수행

```bash
# 1. ADR-903 진행도 갱신
# docs/adr/design/903-phase3d-runtime-breakdown.md 의 HEAD + 상태 업데이트
# ADR-903 본문의 Status 섹션 갱신 (~88% → ~98%)

# 2. CHANGELOG 반영 (Phase D 완결 트리거)
# docs/CHANGELOG.md 에 "ADR-903 P3-D-4 Phase D — Chrome MCP 통합 검증 완결" 항목 추가

# 3. Phase D 완결 commit
git add -p
git commit -m "feat(adr-903): P3-D-4 Phase D GREEN — Chrome MCP 통합 검증 완결"
```

---

## 관련 문서

| 문서                                                                                             | 설명                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| [903-phase3d-runtime-breakdown.md](903-phase3d-runtime-breakdown.md)                             | P3-D 전체 설계                      |
| [903-phase3-frameset-breakdown.md](903-phase3-frameset-breakdown.md)                             | P3 통합 breakdown                   |
| [903-canonical-examples.md](903-canonical-examples.md)                                           | canonical document 예시             |
| [`feedback-chrome-mcp-patterns.md`](.claude/projects/.../memory/feedback-chrome-mcp-patterns.md) | Chrome MCP 도구 패턴 (세션 16 확립) |
