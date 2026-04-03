/**
 * 여러 Spec에서 공유하는 PropertySchema 섹션/필드 정의
 */
import { Search, Filter, Contrast } from "lucide-react";
import type { SectionDef, FieldDef } from "../types";

/** staticColor 필드 — Button, ToggleButton, ProgressBar, Meter 공용 */
export const STATIC_COLOR_FIELD: FieldDef = {
  key: "staticColor",
  type: "enum",
  label: "Static Color",
  icon: Contrast,
  emptyToUndefined: true,
  options: [
    { value: "", label: "Auto" },
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
  ],
};

/** Filtering 섹션 — ListBox, GridList 등 컬렉션 컴포넌트 공용 */
export const FILTERING_SECTION: SectionDef = {
  title: "Filtering",
  icon: Search,
  fields: [
    {
      key: "filterText",
      type: "string",
      label: "Filter Text",
      icon: Search,
      placeholder: "Search...",
      emptyToUndefined: true,
    },
    {
      key: "filterFields",
      type: "string-array",
      label: "Filter Fields",
      icon: Filter,
      placeholder: "label, name, title",
    },
  ],
};
