# Skills 카탈로그 (composition)

자연어 트리거와 `/` 명령 양쪽으로 발동 가능. 최근 30일 사용 빈도는 2026-04-13 기준.

## composition 전용 (프로젝트)

| Skill                                                 | 용도                              | 발동 키워드                            | 30일 사용 | 권장 시점           |
| ----------------------------------------------------- | --------------------------------- | -------------------------------------- | --------: | ------------------- |
| [composition-patterns](composition-patterns/SKILL.md) | 코드 규칙/패턴 인덱스             | "패턴", "규칙", "컨벤션"               |         3 | 코드 작업 전        |
| [cross-check](cross-check/SKILL.md)                   | CSS↔Skia 렌더링 정합성            | "정합성", "cross check", "렌더링 체크" |         3 | 렌더링 수정 후 필수 |
| [parallel-verify](parallel-verify/SKILL.md)           | 패밀리 일괄 검증                  | "전체 검증", "일괄", "패밀리"          |         0 | 컴포넌트 5+개 변경  |
| [component-design](component-design/SKILL.md)         | 새 컴포넌트 설계 워크플로         | "새 컴포넌트", "S2 전환"               |         0 | 새 컴포넌트 생성 시 |
| [create-adr](create-adr/SKILL.md)                     | ADR 생성 (번호 자동 + Risk-First) | "ADR 생성"                             |         0 | 아키텍처 결정       |
| [review-adr](review-adr/SKILL.md)                     | ADR 검증                          | "ADR 리뷰"                             |         1 | ADR 작성 후         |
| [react-aria](react-aria/SKILL.md)                     | React Aria API 레퍼런스           | "react-aria"                           |         0 | UI 컴포넌트 구현    |
| [react-spectrum](react-spectrum/SKILL.md)             | Spectrum Props 레퍼런스           | "spectrum", "S2 props"                 |         1 | Spec props 설계     |

## Superpowers (프로세스)

| Skill                          | 용도                       | 30일 사용 |
| ------------------------------ | -------------------------- | --------: |
| brainstorming                  | 요구사항/설계 탐색         |         0 |
| writing-plans                  | 다단계 계획                |         0 |
| executing-plans                | 계획 실행                  |         1 |
| systematic-debugging           | 버그 root-cause 4단계      |         1 |
| test-driven-development        | RED-GREEN-REFACTOR         |         0 |
| verification-before-completion | 완료 직전 evidence 검증    |         0 |
| requesting-code-review         | PR 전 리뷰 요청            |         0 |
| receiving-code-review          | 리뷰 피드백 처리           |         0 |
| using-git-worktrees            | 격리된 작업 공간           |         0 |
| dispatching-parallel-agents    | 2+ 독립 작업 병렬          |         0 |
| subagent-driven-development    | 계획을 서브에이전트로 실행 |         0 |
| finishing-a-development-branch | 머지 전 정리               |         0 |
| writing-skills                 | 새 skill 작성              |         0 |

## 커버리지 목표

- 현재: 9/30 (30%)
- 2주 후 목표: ≥ 60% (18/30)
- 미사용 핵심 3종: `brainstorming`, `writing-plans`, `verification-before-completion`
- UserPromptSubmit hook(`route-prompt.sh`)이 키워드 기반으로 자동 힌트 주입
