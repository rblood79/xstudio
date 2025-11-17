/**
 * Projects API Service
 * 프로젝트 CRUD 및 관리 로직
 *
 * ✅ Phase 6: BaseApiService 마이그레이션 (2025-11-17)
 * - 캐싱 적용 (5분 TTL)
 * - Request Deduplication
 * - Performance Monitoring
 * - Automatic Cache Invalidation
 */

import { BaseApiService } from './BaseApiService';

export interface Project {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectData {
    id?: string; // Optional: 동기화 시 IndexedDB ID 보존용
    name: string;
    created_by: string;
}

export class ProjectsApiService extends BaseApiService {
    /**
     * 전체 프로젝트 조회 (캐싱 적용)
     *
     * ✅ 최적화:
     * - 5분 캐싱
     * - 중복 요청 자동 방지
     * - 성능 모니터링
     */
    async fetchProjects(): Promise<Project[]> {
        const queryKey = 'projects:all';

        return this.handleCachedApiCall<Project[]>(
            queryKey,
            'fetchProjects',
            async () => {
                return await this.supabase
                    .from("projects")
                    .select("*")
                    .order('created_at', { ascending: false });
            },
            { staleTime: 5 * 60 * 1000 }
        );
    }

    /**
     * 프로젝트 ID로 단일 프로젝트 조회 (캐싱 적용)
     *
     * ✅ 최적화:
     * - 5분 캐싱
     * - 중복 요청 자동 방지
     */
    async getProjectById(projectId: string): Promise<Project | null> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'getProjectById');

        const queryKey = `project:id:${projectId}`;

        return this.handleCachedApiCall<Project | null>(
            queryKey,
            'getProjectById',
            async () => {
                const result = await this.supabase
                    .from("projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                // 프로젝트가 없으면 null 반환
                if (result.error) {
                    console.warn('[ProjectsApi] 프로젝트를 찾을 수 없음:', projectId);
                    return { data: null, error: null };
                }

                return result;
            },
            { staleTime: 5 * 60 * 1000 }
        );
    }

    /**
     * 프로젝트 생성 (캐시 무효화)
     */
    async createProject(projectData: CreateProjectData): Promise<Project> {
        this.validateInput(projectData, (data) =>
            data &&
            typeof data.name === 'string' &&
            data.name.trim().length > 0 &&
            typeof data.created_by === 'string'
            , 'createProject');

        const result = await this.handleApiCall('createProject', async () => {
            return await this.supabase
                .from("projects")
                .insert([projectData])
                .select('*')
                .single();
        });

        // ✅ 캐시 무효화
        this.invalidateCache('projects:all');

        return result;
    }

    /**
     * 프로젝트 업데이트 (캐시 무효화)
     */
    async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'updateProject');
        this.validateInput(updates, (u) => u && typeof u === 'object', 'updateProject');

        const result = await this.handleApiCall('updateProject', async () => {
            return await this.supabase
                .from("projects")
                .update(updates)
                .eq("id", projectId)
                .select('*')
                .single();
        });

        // ✅ 캐시 무효화
        this.invalidateCache('projects:all');
        this.invalidateCache(`project:id:${projectId}`);

        return result;
    }

    /**
     * 프로젝트 삭제 (캐시 무효화)
     */
    async deleteProject(projectId: string): Promise<void> {
        this.validateInput(projectId, (id) => typeof id === 'string' && id.length > 0, 'deleteProject');

        await this.handleDeleteCall('deleteProject', async () => {
            return await this.supabase
                .from("projects")
                .delete()
                .eq("id", projectId);
        });

        // ✅ 캐시 무효화
        this.invalidateCache('projects:all');
        this.invalidateCache(`project:id:${projectId}`);
    }

    /**
     * 현재 사용자 조회 (캐싱 적용)
     *
     * ✅ 최적화:
     * - 5분 캐싱 (세션은 자주 변하지 않음)
     * - 중복 요청 방지
     */
    async getCurrentUser(): Promise<{ id: string }> {
        const queryKey = 'user:current';

        return this.handleCachedApiCall<{ id: string }>(
            queryKey,
            'getCurrentUser',
            async () => {
                const { data: { session }, error } = await this.supabase.auth.getSession();

                if (error) {
                    throw new Error(`Session error: ${error.message}`);
                }

                if (!session?.user) {
                    throw new Error('No authenticated user found');
                }

                return { data: { id: session.user.id }, error: null };
            },
            { staleTime: 5 * 60 * 1000 }
        );
    }
}

// 싱글톤 인스턴스
export const projectsApi = new ProjectsApiService();
