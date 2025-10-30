import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ComboBox, ComboBoxItem } from './ComboBox';
import { Key } from 'react-aria-components';
import { useComponentSearch, Component } from '../hooks/useComponentSearch';
import { Search } from 'lucide-react';
import './styles/ComponentSearch.css';

interface ComponentSearchProps {
    components: Component[];
    onSelect: (tag: string, parentId?: string) => void;
    selectedElementId?: string | null;
}

/**
 * ComponentSearch - Fuzzy search for components using React Aria ComboBox
 *
 * Features:
 * - Fuzzy search with scoring algorithm
 * - Keyboard shortcut (cmd+K / ctrl+K)
 * - Empty state UI
 * - Controlled popover (opens/closes based on query)
 * - Focus management after selection
 * - Accessible with React Aria
 */
export function ComponentSearch({ components, onSelect, selectedElementId }: ComponentSearchProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const comboBoxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Use custom hook for fuzzy search logic
    const results = useComponentSearch(components, query);

    // Memoize items to prevent unnecessary re-renders
    const items = useMemo(() => results, [results]);

    // Open popover when query has value, close when empty
    useEffect(() => {
        setIsOpen(query.trim().length > 0);
    }, [query]);

    // cmd+K / ctrl+K keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Store input ref for keyboard shortcut
    const handleInputFocus = useCallback(() => {
        if (!inputRef.current) {
            inputRef.current = comboBoxRef.current?.querySelector('input') ?? null;
        }
    }, []);

    // Handle input change
    const handleInputChange = useCallback((value: string) => {
        setQuery(value);
    }, []);

    // Handle component selection
    const handleSelectionChange = useCallback((key: Key | null) => {
        if (key && key !== 'empty') {
            onSelect(String(key), selectedElementId || undefined);
            setQuery('');
            setIsOpen(false);

            // Keep focus on input without setTimeout for better reliability
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [onSelect, selectedElementId]);

    // Handle popover open/close
    const handleOpenChange = useCallback((open: boolean) => {
        // Only allow opening if there's a query
        if (open && query.trim().length === 0) {
            setIsOpen(false);
        } else {
            setIsOpen(open);
        }
    }, [query]);

    const hasResults = items.length > 0;
    const hasQuery = query.trim().length > 0;

    return (
        <div className="component-search" ref={comboBoxRef}>
            <ComboBox
                inputValue={query}
                onInputChange={handleInputChange}
                onSelectionChange={handleSelectionChange}
                onOpenChange={handleOpenChange}
                onFocus={handleInputFocus}
                placeholder="Search components... (⌘K)"
                aria-label="Search components"
                items={items}
                className="react-aria-ComboBox component-search-combobox"
                popoverClassName="component-search-popover"
                menuTrigger="manual"
                isOpen={isOpen}
                allowsEmptyCollection={true}
            >
                {hasResults ? (
                    (item) => (
                        <ComboBoxItem
                            key={item.tag}
                            id={item.tag}
                            textValue={item.label}
                            className="search-result-item"
                        >
                            <item.icon className="result-icon" size={16} />
                            <span className="result-label">{item.label}</span>
                            <span className="result-category">{item.category}</span>
                        </ComboBoxItem>
                    )
                ) : hasQuery ? (
                    () => (
                        <ComboBoxItem
                            key="empty"
                            id="empty"
                            textValue="No results"
                            className="search-empty-item"
                        >
                            <div className="search-empty">
                                <Search size={16} className="empty-icon" />
                                <div className="empty-content">
                                    <p className="empty-title">No components found</p>
                                    <p className="empty-suggestion">Try 'button', 'input', or 'table'</p>
                                </div>
                            </div>
                        </ComboBoxItem>
                    )
                ) : (
                    () => null
                )}
            </ComboBox>
        </div>
    );
}
