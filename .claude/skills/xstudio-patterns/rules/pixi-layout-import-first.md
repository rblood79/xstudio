---
title: "[DEPRECATED] Import @pixi/layout Before Other PIXI Modules"
impact: CRITICAL
impactDescription: "폐기됨 — Phase 11에서 @pixi/layout 완전 제거"
tags: [pixi, layout, import, deprecated]
---

> **⚠️ 이 규칙은 폐기되었습니다 (2026-02-18).**
>
> Phase 11에서 `@pixi/layout`과 `yoga-layout` 패키지가 완전히 제거되었습니다.
> 현재 레이아웃은 Taffy WASM (Flex/Grid) + Dropflow Fork (Block) 엔진이 담당하며,
> PixiJS는 `DirectContainer`로 엔진 결과를 직접 배치하는 이벤트 전용 레이어입니다.
>
> **대체 규칙:** [pixi-hybrid-layout-engine](pixi-hybrid-layout-engine.md) 참조
>
> **관련 문서:** [ADR-003](../../../../docs/adr/003-canvas-rendering.md), [ENGINE_UPGRADE.md](../../../../docs/ENGINE_UPGRADE.md)

---

## 이전 규칙 (기록 목적)

`@pixi/layout`을 다른 PIXI 모듈보다 먼저 import합니다.

이 규칙은 `@pixi/layout`이 PixiJS의 `Container`/`Sprite` 등을 프로토타입 패치하여
`style`/`layout` prop을 주입하는 방식이었기 때문에 필요했습니다.
Phase 11에서 `@pixi/layout`이 제거되면서 이 패턴 자체가 소멸되었습니다.
