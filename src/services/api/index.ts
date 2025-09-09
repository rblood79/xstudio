// 모든 API 서비스들을 통합하여 export
export { BaseApiService } from './BaseApiService';
export { ElementsApiService, elementsApi } from './ElementsApiService';
export { ProjectsApiService, projectsApi, type Project, type CreateProjectData } from './ProjectsApiService';
export { PagesApiService, pagesApi, type Page, type CreatePageData } from './PagesApiService';

// Import the instances for the ApiService class
import { elementsApi } from './ElementsApiService';
import { projectsApi } from './ProjectsApiService';
import { pagesApi } from './PagesApiService';

// 통합 API 응답 타입
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    success: boolean;
}

// 공통 에러 핸들링 함수
export const handleApiError = (error: unknown, operation: string): ApiResponse<null> => {
    console.error(`${operation} 실패:`, error);
    return {
        data: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        success: false
    };
};

// API 서비스 통합 클래스 (선택적)
export class ApiService {
    static elements = elementsApi;
    static projects = projectsApi;
    static pages = pagesApi;
}
