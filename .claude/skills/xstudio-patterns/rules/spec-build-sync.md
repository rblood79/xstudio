---
title: "@xstudio/specs 빌드 동기화"
impact: CRITICAL
impactDescription: dist/ 미갱신 시 소비자(Builder)가 구 버전 참조하여 WebGL/CSS 렌더링 불일치 발생
tags: [spec, build, monorepo]
---

`@xstudio/specs`는 tsup으로 빌드되어 `dist/`를 통해 export됩니다. **소스 수정 후 반드시 빌드를 실행**해야 합니다.

## Incorrect

```bash
# ❌ specs 소스만 수정하고 빌드 생략
# packages/specs/src/components/Button.spec.ts 수정
# → dist/는 이전 값 유지 → Builder가 구 값 참조
pnpm typecheck  # 타입 체크만으로는 dist/ 갱신 안됨
```

## Correct

```bash
# ✅ specs 소스 수정 후 반드시 빌드
pnpm --filter @xstudio/specs build

# 또는 개발 중 watch 모드 사용
pnpm --filter @xstudio/specs dev
```

## 실제 버그 사례

- **증상**: 버튼 간 공백 발생 (button_width + gap = CSS button width)
- **원인**: ButtonSpec paddingX 수정 후 dist/ 미빌드 → layout engine(새 값) vs PixiButton(구 값) 불일치
- **해결**: `pnpm --filter @xstudio/specs build` 실행

## 참조

- `packages/specs/package.json` — `"main": "./dist/index.js"`
- `docs/COMPONENT_SPEC_ARCHITECTURE.md` §4.7.4.0
