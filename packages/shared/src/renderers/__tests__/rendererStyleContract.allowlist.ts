/**
 * Renderer style contract allowlist — ADR-907 Phase 2 Layer C
 *
 * 11 주대상 collection/self-render renderer 중 현재 root 에
 * `style={element.props.style}` 를 전달하지 **않는** 컴포넌트를 일시 허용한다.
 *
 * Phase 0 실측 (ADR-907 breakdown 의 (a) Preview style 전달 행) 기준:
 *   - (a) O 8 컴포넌트: ListBox, Menu, ComboBox, Select, Tree, Tabs, Toolbar, Breadcrumbs
 *   - (a) X 3 컴포넌트: GridList, TagGroup, Table  ← 본 allowlist
 *
 * Phase 3 (GridList pilot) / Phase 4 (follow-up ADR-908~915) / Phase 5 (Table audit)
 * 에서 해당 컴포넌트 renderer 에 `style={element.props.style}` 를 추가한 뒤
 * 본 allowlist 에서 제거한다. allowlist 가 빈 Set 이 되면 ADR-907 G3~G6 의
 * renderer contract Gate 가 완전히 충족된 상태.
 *
 * allowlist 에 있는 컴포넌트는 renderer contract test 에서 skip 되므로
 * 다른 회귀를 차단하지 않는다.
 */

export const rendererStyleContractAllowlist: ReadonlySet<string> = new Set([
  "GridList", // ADR-907 Phase 3 pilot 에서 제거 예정
  "TagGroup", // ADR-907 Phase 4 Profile Y follow-up ADR 에서 제거 예정
  "Table", //    ADR-907 Phase 5 audit (Layer C (a) 선반영 가능) 에서 제거 예정
]);
