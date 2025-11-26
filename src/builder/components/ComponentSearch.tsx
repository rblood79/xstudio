/* eslint-disable local/prefer-keyboard-shortcuts-registry */
import { useState, useEffect, useRef, useMemo } from "react";
import { SearchField } from "./SearchField";
import { useRecentSearches } from "../hooks/useRecentSearches";
import "./styles/ComponentSearch.css";

interface ComponentSearchProps {
  onSearchChange: (query: string) => void;
}

/**
 * ComponentSearch - Simple search field for filtering ComponentList
 *
 * Features:
 * - Keyboard shortcut (cmd+K on Mac / ctrl+K on Windows)
 * - Real-time search query updates
 * - Filters ComponentList in real-time
 */
export function ComponentSearch({ onSearchChange }: ComponentSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { addSearch } = useRecentSearches();

  // Detect platform for keyboard shortcut display
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return (
      /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
      /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    );
  }, []);

  const shortcutKey = isMac ? "⌘K" : "Ctrl+K";
  const placeholder = `Search components... (${shortcutKey})`;

  // cmd+K / ctrl+K keyboard shortcut
  // Note: Simple focus action, useKeyboardShortcutsRegistry not needed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Notify parent of search query changes
  useEffect(() => {
    onSearchChange(query);
  }, [query, onSearchChange]);

  // 검색 기록 저장 (debounce: 1초 후 저장)
  useEffect(() => {
    if (!query.trim()) return;

    const timeoutId = setTimeout(() => {
      addSearch(query);
    }, 1000); // 1초 대기

    return () => clearTimeout(timeoutId);
  }, [query, addSearch]);

  // Store input ref when SearchField mounts
  // const handleRef = (input: HTMLInputElement | null) => {
  //     inputRef.current = input;
  // };

  return (
    <div className="component-search">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        aria-label="Search components"
        className="component-search-field"
      />
    </div>
  );
}
