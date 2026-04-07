# composition — 개인 워크플로 설정 (gitignore)

## 개인 설정

- 선호 모델: Opus 4.6 (1M context)
- 응답 언어: 한국어 (코드/기술 용어 영어 유지)
- Effort: max

## 병렬 세션 패턴

### Worktree 병렬 작업

대규모 리팩토링이나 독립적 기능 개발 시:

```bash
# 세션 1: 기능 구현
claude --worktree feature-branch

# 세션 2: 리뷰 + 테스트
claude --worktree review-branch
```

### 일상 워크플로

| 상황        | 접근                                  | 스킬                               |
| ----------- | ------------------------------------- | ---------------------------------- |
| 한 줄 수정  | 직접 수정                             | 스킵                               |
| 버그 수정   | Debugging → Fix → cross-check         | systematic-debugging               |
| 새 컴포넌트 | Brainstorm → Plan → TDD → cross-check | brainstorming → writing-plans      |
| 리팩토링    | Plan → Parallel agents                | dispatching-parallel-agents        |
| 렌더링 수정 | Debug → Fix → /cross-check 필수       | systematic-debugging + cross-check |

## 자주 쓰는 명령

```bash
pnpm dev                    # 개발 서버
pnpm build:specs            # Spec 빌드
pnpm type-check             # 타입 체크
pnpm storybook              # Storybook
```

## 메모

- PostToolUse type-check 제거됨 → Stop hook만 type-check 실행 (매 편집마다 45s 대기 제거)
- 규칙 다이어트 적용: rules/ 파일은 원칙만, 상세는 skills/composition-patterns/reference/
