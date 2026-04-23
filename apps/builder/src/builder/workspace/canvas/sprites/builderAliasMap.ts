/**
 * builderAliasMap — Builder UI alias → 정본 Spec 매핑 (ADR-108 P0)
 *
 * packages/specs 의 `BASE_TAG_SPEC_MAP` (정본 102 entries) 에 존재하지 않는
 * Builder UI 전용 tag 들이 정본 spec 을 share 하도록 alias 계층을 분리 정의한다.
 *
 * 배경:
 *   - Canvas / Preview / Panel / Publish 4 consumer 가 `@composition/specs` 의
 *     정본 TAG_SPEC_MAP 을 공유하도록 ADR-108 P0 에서 통합.
 *   - Builder 는 Compositional Architecture 편의 상 ComboBox/SearchField 의 내부
 *     DOM slot 을 별도 tag 로 취급 (ComboBoxWrapper 등) — 이 tag 들은 RAC 공식
 *     구조 외 composition 고유 D3 element 이므로 정본 spec 이 존재하지 않는다.
 *   - 각 alias 는 대응되는 정본 spec 을 lookup 하여 동일 D3 시각 결과 산출.
 *
 * alias 정책 (ADR-108 r5 R2):
 *   - alias 자체는 `containerVariants` 보유 0 (CSS 미생성).
 *   - 정본 spec 의 variant 를 alias 가 share — Canvas/Panel 소비 시 alias → 정본
 *     spec lookup 후 `resolveContainerVariants` 호출.
 *
 * IMAGE_TAGS 와의 분리:
 *   - 본 파일은 "Spec 공유 alias" 만 정의 (BC 직렬화 tag 보존 목적).
 *   - 이미지 렌더링 대상 (Avatar/Logo/Thumbnail 등) 은 sprites/tagSpecMap.ts
 *     의 `IMAGE_TAGS` 유지.
 */

import type { ComponentSpec } from "@composition/specs";
import {
  SelectTriggerSpec,
  SelectValueSpec,
  SelectIconSpec,
  SwitcherSpec,
} from "@composition/specs";

/**
 * 8 진짜 alias — ADR-108 r5 P0 분류:
 *
 * ComboBox 계열 (3): ADR-101 Compositional Architecture 고유 element
 *   - ComboBoxWrapper → SelectTriggerSpec (field 컨테이너 시각)
 *   - ComboBoxInput   → SelectValueSpec   (값 표시 시각)
 *   - ComboBoxTrigger → SelectIconSpec    (chevron 아이콘 시각)
 *
 * SearchField 계열 (4): ADR-102 SelectIcon 4 tag 공유 정책
 *   - SearchFieldWrapper → SelectTriggerSpec
 *   - SearchInput        → SelectValueSpec
 *   - SearchIcon         → SelectIconSpec
 *   - SearchClearButton  → SelectIconSpec
 *
 * Switcher 호환 (1): Switcher 이름 변경 이전 tag (BC 보존)
 *   - TabBar → SwitcherSpec
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUILDER_ALIAS_MAP: Record<string, ComponentSpec<any>> = {
  ComboBoxWrapper: SelectTriggerSpec,
  ComboBoxInput: SelectValueSpec,
  ComboBoxTrigger: SelectIconSpec,
  SearchFieldWrapper: SelectTriggerSpec,
  SearchInput: SelectValueSpec,
  SearchIcon: SelectIconSpec,
  SearchClearButton: SelectIconSpec,
  TabBar: SwitcherSpec,
};
