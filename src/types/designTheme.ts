export interface DesignTheme {
    id: string;
    project_id: string;
    name: string;
    status: 'active' | 'draft' | 'archived';
    version: number;
    parent_theme_id?: string | null;
    created_at: string;
    updated_at: string;
}

export type DesignTokenScope = 'raw' | 'semantic';

export interface DesignToken {
    id: string;
    project_id: string;
    theme_id: string;
    name: string;            // 예: color.brand.primary
    type: string;            // color | font | spacing | radius | ...
    value: any;              // JSONB
    scope: DesignTokenScope; // raw | semantic
    alias_of?: string | null;
    created_at?: string;
    updated_at?: string;
}