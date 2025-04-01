import { useEffect, useRef, useState } from 'react';
import { supabase } from '../env/supabase.client';
import { convertTokensToCSS } from '../utils/tokensToCss';
import { ColorValue, DesignToken, TokenType } from '../types/designTokens';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms

interface UseDesignTokensReturn {
  tokens: DesignToken[];
  updateToken: (name: string, token: { type: TokenType; value: ColorValue }) => Promise<void>;
}

export function useDesignTokens(projectId: string): UseDesignTokensReturn {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const cacheRef = useRef<{
    tokens: DesignToken[];
    timestamp: number;
  } | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const fetchAndApplyTokens = async (forceFetch = false) => {
      try {
        let currentTokens;

        // Check cache first
        if (!forceFetch && cacheRef.current) {
          const isCacheValid = Date.now() - cacheRef.current.timestamp < CACHE_DURATION;
          if (isCacheValid) {
            currentTokens = cacheRef.current.tokens;
          }
        }

        // Fetch if no valid cache
        if (!currentTokens) {
          const { data, error } = await supabase
            .from('design_tokens')
            .select('*')
            .eq('project_id', projectId);

          if (error) throw error;
          currentTokens = data || [];

          // Update cache
          cacheRef.current = {
            tokens: currentTokens,
            timestamp: Date.now()
          };
        }

        setTokens(currentTokens);

        // Remove existing style element if it exists
        if (styleElementRef.current) {
          styleElementRef.current.remove();
        }

        // Create new style element
        styleElementRef.current = document.createElement('style');
        styleElementRef.current.textContent = convertTokensToCSS(currentTokens);
        document.head.appendChild(styleElementRef.current);
      } catch (error) {
        console.error('Error fetching design tokens:', error);
      }
    };

    // Initial fetch
    fetchAndApplyTokens();

    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('design_tokens_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tokens',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          // Clear cache and debounce the update
          cacheRef.current = null;

          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }

          debounceTimeoutRef.current = setTimeout(() => {
            fetchAndApplyTokens(true);
          }, DEBOUNCE_DELAY);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [projectId]);

  const updateToken = async (name: string, token: { type: TokenType; value: ColorValue }) => {
    try {
      const { error } = await supabase
        .from('design_tokens')
        .update(token)
        .eq('name', name)
        .eq('project_id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating token:', error);
    }
  };

  return { tokens, updateToken };
} 