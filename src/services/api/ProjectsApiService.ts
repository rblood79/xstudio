import { BaseApiService } from './BaseApiService';

export interface Project {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectData {
    name: string;
    created_by: string;
}

export class ProjectsApiService extends BaseApiService {
    async fetchProjects(): Promise<Project[]> {
        return this.handleApiCall('fetchProjects', async () => {
            return await this.supabase
                .from("projects")
                .select("*")
                .order('created_at', { ascending: false });
        });
    }

    async createProject(projectData: CreateProjectData): Promise<Project> {
        this.validateInput(projectData, (data) =>
            data &&
            typeof data.name === 'string' &&
            data.name.trim().length > 0 &&
            typeof data.created_by === 'string'
            , 'createProject');

        return this.handleApiCall('createProject', async () => {
            return await this.supabase
                .from("projects")
                .insert([projectData])
                .select('*')
                .single();
        });
    }

    async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'updateProject');
        this.validateInput(updates, (u) => u && typeof u === 'object', 'updateProject');

        return this.handleApiCall('updateProject', async () => {
            return await this.supabase
                .from("projects")
                .update(updates)
                .eq("id", projectId)
                .select('*')
                .single();
        });
    }

    async deleteProject(projectId: string): Promise<void> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'deleteProject');

        await this.handleApiCall('deleteProject', async () => {
            return await this.supabase
                .from("projects")
                .delete()
                .eq("id", projectId);
        });
    }

    async getCurrentUser(): Promise<{ id: string }> {
        return this.handleApiCall('getCurrentUser', async () => {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                throw new Error(`Session error: ${error.message}`);
            }

            if (!session?.user) {
                throw new Error('No authenticated user found');
            }

            return { data: { id: session.user.id }, error: null };
        });
    }
}

// 싱글톤 인스턴스
export const projectsApi = new ProjectsApiService();
