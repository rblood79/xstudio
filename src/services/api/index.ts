// 모든 API 서비스들을 통합하여 export
export { BaseApiService } from './BaseApiService';
export { ElementsApiService, elementsApi } from './ElementsApiService';
export { ProjectsApiService, projectsApi, type Project, type CreateProjectData } from './ProjectsApiService';
export { PagesApiService, pagesApi, type Page, type CreatePageData } from './PagesApiService';
import { largeMockData, MockUserData } from './mockLargeDataV2';

// Import the instances for the ApiService class
import { elementsApi } from './ElementsApiService';
import { projectsApi } from './ProjectsApiService';
import { pagesApi } from './PagesApiService';

// === Mock API Endpoint ===
interface MockApiConfig {
    [key: string]: (path: string, params?: Record<string, unknown>) => Promise<any>;
}

const fetchMockUsers = async (path: string, params?: Record<string, unknown>): Promise<MockUserData[]> => {
    console.log("Fetching mock users from path:", path, "with params:", params);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate filtering if 'search' param is provided
    if (params && typeof params.search === 'string') {
        const searchTerm = params.search.toLowerCase();
        return largeMockData.filter(user =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.jobTitle.toLowerCase().includes(searchTerm)
        );
    }
    return largeMockData;
};

export const apiConfig: MockApiConfig = {
    MOCK_USER_DATA: fetchMockUsers,
    // 여기에 다른 Mock API 또는 실제 API 매핑을 추가할 수 있습니다.
};

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
