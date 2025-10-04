# XStudio 전역 Copilot 지침

- 스택: React 19 + TypeScript + React Aria Components + Zustand + Tailwind v4 + Supabase JS v2
- 컴포넌트 스타일: Tailwind 인라인 유틸리티 금지, 의미 클래스 기반(`.primary`, `.outline`) 사용
- 데이터: Supabase RLS 기반, 서비스 모듈화 후 훅으로 연결
- 라우팅: React Router v7, Suspense 사용 가능
- 테스트: Vitest + RTL / Playwright (E2E)
- 문서화: Storybook CSF3 + Controls / Interactions
- 커밋: Conventional Commits 준수
- 보안: postMessage origin 검증 필수, env는 `import.meta.env`만 사용
- 스타일 관리: CSS 변수(`--color-*`, `--radius-*`, `--spacing-*`) 기반 토큰 시스템 유지