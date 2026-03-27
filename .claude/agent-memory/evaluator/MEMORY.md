# Evaluator Memory

## 검증 환경

- dev: http://localhost:5173
- Storybook: http://localhost:6006
- Preview iframe: Builder 내부 자동 로드

## 검증 체크리스트

- Canvas 렌더링: Skia 트리 + PixiJS 이벤트 동기화 확인
- Preview 정합성: CSS Preview ↔ Canvas 크기/색상 일치
- 상태 파이프라인: Memory→Index→History→DB→Preview→Rebalance 순서
- 다크모드: themeVersion++ + notifyLayoutChange() 호출 여부
- 폰트: Google Fonts 로드 후 registryVersion++ 확인
