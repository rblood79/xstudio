# Refactorer Agent Memory

## 완료된 주요 리팩토링

- Monolithic Spec → Compositional Spec 전환 (2026-02-25)
- CSS 토큰 S2 + React Aria 리네이밍 (2026-03-08)
- `SPEC_RENDERS_ALL_TAGS` 완전 제거
- `removeElements(ids[])` 배치 삭제 도입 (2026-02-27)

## 리팩토링 시 주의 패턴

- **render call 업데이트 누락**: 컴포넌트 내부 `useStore` → 외부 props 전환 시 모든 render call 검색 필수
- **파이프라인 순서 보존**: Memory → Index → History → DB → Preview → Rebalance
- **public 인터페이스 보존**: 명시적 변경이 아니면 기존 API 유지

## 진행 중인 기술 부채

(리팩토링 대상으로 식별된 항목을 기록)
