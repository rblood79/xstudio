---
name: Spec shapes TokenRef as unknown as number 캐스팅
description: Spec shapes() 내에서 TokenRef를 resolveToken() 없이 as unknown as number 강제 캐스팅
type: feedback
---

## 패턴

```typescript
// 위반
fontSize: size.fontSize as unknown as number,
radius: size.borderRadius as unknown as number,

// 올바른 방법
fontSize: resolveToken(size.fontSize) as number,
radius: resolveToken(size.borderRadius) as number,
```

`size.fontSize`가 `"{typography.text-sm}"` TokenRef 문자열일 때 캐스팅하면 Skia에 문자열이 전달됨 → fontSize NaN, borderRadius 0 fallback.

**Why:** SKILL.md CRITICAL 규칙 — shapes 내 숫자 연산에 TokenRef 직접 사용 금지, resolveToken() 변환 필수.

**How to apply:** Spec shapes() 함수 내 `size.*` 또는 `variant.*` 참조 시 타입이 TokenRef일 가능성 있으면 반드시 resolveToken() 확인.

발견일: 2026-03-27 (ActionMenu.spec.ts, composition-review-diff2.txt)
