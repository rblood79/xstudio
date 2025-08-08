import { supabase } from '../../env/supabase.client'; // 수정 (@ 제거)
import type { DesignTheme, DesignToken } from '../../types/designTheme'; // 수정

export async function fetchActiveTheme(projectId: string): Promise<DesignTheme> {
    const { data, error } = await supabase
        .from('design_themes')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    if (!data) return await ensureDefaultTheme(projectId);
    return data;
}

export async function ensureDefaultTheme(projectId: string): Promise<DesignTheme> {
    const { data, error } = await supabase
        .from('design_themes')
        .insert({ project_id: projectId, name: 'default', status: 'active' })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function fetchTokensByTheme(themeId: string): Promise<DesignToken[]> {
    const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('theme_id', themeId);
    if (error) throw error;
    return (data as DesignToken[]) || [];
}

export async function bulkUpsertTokens(tokens: Partial<DesignToken>[]) {
    if (!tokens.length) return [];
    const { data, error } = await supabase
        .from('design_tokens')
        .upsert(tokens, {
            onConflict: 'project_id, theme_id, name, scope'
        })
        .select('*');
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
    const { error } = await supabase
        .from('design_tokens')
        .delete()
        .eq('project_id', projectId)
        .eq('theme_id', themeId)
        .eq('name', name)
        .eq('scope', scope);
    if (error) throw error;
}