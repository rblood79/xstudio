# ADR-903 옵션C `resolveCanonicalDocument` 빈 배열 반환 — Root Cause 분석

**진단일**: 2026-04-25  
**상태**: Fix 적용 완료 (검증 대기)  
**관련 파일**: `apps/builder/src/resolvers/canonical/index.ts`

---

## 증상

`?canonical=1` 활성화 시 콘솔에 아래 두 로그가 동시 출력:

```
App.tsx:840 [ADR-903 옵션C] canonical 노드 없음 — legacy fallback
  { currentPageId: '18a85096-...', resolvedCount: 0 }

App.tsx:157 [ADR-903 P2] canonical resolve
  { document: { children: N, ... }, resolved: { rootCount: N } }
```

DOM: `data-canonical-id` 0건, `data-legacy-uuid` 0건 — canonical 경로 미진입.

---

## 조사 경로

### 1단계: resolved.length === 0 의미 분석

App.tsx:840 에서 `resolvedCount: resolved.length` 이므로, `resolved` = `resolveCanonicalDocument(doc)` 의 반환 배열 자체가 0이어야 합니다.

`resolveCanonicalDocument` = `doc.children.map(...)` → doc.children이 0개여야 하거나, **page filter가 0개**를 통과시켜야 합니다.

실제로는 후자입니다. `resolvedCount`는 840번줄에서 `resolved.length`를 나타내고, 830번줄의 `pageNodes = resolved.filter(...)` 후 `pageNodes.length === 0`이면 839번줄 warn이 `resolvedCount: resolved.length`를 출력합니다.

따라서 `resolved.length > 0`이지만 **page filter를 통과하는 노드가 0개**인 상황입니다.

### 2단계: page filter 분석

```javascript
// App.tsx:830-836
const pageNodes = resolved.filter((node) => {
  const meta = node.metadata as Record<string, unknown> | undefined;
  const isPage = meta?.type === "page" || meta?.type === "legacy-page";
  if (!isPage) return false;
  if (!currentPageId) return true;
  return meta?.pageId === currentPageId;
});
```

layout이 있는 page는 `convertPageLayout`에 의해 `RefNode`로 변환됩니다:

- `refNode.metadata.type = "legacy-page"`
- `refNode.metadata.pageId = page.id`

### 3단계: `_resolveRefNodeUncached` metadata 덮어쓰기 버그

**[root cause]** `_resolveRefNodeUncached` 에서 `resolvedBase.metadata` 구성:

```javascript
// 수정 전 (buggy)
metadata: {
  ...resolvedProps,
  type: (master.metadata?.type as string | undefined) ?? "legacy-element-props",
}
```

layout이 있는 page를 resolve할 때:

- `master` = layout frame (`master.metadata.type = "legacy-layout"`)
- `refNode` = page ref (`refNode.metadata.type = "legacy-page"`, `pageId = page.id`)
- **결과**: `resolvedBase.metadata.type = "legacy-layout"` ← master type으로 덮어씌워짐
- **결과**: `refNode.metadata.pageId` 소실 (`...resolvedProps`에 없음)

page filter: `meta?.type === "legacy-layout"` → `false` → **모든 layout-page 노드 skip**

### 4단계: 단위 테스트 vs prod 불일치 원인

`integration.test.ts` TC2는 이 시나리오(layout + page)를 테스트하지만, 결과 검증을 `_resolvedFrom === "layout-L1"` 기준으로 하고 `metadata.type`을 확인하지 않아서 PASS했습니다. App.tsx의 page filter 로직(`metadata.type === "legacy-page"`)은 테스트에 포함되지 않았습니다.

---

## Root Cause

`apps/builder/src/resolvers/canonical/index.ts:138-142` (수정 전):

```javascript
metadata: {
  ...resolvedProps,   // resolvedProps = mergePropsWithStyleDeep(masterProps, instanceOverrides)
                      // → legacyProps 이지, pageId/type 같은 instance metadata 아님
  type: (master.metadata?.type as string | undefined) ?? "legacy-element-props",
  // refNode.metadata 의 type, pageId, slug, layoutId 등이 전부 소실됨
}
```

instance(refNode)의 metadata(`type: "legacy-page"`, `pageId`, `slug`, `layoutId`)를 master metadata로 덮어쓰는 것이 버그의 핵심입니다.

---

## Fix

`apps/builder/src/resolvers/canonical/index.ts:147-160` (수정 후):

```javascript
metadata: {
  // refNode 의 instance-level metadata 를 base 로 (page 식별자 등 보존)
  ...refNode.metadata,
  // master 의 element props 는 별도 키로 보존
  masterType: master.metadata?.type,
  masterLegacyProps: master.metadata?.legacyProps,
  // resolved props (master + instance override merge)
  legacyProps: resolvedProps,
  // type 결정: refNode 우선 → master fallback
  type:
    (refNode.metadata?.type as string | undefined) ??
    (master.metadata?.type as string | undefined) ??
    "legacy-element-props",
}
```

**핵심 변경**: `...refNode.metadata` 를 base로 spread 하여 `type`, `pageId`, `slug`, `layoutId` 등 instance 식별 필드를 모두 보존. master의 정보는 `masterType`, `masterLegacyProps` 별도 키로 보존.

---

## Reproduction Steps

1. `?canonical=1` 파라미터로 Preview 접속
2. layout이 할당된 page 확인
3. Console에서 `[ADR-903 옵션C] canonical 노드 없음` 확인

Fix 적용 후:

1. `resolved.filter(...)` 에서 `meta.type === "legacy-page"` 판정 성공
2. `meta.pageId === currentPageId` 판정 성공
3. canonical 경로 진입, `data-canonical-id` DOM 마커 생성

---

## 회귀 테스트 추가 권고

`integration.test.ts` 에 TC2-b 추가:

```typescript
it("TC2-b: layout + page resolve 후 pageId/type metadata 보존 확인 (page filter 시나리오)", () => {
  // TC2와 동일 setup
  const resolved = resolveCanonicalDocument(doc);
  const pageNode = resolved.find((n) => {
    const meta = n.metadata as Record<string, unknown> | undefined;
    return meta?.type === "legacy-page" && meta?.pageId === "P1";
  });
  expect(pageNode).toBeDefined();
  expect((pageNode?.metadata as Record<string, unknown>)?.pageId).toBe("P1");
});
```

---

## 관련 파일

- `apps/builder/src/resolvers/canonical/index.ts` — fix 적용 위치
- `apps/builder/src/preview/App.tsx:830-836` — page filter 로직
- `apps/builder/src/adapters/canonical/slotAndLayoutAdapter.ts:117-131` — convertPageLayout (RefNode 생성)
- `apps/builder/src/resolvers/canonical/__tests__/integration.test.ts:148-151` — TC2 (metadata.type 미검증)
