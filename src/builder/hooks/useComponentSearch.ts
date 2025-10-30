import { useMemo } from 'react';

export interface Component {
  tag: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  category: string;
}

export interface ComponentWithScore extends Component {
  score: number;
  id: string;
}

/**
 * Custom hook for fuzzy searching components
 *
 * @param components - Array of components to search
 * @param query - Search query string
 * @returns Filtered and scored components, sorted by relevance
 */
export function useComponentSearch(
  components: Component[],
  query: string
): ComponentWithScore[] {
  return useMemo((): ComponentWithScore[] => {
    // Return all components with score 0 when no query
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    const scored = components.map(comp => {
      const lowerLabel = comp.label.toLowerCase();
      const lowerTag = comp.tag.toLowerCase();
      const lowerCategory = comp.category.toLowerCase();

      let score = 0;

      // Exact match
      if (lowerLabel === lowerQuery || lowerTag === lowerQuery) {
        score += 100;
      }

      // Starts with query
      if (lowerLabel.startsWith(lowerQuery) || lowerTag.startsWith(lowerQuery)) {
        score += 50;
      }

      // Contains query
      if (lowerLabel.includes(lowerQuery)) {
        score += 30;
      }
      if (lowerTag.includes(lowerQuery)) {
        score += 25;
      }
      if (lowerCategory.includes(lowerQuery)) {
        score += 10;
      }

      // Multi-word matching (e.g., "text field" → "text", "field")
      const words = lowerQuery.split(' ').filter(w => w.length > 0);
      const allWordsMatch = words.every(word =>
        lowerLabel.includes(word) || lowerTag.includes(word)
      );
      if (allWordsMatch && words.length > 1) {
        score += 20;
      }

      return {
        ...comp,
        score,
        id: comp.tag,
      };
    });

    // Filter out zero scores and sort by score (highest first)
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Limit to top 10 results
  }, [query, components]);
}
