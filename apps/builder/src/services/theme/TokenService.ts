/**
 * Token Service (Slimmed — ADR-021 Phase D)
 *
 * 보존: getResolvedTokens, createToken, updateToken, deleteToken,
 *       bulkUpsertTokens, generateCSSVariable
 * 제거: searchTokens, getTokenById, getRawTokens, getSemanticTokens,
 *       getTokensByType, resolveAlias, isTokenNameUnique,
 *       subscribeToTokenChanges, subscribeToProjectTokens,
 *       getTokenStats, exportTokensW3C, importTokensW3C
 */

import { BaseApiService } from "../api/BaseApiService";
import type {
  DesignToken,
  ResolvedToken,
  CreateTokenInput,
  UpdateTokenInput,
} from "../../types/theme";

export class TokenService extends BaseApiService {
  /**
   * 테마의 모든 토큰 조회 (IndexedDB)
   */
  static async getResolvedTokens(themeId: string): Promise<ResolvedToken[]> {
    try {
      const { getDB } = await import("../../lib/db");
      const db = await getDB();

      const tokens = await db.designTokens.getByTheme(themeId);

      const resolvedTokens: ResolvedToken[] = tokens.map(
        (token: DesignToken) => ({
          ...token,
          resolved_value: token.value,
          source_theme_id: themeId,
          is_inherited: false,
          inheritance_depth: 0,
        }),
      );

      return resolvedTokens;
    } catch (error) {
      console.error("[TokenService] getResolvedTokens failed:", error);
      return [];
    }
  }

  /**
   * 토큰 생성 (Supabase)
   */
  static async createToken(input: CreateTokenInput): Promise<DesignToken> {
    const instance = new TokenService();

    const result = await instance.handleApiCall<DesignToken>(
      "createToken",
      async () => {
        return await instance.supabase
          .from("design_tokens")
          .insert({
            project_id: input.project_id,
            theme_id: input.theme_id,
            name: input.name,
            type: input.type,
            value: input.value,
            scope: input.scope,
            alias_of: input.alias_of || null,
            css_variable: input.css_variable,
          })
          .select()
          .single();
      },
    );

    return result;
  }

  /**
   * 토큰 업데이트 (Supabase)
   */
  static async updateToken(
    tokenId: string,
    updates: UpdateTokenInput,
  ): Promise<DesignToken> {
    const instance = new TokenService();

    const result = await instance.handleApiCall<DesignToken>(
      "updateToken",
      async () => {
        return await instance.supabase
          .from("design_tokens")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tokenId)
          .select()
          .single();
      },
    );

    return result;
  }

  /**
   * 토큰 삭제 (Supabase)
   */
  static async deleteToken(tokenId: string): Promise<void> {
    const instance = new TokenService();

    await instance.handleDeleteCall("deleteToken", async () => {
      return await instance.supabase
        .from("design_tokens")
        .delete()
        .eq("id", tokenId);
    });
  }

  /**
   * 토큰 일괄 업서트 (IndexedDB 전용)
   */
  static async bulkUpsertTokens(
    tokens: Partial<DesignToken>[],
  ): Promise<number> {
    const { getDB } = await import("../../lib/db");
    const { ElementUtils } = await import("../../utils/element/elementUtils");
    const db = await getDB();

    let upsertedCount = 0;

    for (const token of tokens) {
      const tokenId = token.id || ElementUtils.generateId();
      const fullToken: DesignToken = {
        id: tokenId,
        project_id: token.project_id!,
        theme_id: token.theme_id!,
        name: token.name!,
        type: token.type!,
        value: token.value!,
        scope: token.scope || "semantic",
        created_at: token.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existing = await db.designTokens.getById(tokenId);
      if (existing) {
        await db.designTokens.update(tokenId, fullToken);
      } else {
        await db.designTokens.insert(fullToken);
      }
      upsertedCount++;
    }

    return upsertedCount;
  }

  /**
   * CSS Variable 자동 생성
   */
  static generateCSSVariable(tokenName: string): string {
    return `--${tokenName.replace(/\./g, "-")}`;
  }
}
