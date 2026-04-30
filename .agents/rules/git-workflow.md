# Git Workflow Rule

Codex용 Git 운영 entrypoint입니다. 상세 이력과 위반 사례가 필요할 때만
legacy `.claude/rules/git-workflow.md`를 확인합니다.

## 핵심 정책

- 사용자가 commit/push를 요청하면 기본 흐름은 `git commit` 후
  `git push origin main`입니다.
- branch 분기, web PR, `gh pr create`, PR URL 출력은 사용자가 명시적으로
  요청한 경우에만 수행합니다.
- worktree 작업은 worktree branch에 commit한 뒤 main worktree에서 merge하고
  `git push origin main`으로 통합합니다.
- main push가 차단되면 자동 branch 우회는 금지입니다. 사용자에게 권한/직접
  실행이 필요하다고 보고합니다.
- dirty worktree에서는 본인 변경과 사용자 변경을 구분하고, 무관한 변경을
  revert/format/stage하지 않습니다.

## 커밋 전 확인

- 변경 범위가 요청과 일치하는지 확인합니다.
- 사용자-가시 변경이면 `.agents/rules/changelog.md` trigger를 확인합니다.
- 보호 파일은 `pnpm run codex:guard -- <files>`로 점검합니다.
