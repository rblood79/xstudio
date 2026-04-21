# Documenter Agent Memory

## docs/ 구조 규칙

- `docs/legacy/README.md` — 레거시 파일 인덱스 (테이블 형식, 카테고리별)
- 레거시 이동 시: 원본 파일을 리다이렉트(짧은 이동 안내)로 교체 + `docs/legacy/`에 내용 보존 + README.md 업데이트
- Bash 차단 시: git mv 불가 → Read + Write 방식으로 수동 이동

## 현재 docs/reference 문서 현황 (2026-03-03 기준)

- `WORKFLOW.md` → 레거시 이동 완료 (workflow/ 디렉토리 삭제됨, Phase 1~4 완료)
- `STRUCTURE_HOOKS.md` → 유효 (구조 일치, 완료 이력 문서)
- `STRUCTURE_STORE.md` → 유효 (canvasSettings.ts 등 구조 일치, 완료 이력 문서)
- `status/REACT_ARIA_1.13.md` → 레거시 이동 완료 (현재 버전 1.15.1)
- `status/STYLE_SYSTEM.md` → 레거시 이동 완료 (Phase 2~4 미구현 설계안)

## 레거시 판정 기준

1. 참조하는 코드/파일이 삭제된 경우 (workflow/, BuilderWorkflow.tsx 등)
2. 버전이 현재보다 2+ 낮은 라이브러리 업그레이드 계획
3. 핵심 파일이 미존재인 미완성 설계안
4. 모든 Phase 완료 + 구현 코드가 다른 곳에 존재하는 이력 문서

## 유지 기준

- 모든 Phase 완료 + 실제 코드 구조와 일치하는 완료 이력 문서
- 현재 코드베이스에 적용된 아키텍처 설명

## ADR 번호 할당 현황 (2026-04-21 기준)

- 마지막 사용 번호: ADR-102 (Proposed)
- 다음 사용 가능 번호: ADR-103
- 완료 76개 / 부분 완료 8개 / 미구현 13개 / 합계 97개
- **중요**: README.md 미구현 섹션 정리 패턴 — Implemented 상태로 전환된 항목은 완료 섹션으로 이동 필수. 미구현 섹션에는 순수 Proposed만 유지.
- ADR-079: 미구현 섹션 유지 (Proposed 2026-04-19 — ADR-078 post-fix workaround 4종 해체 대기)
- ADR-099: 미구현 섹션 유지 (Proposed 2026-04-21 — Phase 0 완료, P1~P6 대기)

## 주요 파일 경로

- legacy README: `/Users/admin/work/composition/docs/legacy/README.md`
- react-aria 버전: `pnpm-workspace.yaml` catalog → `react-aria-components: ^1.15.1`
- builder stores: `apps/builder/src/builder/stores/` (canvasSettings.ts 포함 22개 파일)
- app stores: `apps/builder/src/stores/` (uiStore.ts, themeStore.ts, settingsStore.ts, designKitStore.ts, index.ts)
