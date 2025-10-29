import { useState, useEffect, useRef, useMemo } from 'react';
import { ComboBox, ComboBoxItem } from './ComboBox';
import { Key } from 'react-aria-components';
import './styles/ComponentSearch.css';

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
    const comboBoxRef = useRef<HTMLDivElement>(null);

    // Fuzzy search 알고리즘 (useMemo로 최적화)
    const results = useMemo((): SearchResult[] => {
        if (!query.trim()) {
            return [];
        }

        const lowerQuery = query.toLowerCase();

        const scored = components.map(comp => {
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
    }, [query, components]);

    // cmd+K / ctrl+K 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                // ComboBox 내부의 Input에 포커스
                const input = comboBoxRef.current?.querySelector('input');
                input?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 컴포넌트 선택
    const handleSelectionChange = (key: Key | null) => {
        if (key) {
            onSelect(String(key), selectedElementId || undefined);
            setQuery('');
        }
    };

    // items를 ComboBox에 전달할 형태로 변환
    const items = results.map(result => ({
        id: result.tag,
        ...result,
    }));

    return (
        <div className="component-search" ref={comboBoxRef}>
            <ComboBox
                inputValue={query}
                onInputChange={setQuery}
                onSelectionChange={handleSelectionChange}
                placeholder="Search components... (⌘K)"
                aria-label="Search components"
                items={items}
                className="react-aria-ComboBox component-search-combobox"
                menuTrigger="focus"
            >
                {(item) => (
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
                )}
            </ComboBox>
        </div>
    );
}
