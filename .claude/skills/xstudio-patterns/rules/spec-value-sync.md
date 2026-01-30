---
title: "Spec ↔ Builder ↔ CSS 값 동기화"
impact: CRITICAL
impactDescription: 세 소스 간 값 불일치 시 WebGL/CSS 렌더링 차이 발생
tags: [spec, layout, sync]
---

컴포넌트 수치(padding, fontSize 등)는 **3곳에서 동일하게** 유지해야 합니다:
1. `@xstudio/specs` — ComponentSpec (예: `ButtonSpec.sizes.md.paddingX`)
2. Builder 내부 상수 (예: `BUTTON_SIZE_CONFIG`)
3. CSS 토큰 (예: `Button.css`의 `--spacing-*`)

## Incorrect

```typescript
// ❌ Spec과 Builder 상수 값 불일치
// packages/specs/src/components/Button.spec.ts
md: { paddingX: 24 }

// apps/builder/.../engines/utils.ts
md: { paddingLeft: 16, paddingRight: 16 }  // 불일치!
```

## Correct

```typescript
// ✅ 세 소스 동일한 값
// packages/specs/src/components/Button.spec.ts
md: { paddingX: 24 }

// apps/builder/.../engines/utils.ts
md: { paddingLeft: 24, paddingRight: 24 }  // 일치

// CSS: --spacing-xl = 24px  // 일치
```

## 체크리스트

값 수정 시 반드시 3곳 모두 확인:
- [ ] `packages/specs/src/components/[Component].spec.ts`
- [ ] `apps/builder/.../engines/utils.ts` (Builder 내부 상수)
- [ ] CSS 파일의 토큰/변수
- [ ] `pnpm --filter @xstudio/specs build` 실행

## 참조

- [spec-build-sync](spec-build-sync.md) — 빌드 동기화 필수
- `docs/COMPONENT_SPEC_ARCHITECTURE.md` §4.7.4.0
