/**
 * Project Sync Utility
 *
 * 로컬(IndexedDB)과 클라우드(Supabase) 간 프로젝트 동기화
 */

import { getDB } from '../lib/db';
import { projectsApi } from '../services/api/ProjectsApiService';
import { pagesApi } from '../services/api/PagesApiService';
import { elementsApi } from '../services/api/ElementsApiService';

/**
 * 로컬 프로젝트를 클라우드에 동기화
 *
 * @param projectId - 동기화할 프로젝트 ID
 * @returns 동기화 성공 여부
 *
 * @example
 * ```typescript
 * await syncProjectToCloud('project-123');
 * ```
 */
export async function syncProjectToCloud(projectId: string): Promise<void> {
  console.log('[ProjectSync] 동기화 시작:', projectId);

  try {
    const db = await getDB();

    // 1. 로컬 프로젝트 읽기
    const localProject = await db.projects.getById(projectId);
    if (!localProject) {
      throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
    }

    console.log('[ProjectSync] 로컬 프로젝트 로드:', localProject.name);

    // 2. 프로젝트 메타데이터를 Supabase에 업데이트 (이미 존재한다고 가정)
    try {
      await projectsApi.updateProject(localProject.id, {
        name: localProject.name,
        updated_at: new Date().toISOString(),
      });
      console.log('[ProjectSync] 프로젝트 메타데이터 동기화 완료');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_updateError) {
      // 프로젝트가 없으면 생성 (IndexedDB ID 보존)
      console.log('[ProjectSync] 프로젝트가 클라우드에 없음, 새로 생성');
      await projectsApi.createProject({
        id: localProject.id, // ✅ IndexedDB ID 보존하여 FK 제약조건 충족
        name: localProject.name,
        created_by: localProject.created_by,
      });
    }

    // 3. 페이지 읽기
    const localPages = await db.pages.getByProject(projectId);
    console.log('[ProjectSync] 로컬 페이지:', localPages.length);

    // 4. 페이지를 Supabase에 업로드
    for (const page of localPages) {
      // Store Page (name) → API Page (title) 변환
      const apiPage = {
        id: page.id,
        project_id: page.project_id,
        title: page.name, // name → title
        slug: page.slug,
        parent_id: page.parent_id,
        order_num: page.order_num,
        created_at: page.created_at,
        updated_at: new Date().toISOString(),
      };

      try {
        await pagesApi.updatePage(page.id, apiPage);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_updateError) {
        // 페이지가 없으면 생성
        await pagesApi.createPage(apiPage);
      }

      // 5. 페이지의 요소들 읽기
      const localElements = await db.elements.getByPage(page.id);
      console.log(`[ProjectSync] 페이지 "${page.name}" 요소:`, localElements.length);

      // 6. 요소들을 Supabase에 업로드 (배치)
      if (localElements.length > 0) {
        // 기존 요소 삭제 후 재생성 (간단한 방법)
        const cloudElements = await elementsApi.getElementsByPageId(page.id);
        if (cloudElements.length > 0) {
          await elementsApi.deleteMultipleElements(cloudElements.map((el) => el.id));
        }

        // 새로 생성
        await elementsApi.createMultipleElements(
          localElements.map((el) => ({
            ...el,
            updated_at: new Date().toISOString(),
          }))
        );
      }
    }

    // 7. IndexedDB의 updated_at 업데이트 (동기화 시간 기록)
    await db.projects.update(projectId, {
      updated_at: new Date().toISOString(),
    });

    console.log('✅ [ProjectSync] 동기화 완료:', projectId);
  } catch (error) {
    console.error('❌ [ProjectSync] 동기화 실패:', error);
    throw error;
  }
}

/**
 * 클라우드 프로젝트를 로컬에 다운로드
 *
 * @param projectId - 다운로드할 프로젝트 ID
 * @returns 다운로드 성공 여부
 *
 * @example
 * ```typescript
 * await downloadProjectFromCloud('project-123');
 * ```
 */
export async function downloadProjectFromCloud(projectId: string): Promise<void> {
  console.log('[ProjectSync] 다운로드 시작:', projectId);

  try {
    const db = await getDB();

    // 1. 클라우드 프로젝트 읽기
    const cloudProject = await projectsApi.getProjectById(projectId);
    if (!cloudProject) {
      throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
    }

    console.log('[ProjectSync] 클라우드 프로젝트 로드:', cloudProject.name);

    // 2. IndexedDB에 프로젝트 저장
    await db.projects.insert(cloudProject);
    console.log('[ProjectSync] 프로젝트 메타데이터 다운로드 완료');

    // 3. 페이지 읽기
    const cloudPages = await pagesApi.getPagesByProjectId(projectId);
    console.log('[ProjectSync] 클라우드 페이지:', cloudPages.length);

    // 4. 페이지를 IndexedDB에 저장
    for (const page of cloudPages) {
      // API Page (title) → Store Page (name) 변환
      const storePage = {
        id: page.id,
        project_id: page.project_id,
        name: page.title, // title → name
        slug: page.slug,
        parent_id: page.parent_id,
        order_num: page.order_num,
        created_at: page.created_at,
        updated_at: page.updated_at,
      };

      await db.pages.insert(storePage);

      // 5. 페이지의 요소들 읽기
      const cloudElements = await elementsApi.getElementsByPageId(page.id);
      console.log(`[ProjectSync] 페이지 "${page.title}" 요소:`, cloudElements.length);

      // 6. 요소들을 IndexedDB에 저장
      if (cloudElements.length > 0) {
        await db.elements.insertMany(cloudElements);
      }
    }

    console.log('✅ [ProjectSync] 다운로드 완료:', projectId);
  } catch (error) {
    console.error('❌ [ProjectSync] 다운로드 실패:', error);
    throw error;
  }
}

/**
 * 프로젝트 삭제 (로컬 또는 클라우드)
 *
 * @param projectId - 삭제할 프로젝트 ID
 * @param location - 삭제 위치 ('local' | 'cloud' | 'both')
 *
 * @example
 * ```typescript
 * await deleteProject('project-123', 'local');  // 로컬에서만 삭제
 * await deleteProject('project-123', 'both');   // 양쪽 모두 삭제
 * ```
 */
export async function deleteProject(
  projectId: string,
  location: 'local' | 'cloud' | 'both'
): Promise<void> {
  console.log('[ProjectSync] 프로젝트 삭제:', { projectId, location });

  try {
    if (location === 'local' || location === 'both') {
      const db = await getDB();
      await db.projects.delete(projectId);
      console.log('✅ [ProjectSync] 로컬 프로젝트 삭제 완료');
    }

    if (location === 'cloud' || location === 'both') {
      await projectsApi.deleteProject(projectId);
      console.log('✅ [ProjectSync] 클라우드 프로젝트 삭제 완료');
    }
  } catch (error) {
    console.error('❌ [ProjectSync] 프로젝트 삭제 실패:', error);
    throw error;
  }
}
