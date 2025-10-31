/**
 * Theme Version Service
 * Git-like 버전 관리 시스템
 */

import type { DesignToken } from '../../types/theme/token.types';

export interface ThemeVersion {
  id: string;
  theme_id: string;
  version: string; // e.g., "v1.0.0"
  commit_message: string;
  author: string;
  created_at: string;
  snapshot: {
    tokens: DesignToken[];
    tokenCount: number;
  };
  parent_version_id?: string; // 이전 버전 ID (Git parent commit)
}

export interface VersionDiff {
  added: DesignToken[];
  modified: Array<{
    before: DesignToken;
    after: DesignToken;
  }>;
  deleted: DesignToken[];
}

export interface CreateVersionInput {
  theme_id: string;
  version: string;
  commit_message: string;
  author: string;
  tokens: DesignToken[];
  parent_version_id?: string;
}

/**
 * 테마 버전 관리 서비스
 */
export class ThemeVersionService {
  /**
   * 새 버전 생성 (commit)
   */
  static async createVersion(input: CreateVersionInput): Promise<ThemeVersion> {
    const now = new Date().toISOString();

    const version: ThemeVersion = {
      id: this.generateVersionId(),
      theme_id: input.theme_id,
      version: input.version,
      commit_message: input.commit_message,
      author: input.author,
      created_at: now,
      snapshot: {
        tokens: input.tokens,
        tokenCount: input.tokens.length,
      },
      parent_version_id: input.parent_version_id,
    };

    // TODO: Supabase에 저장
    // await supabase.from('theme_versions').insert(version);

    return version;
  }

  /**
   * 테마의 버전 히스토리 조회
   */
  static async getVersionHistory(themeId: string): Promise<ThemeVersion[]> {
    // TODO: Supabase에서 조회
    // const { data } = await supabase
    //   .from('theme_versions')
    //   .select('*')
    //   .eq('theme_id', themeId)
    //   .order('created_at', { ascending: false });

    // Mock data for now
    return [];
  }

  /**
   * 특정 버전 조회
   */
  static async getVersion(versionId: string): Promise<ThemeVersion | null> {
    // TODO: Supabase에서 조회
    // const { data } = await supabase
    //   .from('theme_versions')
    //   .select('*')
    //   .eq('id', versionId)
    //   .single();

    return null;
  }

  /**
   * 두 버전 간 diff 계산
   */
  static calculateDiff(
    versionA: ThemeVersion,
    versionB: ThemeVersion
  ): VersionDiff {
    const tokensA = versionA.snapshot.tokens;
    const tokensB = versionB.snapshot.tokens;

    const added: DesignToken[] = [];
    const modified: Array<{ before: DesignToken; after: DesignToken }> = [];
    const deleted: DesignToken[] = [];

    // Map for quick lookup
    const mapA = new Map(tokensA.map((t) => [t.id, t]));
    const mapB = new Map(tokensB.map((t) => [t.id, t]));

    // Find added and modified
    for (const tokenB of tokensB) {
      const tokenA = mapA.get(tokenB.id);
      if (!tokenA) {
        // Token added in B
        added.push(tokenB);
      } else if (this.hasTokenChanged(tokenA, tokenB)) {
        // Token modified
        modified.push({ before: tokenA, after: tokenB });
      }
    }

    // Find deleted
    for (const tokenA of tokensA) {
      if (!mapB.has(tokenA.id)) {
        deleted.push(tokenA);
      }
    }

    return { added, modified, deleted };
  }

  /**
   * 토큰이 변경되었는지 확인
   */
  private static hasTokenChanged(tokenA: DesignToken, tokenB: DesignToken): boolean {
    // Compare relevant fields
    if (tokenA.name !== tokenB.name) return true;
    if (tokenA.type !== tokenB.type) return true;
    if (JSON.stringify(tokenA.value) !== JSON.stringify(tokenB.value)) return true;
    if (tokenA.category !== tokenB.category) return true;
    if (tokenA.scope !== tokenB.scope) return true;
    if (tokenA.description !== tokenB.description) return true;

    return false;
  }

  /**
   * 버전으로 복원 (revert)
   */
  static async revertToVersion(
    themeId: string,
    versionId: string,
    author: string
  ): Promise<ThemeVersion> {
    // 1. 대상 버전 조회
    const targetVersion = await this.getVersion(versionId);
    if (!targetVersion) {
      throw new Error('Version not found');
    }

    // 2. 현재 버전 조회
    const currentVersions = await this.getVersionHistory(themeId);
    const latestVersion = currentVersions[0];

    // 3. Revert 버전 생성
    const revertVersion = await this.createVersion({
      theme_id: themeId,
      version: this.incrementVersion(latestVersion?.version || 'v1.0.0'),
      commit_message: `Revert to ${targetVersion.version}: ${targetVersion.commit_message}`,
      author,
      tokens: targetVersion.snapshot.tokens,
      parent_version_id: latestVersion?.id,
    });

    // 4. 토큰 실제 복원 (TokenService 사용)
    // TODO: await TokenService.bulkUpdate(themeId, targetVersion.snapshot.tokens);

    return revertVersion;
  }

  /**
   * 버전 비교 (두 버전의 diff를 HTML로 렌더링)
   */
  static async compareVersions(
    versionIdA: string,
    versionIdB: string
  ): Promise<VersionDiff> {
    const versionA = await this.getVersion(versionIdA);
    const versionB = await this.getVersion(versionIdB);

    if (!versionA || !versionB) {
      throw new Error('Version not found');
    }

    return this.calculateDiff(versionA, versionB);
  }

  /**
   * 버전 태그 생성
   */
  static async createTag(
    themeId: string,
    versionId: string,
    tagName: string,
    description?: string
  ): Promise<void> {
    // TODO: Supabase에 태그 저장
    // await supabase.from('theme_version_tags').insert({
    //   theme_id: themeId,
    //   version_id: versionId,
    //   tag_name: tagName,
    //   description,
    // });
  }

  /**
   * 버전 번호 증가
   */
  static incrementVersion(currentVersion: string): string {
    // Parse version (e.g., "v1.2.3")
    const match = currentVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return 'v1.0.1';
    }

    const [, major, minor, patch] = match;
    const newPatch = parseInt(patch, 10) + 1;

    return `v${major}.${minor}.${newPatch}`;
  }

  /**
   * 버전 ID 생성
   */
  private static generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 자동 버전 생성 (현재 토큰 상태 스냅샷)
   */
  static async autoCommit(
    themeId: string,
    currentTokens: DesignToken[],
    commitMessage: string,
    author: string
  ): Promise<ThemeVersion> {
    // 1. 이전 버전 조회
    const history = await this.getVersionHistory(themeId);
    const latestVersion = history[0];

    // 2. Diff 계산
    let shouldCommit = true;
    if (latestVersion) {
      const diff = this.calculateDiff(
        latestVersion,
        {
          ...latestVersion,
          snapshot: { tokens: currentTokens, tokenCount: currentTokens.length },
        }
      );

      // 변경사항 없으면 skip
      if (
        diff.added.length === 0 &&
        diff.modified.length === 0 &&
        diff.deleted.length === 0
      ) {
        shouldCommit = false;
        console.log('[ThemeVersionService] No changes detected, skipping auto-commit');
        return latestVersion;
      }
    }

    // 3. 새 버전 생성
    if (shouldCommit) {
      const newVersion = this.incrementVersion(latestVersion?.version || 'v1.0.0');

      return await this.createVersion({
        theme_id: themeId,
        version: newVersion,
        commit_message: commitMessage,
        author,
        tokens: currentTokens,
        parent_version_id: latestVersion?.id,
      });
    }

    return latestVersion;
  }

  /**
   * 버전 히스토리를 Git-like 그래프로 변환
   */
  static buildVersionGraph(versions: ThemeVersion[]): Array<{
    version: ThemeVersion;
    level: number; // 브랜치 레벨 (0 = main)
    parents: string[];
  }> {
    const graph: Array<{
      version: ThemeVersion;
      level: number;
      parents: string[];
    }> = [];

    // Build parent map
    const parentMap = new Map<string, string[]>();
    for (const version of versions) {
      if (version.parent_version_id) {
        const parents = parentMap.get(version.id) || [];
        parents.push(version.parent_version_id);
        parentMap.set(version.id, parents);
      }
    }

    // Topological sort (simple linear history for now)
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      graph.push({
        version,
        level: 0, // All on main branch for now
        parents: version.parent_version_id ? [version.parent_version_id] : [],
      });
    }

    return graph;
  }
}
