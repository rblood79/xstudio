# Reviewer Agent Memory

## 리뷰 빈출 이슈 패턴

(코드 리뷰에서 반복적으로 발견되는 이슈 패턴을 기록)

## False Positive 기록

(잘못된 지적으로 판명된 케이스 — 향후 동일 패턴에서 불필요한 지적 방지)

## 프로젝트 컨벤션 예외

- Builder 아이콘 버튼: 공유 `Button variant="ghost"` 대신 `ActionIconButton` 사용
- Canvas 관련 코드: DirectContainer 패턴 필수 (엔진 결과 직접 배치)
- field 컴포넌트: 입력 영역 배경 `--bg-inset` / `{color.layer-2}` 통일
