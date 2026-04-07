---
name: 테스트 인프라 현황
description: Vitest 설정, skia/__tests__ mock 패턴, 알려진 주의사항
type: project
---

## 테스트 러너

- Vitest v4.0.18, `npx vitest run <파일경로>` (apps/builder cwd)

## skia/**tests** mock 필수 목록

StoreRenderBridge 및 skia 관련 테스트 파일에서 공통으로 필요한 mock:

| 모듈                       | 이유                                       |
| -------------------------- | ------------------------------------------ |
| `../fontManager`           | window 없는 환경에서 폰트 로딩 차단        |
| `@xstudio/specs`           | Spec 객체 import 차단 (WASM 의존)          |
| `../../sprites/tagSpecMap` | TAG_SPEC_MAP / TEXT_TAGS / IMAGE_TAGS 제공 |
| `../buildSpecNodeData`     | Spec 렌더링 경로 차단                      |
| `../imageCache`            | 비동기 이미지 로딩 차단                    |
| `../useSkiaNode`           | skiaNodeRegistry 글로벌 상태 격리          |
| `../layout`                | onLayoutPublished 구독 차단                |

## @xstudio/specs mock 패턴 (CRITICAL)

단순 객체 mock 사용 시 "No X export is defined" 에러 발생.
**반드시 importOriginal 패턴 사용**:

```typescript
vi.mock("@xstudio/specs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xstudio/specs")>();
  return {
    ...actual,
    // 오버라이드 필요한 항목만
  };
});
```

**Why:** `@xstudio/specs`는 ButtonSpec, LabelSpec 등 수십 개 export를 가지며,
다른 모듈(specTextStyle.ts, utils.ts 등)이 이를 직접 import함.
단순 mock 시 사용되는 export가 없다는 에러가 chain으로 전파됨.

## triggerTransitions 테스트 패턴

`StoreRenderBridge.triggerTransitions()`는 private 메서드 → 직접 호출 불가.
대신 `bridge.sync(prevMap)` → `bridge.sync(nextMap)` 2-step으로 간접 트리거:

1. 첫 번째 sync: prevElementsMap 설정 (fullRebuild)
2. 두 번째 sync: 새 Map 참조 → 증분 갱신 → triggerTransitions 호출

Map 참조가 같으면 "변경 없음"으로 처리되므로 반드시 **새 Map 인스턴스** 생성 필요.

## parseTransitionShorthand export

`StoreRenderBridge.ts`의 `parseTransitionShorthand`는 원래 module-private.
테스트를 위해 `export function`으로 변경됨 (커밋 88a0f8c2).
