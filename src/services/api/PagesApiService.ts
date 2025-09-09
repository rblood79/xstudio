import { BaseApiService } from './BaseApiService';

export interface Page {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePageData {
    project_id: string;
    title: string;
    slug: string;
}

export class PagesApiService extends BaseApiService {
    async fetchPages(projectId: string): Promise<Page[]> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'fetchPages');

        return this.handleApiCall('fetchPages', async () => {
            return await this.supabase
                .from("pages")
                .select("*")
                .eq("project_id", projectId)
                .order('created_at', { ascending: true });
        });
    }

    async createPage(pageData: CreatePageData): Promise<Page> {
        this.validateInput(pageData, (data) =>
            data &&
            typeof data.project_id === 'string' &&
            typeof data.title === 'string' &&
            data.title.trim().length > 0 &&
            typeof data.slug === 'string' &&
            data.slug.trim().length > 0
            , 'createPage');

        return this.handleApiCall('createPage', async () => {
            return await this.supabase
                .from("pages")
                .insert([pageData])
                .select('*')
                .single();
        });
    }

    async updatePage(pageId: string, updates: Partial<Page>): Promise<Page> {
        this.validateInput(pageId, (id) => typeof id === 'string' && id.length > 0, 'updatePage');
        this.validateInput(updates, (u) => u && typeof u === 'object', 'updatePage');

        return this.handleApiCall('updatePage', async () => {
            return await this.supabase
                .from("pages")
                .update(updates)
                .eq("id", pageId)
                .select('*')
                .single();
        });
    }

    async deletePage(pageId: string): Promise<void> {
        this.validateInput(pageId, (id) => typeof id === 'string' && id.length > 0, 'deletePage');

        await this.handleDeleteCall('deletePage', async () => {
            return await this.supabase
                .from("pages")
                .delete()
                .eq("id", pageId);
        });
    }
}

// 싱글톤 인스턴스
export const pagesApi = new PagesApiService();
