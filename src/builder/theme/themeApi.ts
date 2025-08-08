import { supabase } from '../../env/supabase.client';
import type { DesignTheme, DesignToken } from '../../types/theme';

export async function fetchActiveTheme(projectId: string): Promise<DesignTheme> {
    //console.log('[themeApi] Fetching active theme for project:', projectId);
    const { data, error } = await supabase
        .from('design_themes')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    //console.log('[themeApi] Active theme result:', { data, error });
    if (error) throw error;
    if (!data) {
        //console.log('[themeApi] No active theme found, creating default');
        return await ensureDefaultTheme(projectId);
    }
    return data;
}

export async function ensureDefaultTheme(projectId: string): Promise<DesignTheme> {
    //console.log('[themeApi] Creating default theme for project:', projectId);
    const { data, error } = await supabase
        .from('design_themes')
        .insert({ project_id: projectId, name: 'default', status: 'active' })
        .select('*')
        .single();

    //console.log('[themeApi] Default theme creation result:', { data, error });
    if (error) throw error;
    return data;
}

export async function fetchTokensByTheme(themeId: string): Promise<DesignToken[]> {
    //console.log('[themeApi] Fetching tokens for theme:', themeId);
    const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('theme_id', themeId);

    //console.log('[themeApi] Tokens result:', { data, error });
    if (error) throw error;
    return (data as DesignToken[]) || [];
}

export async function bulkUpsertTokens(tokens: Partial<DesignToken>[]) {
    if (!tokens.length) {
        //console.log('[themeApi] No tokens to upsert');
        return [];
    }

    // css_variable 필드를 제거하고 기본 필드만 사용
    const tokensToUpsert = tokens.map(({ css_variable: _, ...tokenWithoutCssVar }) => tokenWithoutCssVar);

    //console.log('[themeApi] Upserting tokens:', tokensToUpsert);
    const { data, error } = await supabase
        .from('design_tokens')
        .upsert(tokensToUpsert, {
            onConflict: 'project_id, theme_id, name, scope'
        })
        .select('*');

    //console.log('[themeApi] Upsert result:', { data, error });
    if (error) throw error;
    return data as DesignToken[];
}

export async function deleteDesignToken(params: {
    projectId: string;
    themeId: string;
    name: string;
    scope: 'raw' | 'semantic';
}) {
    const { projectId, themeId, name, scope } = params;
    //console.log('[themeApi] Deleting token:', { projectId, themeId, name, scope });

    const { error } = await supabase
        .from('design_tokens')
        .delete()
        .eq('project_id', projectId)
        .eq('theme_id', themeId)
        .eq('name', name)
        .eq('scope', scope);

    //console.log('[themeApi] Delete result:', { error });
    if (error) throw error;
}