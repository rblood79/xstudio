/**
 * Builder SearchField
 *
 * 빌더 UI 전용 검색 필드 (패널 상단 필터링용)
 * React Aria SearchField 기반, 패널 경계에 맞는 flat 디자인
 */

import { forwardRef } from "react";
import {
  Button,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from "react-aria-components";
import { getIconData } from "@xstudio/specs";
import "./SearchField.css";

const SEARCH_ICON = getIconData("search");
const CLEAR_ICON = getIconData("x");

function LucideIcon({
  data,
}: {
  data: NonNullable<ReturnType<typeof getIconData>>;
}) {
  return (
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
      {data.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {data.circles?.map((c, i) => (
        <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
    </svg>
  );
}

export interface SearchFieldProps extends Omit<
  AriaSearchFieldProps,
  "className"
> {
  placeholder?: string;
  className?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ placeholder, className, ...props }, ref) {
    return (
      <AriaSearchField
        {...props}
        className={
          className
            ? `builder-search-field ${className}`
            : "builder-search-field"
        }
      >
        <Input ref={ref} placeholder={placeholder} />
        <Button>{CLEAR_ICON && <LucideIcon data={CLEAR_ICON} />}</Button>
        {SEARCH_ICON && (
          <span className="builder-search-icon" aria-hidden="true">
            <LucideIcon data={SEARCH_ICON} />
          </span>
        )}
      </AriaSearchField>
    );
  },
);
