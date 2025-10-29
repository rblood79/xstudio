import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import './styles/ComponentSearch.css';
import { iconProps } from '../../utils/uiConstants';

interface Component {
    tag: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    category: string;
}

interface SearchResult extends Component {
    score: number;
}

interface ComponentSearchProps {
    components: Component[];
    onSelect: (tag: string, parentId?: string) => void;
    selectedElementId?: string | null;
}

export function ComponentSearch({ components, onSelect, selectedElementId }: ComponentSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Fuzzy search 알고리즘
    const fuzzySearch = useCallback((searchQuery: string, targetComponents: Component[]): SearchResult[] => {
        if (!searchQuery.trim()) {
            return [];
        }

        const lowerQuery = searchQuery.toLowerCase();

        const scored = targetComponents.map(comp => {
            const lowerLabel = comp.label.toLowerCase();
            const lowerTag = comp.tag.toLowerCase();
            const lowerCategory = comp.category.toLowerCase();

            let score = 0;

            // 정확히 일치
            if (lowerLabel === lowerQuery || lowerTag === lowerQuery) {
                score += 100;
            }

            // 시작 부분 일치
            if (lowerLabel.startsWith(lowerQuery) || lowerTag.startsWith(lowerQuery)) {
                score += 50;
            }

            // 포함 여부
            if (lowerLabel.includes(lowerQuery)) {
                score += 30;
            }
            if (lowerTag.includes(lowerQuery)) {
                score += 25;
            }
            if (lowerCategory.includes(lowerQuery)) {
                score += 10;
            }

            // 각 단어가 포함되는지 확인 (예: "text field" → "text", "field")
            const words = lowerQuery.split(' ');
            const allWordsMatch = words.every(word =>
                lowerLabel.includes(word) || lowerTag.includes(word)
            );
            if (allWordsMatch) {
                score += 20;
            }

            return { ...comp, score };
        });

        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // 최대 10개 결과
    }, []);

    // 검색 실행
    useEffect(() => {
        if (query.trim()) {
            const searchResults = fuzzySearch(query, components);
            setResults(searchResults);
            setSelectedIndex(0);
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query, components, fuzzySearch]);

    // cmd+K / ctrl+K 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }

            // ESC로 검색 닫기
            if (e.key === 'Escape') {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 키보드 네비게이션 (화살표, Enter)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex].tag);
                }
                break;
        }
    };

    // 컴포넌트 선택
    const handleSelect = (tag: string) => {
        onSelect(tag, selectedElementId || undefined);
        setQuery('');
        setIsOpen(false);
        inputRef.current?.blur();
    };

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                resultsRef.current &&
                !resultsRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="component-search">
            <div className="search-input-wrapper">
                <label className='control-label'>
                    <Search color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                </label>
                <input
                    ref={inputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search components... (⌘K)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query && setIsOpen(true)}
                />
                {query && (
                    <button
                        className="search-clear"
                        onClick={() => {
                            setQuery('');
                            setIsOpen(false);
                            inputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div ref={resultsRef} className="search-results">
                    {results.map((result, index) => (
                        <button
                            key={result.tag}
                            className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelect(result.tag)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <result.icon className="result-icon" size={16} />
                            <span className="result-label">{result.label}</span>
                            <span className="result-category">{result.category}</span>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query && results.length === 0 && (
                <div ref={resultsRef} className="search-results">
                    <div className="search-empty">
                        <p>No components found</p>
                        <p className="search-suggestion">Try 'button', 'input', or 'table'</p>
                    </div>
                </div>
            )}
        </div>
    );
}
