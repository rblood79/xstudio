/**
 * CanvasKit 리소스 수동 해제 관리
 *
 * CanvasKit의 C++ 힙 객체(Paint, Path, Surface, Image 등)는
 * JavaScript GC가 해제하지 않으므로 명시적으로 .delete()를 호출해야 한다.
 *
 * try/finally 패턴(방법 A)을 사용한다 — tsconfig ES2020 target에서
 * `using` 키워드 없이 동작한다.
 *
 * @see docs/WASM.md §5.4 Disposable 패턴
 */

/** .delete() 메서드를 가진 CanvasKit 네이티브 객체 */
interface Deletable {
  delete(): void;
}

/**
 * CanvasKit 네이티브 객체의 수명을 스코프에 바인딩한다.
 *
 * 사용법:
 * ```ts
 * const scope = new SkiaDisposable();
 * try {
 *   const paint = scope.track(new ck.Paint());
 *   // ... paint 사용
 * } finally {
 *   scope.dispose();
 * }
 * ```
 */
export class SkiaDisposable {
  private resources: Deletable[] = [];

  /**
   * 리소스를 추적 대상에 추가하고 그대로 반환한다.
   * dispose() 시 추가 역순으로 delete()가 호출된다.
   */
  track<T extends Deletable>(resource: T): T {
    this.resources.push(resource);
    return resource;
  }

  /** 추적 중인 모든 리소스를 역순으로 delete() 한다. */
  dispose(): void {
    for (let i = this.resources.length - 1; i >= 0; i--) {
      try {
        this.resources[i].delete();
      } catch {
        // 이미 삭제된 리소스는 무시
      }
    }
    this.resources.length = 0;
  }
}

