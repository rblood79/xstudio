# Repository Guidelines

XStudio 협업을 위한 간단한 가이드입니다. 변경은 작게, 관측 가능하게, 기존 패턴에 맞춰 진행하세요.

## Project Structure & Module Organization
- `src/builder`: 핵심 빌더 UI(패널, 인스펙터, 캔버스 브리지). Zustand 스토어는 `src/builder/stores`, 유틸은 `src/builder/stores/utils`.
- `src/canvas`: iframe 런타임. 격리 유지 후 postMessage로만 동기화.
- `src/dashboard`, `src/services`(API/save), `src/types`, `src/utils`: 공용 UI·데이터 계층. 정적 자산은 `public`.
- `docs/`(아키텍처·CSS·Supabase 문서), `supabase/`(백엔드 설정), `scripts/`(헬퍼). `dist/`는 수정 금지.

## Build, Test, and Development Commands
- `npm run dev`: Vite 개발 서버.
- `npm run build`: `tsc -b` + Vite 프로덕션 빌드.
- `npm run build:preview` / `npm run build:all`: 프리뷰 빌드만 또는 프리뷰+메인 빌드.
- 도구 실행 전 항상 `mise hook-env` 로 환경 셔임을 활성화하세요.
- `npm run lint`: ESLint + 로컬 안티패턴 룰(Zustand 셀렉터, 단축키 레지스트리, 이벤트 import).
- `npm run test`, `npm run test:coverage`: Vitest 및 커버리지. Playwright는 `npm run playwright:install` 후 `npx playwright test`.
- `npm run storybook`, `npm run build-storybook`: 컴포넌트 문서 dev/prod.

## Coding Style & Naming Conventions
- TypeScript + React 19 함수 컴포넌트, 2칸 들여쓰기, 네임드 익스포트 선호. 훅은 `use*`, 컴포넌트는 PascalCase `.tsx`.
- `src/builder/styles`의 ITCSS/Tailwind 4 레이어를 따르고 토큰 우선 사용. 캔버스 런타임 스타일은 스코프 제한.
- 상태는 기존 Zustand 모듈 재사용; ESLint 로컬 룰에 따라 그룹 셀렉터·`useShallow` 금지.
- 로그/콘솔 최소화, 서비스 계층에서 구조화된 오류 사용.

## Testing Guidelines
- 모듈 옆에 Vitest 스펙을 추가/수정; 빌더 패널·캔버스 동기화 변경 시 스토어 동작과 UI 계약을 검증.
- PR 전 `npm run test`와 `npm run lint` 실행, 위험한 리팩터는 `npm run test:coverage`.
- 플로우 변경 시 Playwright E2E를 추가/업데이트; 생략 시 재현 단계를 PR에 남김.

## Commit & Pull Request Guidelines
- 커밋 메시지: `type: summary` (예: `feat: add layout spacing presets`, `fix: guard canvas postMessage origin`). 범위를 작게 유지.
- PR: 요약, 연결된 이슈, UI 변경 스크린샷/영상, 실행한 테스트(`lint`, `test`, `coverage`, Playwright 여부) 명시.
- 깨지는 변경이나 설정(.env, Supabase) 요구 시 PR 본문에 명확히 표시.

## Security & Configuration Notes
- 비밀 값은 `.env.local`에만 저장·커밋 금지. `README.md` 예시(Supabase URL/anon key, API URL)와 일치 확인.
- Supabase 스키마: `docs/supabase-schema.md`, `supabase/`. API 기대치를 바꾸기 전 마이그레이션 협의.
- 큰 변경 전 `CLAUDE.md`를 참고해 아키텍처 제약과 선호 패턴을 확인.
