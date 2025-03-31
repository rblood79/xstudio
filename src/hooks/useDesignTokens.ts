import { useEffect, useRef } from 'react';
import { supabase } from '../env/supabase.client';
import { convertTokensToCSS } from '../utils/tokensToCss';
import { DesignToken } from '../types/designTokens';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms

export function useDesignTokens(projectId: string) {
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const cacheRef = useRef<{
    tokens: DesignToken[];
    timestamp: number;
  } | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const fetchAndApplyTokens = async (forceFetch = false) => {
      try {
        let tokens;
        
        // Check cache first
        if (!forceFetch && cacheRef.current) {
          const isCacheValid = Date.now() - cacheRef.current.timestamp < CACHE_DURATION;
          if (isCacheValid) {
            tokens = cacheRef.current.tokens;
          }
        }

        // Fetch if no valid cache
        if (!tokens) {
          const { data, error } = await supabase
            .from('design_tokens')
            .select('*')
            .eq('project_id', projectId);

          if (error) throw error;
          tokens = data || [];

          // Update cache
          cacheRef.current = {
            tokens,
            timestamp: Date.now()
          };
        }

        // Remove existing style element if it exists
        if (styleElementRef.current) {
          styleElementRef.current.remove();
        }

        // Create new style element
        styleElementRef.current = document.createElement('style');
        styleElementRef.current.textContent = convertTokensToCSS(tokens);
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
} 