# ADR-904 Breakdown: Fill SSOT + Preview/Publish 어댑터 전환

## 목표

- 저장 정본을 `fills`로 통일하되, Preview/Publish는 단계적으로 CSS 어댑터를 통해 소비한다.
- 기존 프로젝트 read-through 호환성과 undo/redo 정확도를 유지한다.

## Phase Plan

### Phase 0 — Baseline 계측

- 범위
  - 현재 Fill 편집 경로의 이벤트/히스토리/저장 payload 계측
  - Preview/Publish 시각 캡처 baseline 확보
- 산출
  - 회귀 비교용 golden 샘플 세트
  - 주요 리스크 목록(gradient/image/mesh, border 분리)

### Phase 1 — Read-through 표준화

- 범위
  - 로드시 `fills` 부재 문서에 대해 `ensureFills(backgroundColor)` 강제
  - `var(...)`, `$--token` 입력의 fallback 정책 문서화
- 산출
  - read-through 유닛 테스트
  - legacy 문서 호환성 리포트

### Phase 2 — Write-through 계약 강화

- 범위
  - Fill 편집 시 `fills` 저장 + CSS 파생 필드 동기화 일관성 보장
  - 드래그 프리뷰(lightweight)와 커밋 경로의 히스토리 무결성 검증
- 산출
  - inspectorActions 회귀 테스트
  - undo/redo 정확도 체크리스트

### Phase 3 — Consumer 책임 분리

- 범위
  - Builder(Skia): Fill 직접 소비를 정식 계약으로 문서화
  - Preview/Publish(DOM): 어댑터 소비 계약 명문화
  - Border는 Fill과 별도 채널로 유지
- 산출
  - consumer contract 문서
  - Fill vs Border 리뷰 룰

### Phase 4 — Feature Flag 롤아웃

- 범위
  - `VITE_FEATURE_FILL_V2` 기반 환경별 점진 배포
  - 오류율/회귀율 모니터링 대시보드 연결
- 산출
  - 배포 가이드
  - 롤백 플레이북

### Phase 5 — Legacy 축소

- 범위
  - 신규 문서 저장에서 CSS background 직렬화를 파생 필드로 한정
  - 레거시 직접 편집 경로 제거 후보 식별
- 산출
  - 레거시 축소 계획서
  - 후속 ADR 필요 항목(완전 제거 시점)

## 파일 영향 초안

- 핵심
  - `apps/builder/src/builder/stores/inspectorActions.ts`
  - `apps/builder/src/builder/panels/styles/utils/fillMigration.ts`
  - `apps/builder/src/types/builder/fill.types.ts`
  - `apps/builder/src/preview/utils/computedStyleExtractor.ts`
  - `apps/builder/src/utils/featureFlags.ts`
- 테스트/문서
  - fill migration 테스트 파일(신규)
  - preview/publish 회귀 기준 문서(신규)

## 검증 체크리스트

- [ ] legacy backgroundColor-only 문서 로드 성공률 100%
- [ ] Fill 편집 시 history undo/redo 회귀 0
- [ ] Preview/Publish 시각 골든 비교 회귀 0
- [ ] Fill/Border 경계 위반(혼합 저장) 정적 검사 또는 리뷰 룰 적용
- [ ] feature flag on/off 전환 시 치명 장애 0

## 오픈 이슈

1. 다중 Fill 레이어의 DOM CSS 완전 표현 범위를 어디까지 보장할지(특히 mesh-gradient).
2. Publish 산출물에서 adapter 결과를 사전 계산(cache)할지 런타임 계산할지.
3. Border fill(Stroke 확장) 도입 시점과 ADR 분리 여부.
