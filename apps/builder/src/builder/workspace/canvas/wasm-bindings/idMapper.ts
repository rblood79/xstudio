/**
 * UUID ↔ u32 양방향 ID 매핑
 *
 * WASM SpatialIndex는 u32 ID를 사용하고, xstudio는 string UUID를 사용한다.
 * 이 모듈이 두 ID 체계를 투명하게 변환한다.
 *
 * @see docs/WASM.md §1.3 TypeScript 바인딩
 */

class ElementIdMapper {
  private stringToNum = new Map<string, number>();
  private numToString = new Map<number, string>();
  private nextId = 1; // 0은 예약 (null/invalid 표현용)

  /** string ID → u32 ID (없으면 신규 할당) */
  getNumericId(stringId: string): number {
    let num = this.stringToNum.get(stringId);
    if (num === undefined) {
      num = this.nextId++;
      this.stringToNum.set(stringId, num);
      this.numToString.set(num, stringId);
    }
    return num;
  }

  /** string ID → u32 ID (기존만 조회, 없으면 undefined) */
  tryGetNumericId(stringId: string): number | undefined {
    return this.stringToNum.get(stringId);
  }

  /** u32 ID → string ID */
  getStringId(numId: number): string | undefined {
    return this.numToString.get(numId);
  }

  /** 특정 매핑 제거 */
  remove(stringId: string): void {
    const num = this.stringToNum.get(stringId);
    if (num !== undefined) {
      this.stringToNum.delete(stringId);
      this.numToString.delete(num);
    }
  }

  /** 전체 매핑 초기화 */
  clear(): void {
    this.stringToNum.clear();
    this.numToString.clear();
    this.nextId = 1;
  }
}

export const idMapper = new ElementIdMapper();
