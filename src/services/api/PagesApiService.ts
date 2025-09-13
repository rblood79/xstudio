import { BaseApiService } from './BaseApiService';

export interface Page {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    order_num: number;
    created_at: string;
    updated_at: string;
}

export interface CreatePageData {
    project_id: string;
    title: string;
    slug: string;
}

export class PagesApiService extends BaseApiService {
    /**
     * 프로젝트 ID로 페이지들을 가져옵니다
     */
    async getPagesByProjectId(projectId: string): Promise<Page[]> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'getPagesByProjectId');

        return this.handleApiCall('getPagesByProjectId', async () => {
            return await this.supabase
                .from("pages")
                .select("*")
                .eq("project_id", projectId)
                .order('order_num', { ascending: true });
        });
    }

    /**
     * 새 페이지를 생성합니다
     */
    async createPage(pageData: Partial<Page>): Promise<Page> {
        this.validateInput(pageData, (data) => typeof data === 'object' && data !== null, 'createPage');

        return this.handleApiCall('createPage', async () => {
            const result = await this.supabase
                .from("pages")
                .insert([pageData])
                .select()
                .single();
            
            return result;
        });
    }

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

// PagesApiService 싱글톤 인스턴스
export const pagesApi = new PagesApiService();
