---
applyTo: "**/*.{tsx,jsx}"
---
# React / RAC
- React Aria Components(RAC) 사용, 접근성(ARIA, role, keyboard) 필수.
- 컴포넌트는 의미 클래스(`primary`, `outline`, `sm`) 기반, 인라인 유틸 금지.
- variants 정의는 tv()로만 처리.
- 새 컴포넌트: *.tsx + *.stories.tsx + *.test.tsx 3파일 세트 생성.
- TanStack Table 셀 편집기: 입력/검증/상태를 분리.