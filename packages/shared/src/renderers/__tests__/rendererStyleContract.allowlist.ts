/**
 * Renderer style contract allowlist — ADR-907 Phase 2 Layer C
 *
 * 11 주대상 collection/self-render renderer 의 root `style={element.props.style}`
 * 전달 여부 추적용 allowlist. allowlist 에 등록된 컴포넌트는 contract test 에서
 * skip 된다.
 *
 * **현재 상태: 빈 Set — 11/11 컴포넌트 전원 (a) O 달성** (ADR-907 Phase 5 완료).
 *
 * 진행 이력:
 *   - Phase 0 실측: (a) O 8 (ListBox/Menu/ComboBox/Select/Tree/Tabs/Toolbar/Breadcrumbs) / (a) X 3 (GridList/TagGroup/Table)
 *   - Phase 3 MVP: GridList 제거 (renderGridList root style 전달)
 *   - Phase 5: TagGroup/Table 제거 — renderTagGroup/renderTable root style 전달 + 각 컴포넌트 wrapper root div 에 style 병합
 *
 * allowlist 가 빈 Set 인 상태는 ADR-907 G3~G6 의 renderer contract Gate 가 완전히
 * 충족됐음을 의미한다. 신규 collection renderer 추가 시 contract test 에 RENDERERS
 * 배열 추가만으로 동일 Gate 가 자동 적용된다 (별도 추가 없이).
 */

export const rendererStyleContractAllowlist: ReadonlySet<string> =
  new Set<string>();
