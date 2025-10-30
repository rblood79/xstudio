import { useState, useEffect, useRef } from 'react';
import { SearchField } from './SearchField';
import './styles/ComponentSearch.css';

interface ComponentSearchProps {
    onSearchChange: (query: string) => void;
}

/**
 * ComponentSearch - Simple search field for filtering ComponentList
 *
 * Features:
 * - Keyboard shortcut (cmd+K / ctrl+K)
 * - Real-time search query updates
 * - Filters ComponentList in real-time
 */
export function ComponentSearch({ onSearchChange }: ComponentSearchProps) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

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

    // Notify parent of search query changes
    useEffect(() => {
        onSearchChange(query);
    }, [query, onSearchChange]);

    // Store input ref when SearchField mounts
    const handleRef = (input: HTMLInputElement | null) => {
        inputRef.current = input;
    };

    return (
        <div className="component-search">
            <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Search components... (⌘K)"
                aria-label="Search components"
                className="component-search-field"
            />
        </div>
    );
}
