/**
 * Field Container Delegation Variables
 *
 * Select, ComboBox 등 field 컨테이너의 공유 delegation 변수.
 * childSelector만 컴포넌트별로 다르고 variables는 동일.
 */

/** Select/ComboBox 트리거 컨테이너의 size별 CSS 변수 */
export const FIELD_TRIGGER_VARIABLES: Record<string, Record<string, string>> = {
  xs: {
    height: "auto",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border-hover)",
    padding: "1px 1px 1px 4px",
    "font-size": "var(--text-2xs)",
  },
  sm: {
    height: "auto",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border-hover)",
    padding: "2px 2px 2px 8px",
    "font-size": "var(--text-xs)",
  },
  md: {
    height: "auto",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border-hover)",
    padding: "4px 4px 4px 12px",
    "font-size": "var(--text-sm)",
  },
  lg: {
    height: "auto",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border-hover)",
    padding: "8px 8px 8px 16px",
    "font-size": "var(--text-base)",
  },
  xl: {
    height: "auto",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border-hover)",
    padding: "12px 12px 12px 24px",
    "font-size": "var(--text-lg)",
  },
};

/** size별 height: auto 전용 (SelectValue, ComboBoxInput 등) */
export const FIELD_AUTO_HEIGHT_VARIABLES: Record<
  string,
  Record<string, string>
> = {
  xs: { height: "auto" },
  sm: { height: "auto" },
  md: { height: "auto" },
  lg: { height: "auto" },
  xl: { height: "auto" },
};
