# Changelog Rule

`docs/CHANGELOG.md`는 사용자-가시 변경의 SSOT입니다. 상세 포맷과 drift
이력은 legacy `.claude/rules/changelog.md`를 필요할 때만 확인합니다.

## 업데이트 Trigger

아래 중 하나라도 해당하면 같은 커밋 또는 바로 다음 커밋에 반영합니다.

- ADR Status `Accepted` 또는 `Proposed`에서 `Implemented`로 승격
- 사용자-가시 버그 수정: UI, 렌더, 입력, 저장, publish 동작
- 신규 컴포넌트, 신규 prop, public API, spec schema 변경
- 3개 이상 파일에 걸친 같은 주제의 아키텍처 변경
- Breaking Change
- 성능 회귀 수정 또는 측정값이 의미 있게 바뀐 변경
- Phase 다단계 작업의 최종 완료

## 면제

- typo, 주석, 내부 리팩터, 테스트만, stats 파일, hook 설정 튜닝은 면제될 수
  있습니다. 면제 시 커밋 메시지에 `internal, no user-visible change` 성격을
  명시합니다.

## 포맷 요약

- 헤더: `## [한글 제목 — 기술 요약] - YYYY-MM-DD`
- 섹션 순서: Breaking Changes → Bug Fixes → Features → Architecture →
  Performance → Documentation → Infrastructure
- ADR 항목은 ADR 번호와 Phase를 명시합니다.
- 버그 수정은 가능하면 `Why:`를 포함합니다.
- `v1.2.3` 같은 version header는 사용하지 않습니다.

## Drift 점검

첫 커밋 작업 전 최신 changelog entry 날짜를 확인합니다. 14일 또는 100커밋을
초과한 drift가 보이면 새 항목을 추가하기 전에 catch-up 블록 필요 여부를
사용자에게 제안합니다.
