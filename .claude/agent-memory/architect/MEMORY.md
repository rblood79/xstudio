# Architect Agent Memory

## 설계 결정 이력

- ADR 목록은 `docs/adr/README.md` 참조
- Risk-First Design Loop 적용 중 (Step 1~6)

## 알려진 아키텍처 제약

- Canvas FPS 60fps, 초기 로드 < 3초, 번들 < 500KB
- Builder ↔ Preview iframe 격리 필수 (postMessage Delta 동기화)
- 이중 렌더러: Skia(시각) + PixiJS(이벤트) 동기화 필수

## 외부 리서치 결과

(아직 없음 — 설계 리서치 수행 시 핵심 발견을 여기에 기록)
