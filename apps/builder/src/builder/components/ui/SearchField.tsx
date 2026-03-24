/**
 * Builder SearchField
 *
 * 빌더 UI 전용 검색 필드 (패널 상단 필터링용)
 * React Aria SearchField 기반, 패널 경계에 맞는 flat 디자인
 */

import {
  Button,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from "react-aria-components";
import { getIconData } from "@xstudio/specs";
import "./SearchField.css";

export interface SearchFieldProps extends Omit<
  AriaSearchFieldProps,
  "className"
> {
  placeholder?: string;
  className?: string;
}

export function SearchField({
  placeholder,
  className,
  ...props
}: SearchFieldProps) {
  const searchIconData = getIconData("search");
  const clearIconData = getIconData("x");

  return (
    <AriaSearchField
      {...props}
      className={
        className ? `builder-search-field ${className}` : "builder-search-field"
      }
    >
      <Input placeholder={placeholder} />
      <Button>
        {clearIconData && (
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {clearIconData.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
        )}
      </Button>
      {searchIconData && (
        <span className="builder-search-icon" aria-hidden="true">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {searchIconData.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
            {searchIconData.circles?.map((c, i) => (
              <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} />
            ))}
          </svg>
        </span>
      )}
    </AriaSearchField>
  );
}
