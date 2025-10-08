import { getStoreState } from "../../builder/stores";
import { supabase } from "../../env/supabase.client";

/**
 * Supabase 테이블 타입 제한
 */
export type SupabaseTable = "elements" | "pages" | "projects";

/**
 * 저장 페이로드 인터페이스
 */
export interface SavePayload {
  table: SupabaseTable;
  id: string;
  data: Record<string, unknown>;
}

/**
 * SaveService 클래스
 * 실시간 모드와 수동 모드를 관리하며 Supabase 저장을 처리합니다.
 */
export class SaveService {
  private static instance: SaveService;

  private constructor() {}

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): SaveService {
    if (!SaveService.instance) {
      SaveService.instance = new SaveService();
    }
    return SaveService.instance;
  }

  /**
   * 속성 변경 저장 (실시간 모드 확인)
   * @param payload 저장할 데이터 정보
   */
  async savePropertyChange(payload: SavePayload): Promise<void> {
    // 항상 최신 store 상태 가져오기 (HMR 대응)
    const { isRealtimeMode, addPendingChange } = getStoreState();

    if (isRealtimeMode) {
      // 실시간 모드: 즉시 Supabase에 저장
      await this.saveToSupabase(payload);
    } else {
      // 수동 모드: Zustand에만 저장
      const changeKey = `${payload.table}:${payload.id}`;
      addPendingChange(changeKey, payload.data);
    }
  }

  /**
   * 보류 중인 모든 변경사항 저장
   */
  async saveAllPendingChanges(): Promise<void> {
    const { getPendingChanges, clearPendingChanges } = getStoreState();
    const changes = getPendingChanges();

    if (changes.size === 0) {
      console.log("💾 저장할 변경사항이 없습니다.");
      return;
    }

    console.log(`💾 ${changes.size}개 변경사항 저장 시작...`);

    const savePromises: Promise<void>[] = [];

    changes.forEach((data: Record<string, unknown>, key: string) => {
      const [table, id] = key.split(":");
      if (!table || !id) {
        console.warn(`⚠️ 잘못된 키 형식: ${key}`);
        return;
      }

      savePromises.push(
        this.saveToSupabase({
          table: table as SupabaseTable,
          id,
          data,
        })
      );
    });

    try {
      await Promise.all(savePromises);
      clearPendingChanges();
      console.log(`✅ ${changes.size}개 변경사항 저장 완료`);
    } catch (error) {
      console.error("❌ 저장 실패:", error);
      throw error;
    }
  }

  /**
   * Supabase에 데이터 저장
   */
  private async saveToSupabase(payload: SavePayload): Promise<void> {
    const { table, id, data } = payload;

    const { error } = await supabase.from(table).update(data).eq("id", id);

    if (error) {
      console.error(`❌ Supabase 저장 실패:`, error);
      throw error;
    }
  }
}

/**
 * SaveService 싱글톤 인스턴스
 */
export const saveService = SaveService.getInstance();
