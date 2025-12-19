/**
 * SpritePool - 메모리 풀링 유틸리티
 *
 * Phase E: Sprite/Container 재사용으로 GC 부담 감소
 *
 * @example
 * const sprite = spritePool.acquireSprite('my-texture');
 * // 사용 후
 * spritePool.releaseSprite(sprite, 'my-texture');
 */

import { Sprite, Texture, Container, Graphics } from "pixi.js";

class SpritePool {
  private spritePools: Map<string, Sprite[]> = new Map();
  private containerPool: Container[] = [];
  private graphicsPool: Graphics[] = [];

  private maxPoolSize = 100;

  /**
   * Sprite 획득 (풀에서 가져오거나 새로 생성)
   */
  acquireSprite(textureKey: string): Sprite {
    const pool = this.spritePools.get(textureKey);

    if (pool && pool.length > 0) {
      const sprite = pool.pop()!;
      sprite.visible = true;
      sprite.alpha = 1;
      sprite.scale.set(1, 1);
      sprite.position.set(0, 0);
      sprite.rotation = 0;
      return sprite;
    }

    return new Sprite(Texture.from(textureKey));
  }

  /**
   * Sprite 반환 (풀에 저장)
   */
  releaseSprite(sprite: Sprite, textureKey: string): void {
    sprite.visible = false;
    sprite.removeFromParent();

    let pool = this.spritePools.get(textureKey);
    if (!pool) {
      pool = [];
      this.spritePools.set(textureKey, pool);
    }

    if (pool.length < this.maxPoolSize) {
      pool.push(sprite);
    } else {
      sprite.destroy();
    }
  }

  /**
   * Container 획득
   */
  acquireContainer(): Container {
    if (this.containerPool.length > 0) {
      const container = this.containerPool.pop()!;
      container.visible = true;
      container.alpha = 1;
      container.scale.set(1, 1);
      container.position.set(0, 0);
      container.rotation = 0;
      return container;
    }

    return new Container();
  }

  /**
   * Container 반환
   */
  releaseContainer(container: Container): void {
    container.visible = false;
    container.removeChildren();
    container.removeFromParent();

    if (this.containerPool.length < this.maxPoolSize) {
      this.containerPool.push(container);
    } else {
      container.destroy();
    }
  }

  /**
   * Graphics 획득
   */
  acquireGraphics(): Graphics {
    if (this.graphicsPool.length > 0) {
      const graphics = this.graphicsPool.pop()!;
      graphics.visible = true;
      graphics.alpha = 1;
      graphics.scale.set(1, 1);
      graphics.position.set(0, 0);
      graphics.clear();
      return graphics;
    }

    return new Graphics();
  }

  /**
   * Graphics 반환
   */
  releaseGraphics(graphics: Graphics): void {
    graphics.visible = false;
    graphics.clear();
    graphics.removeFromParent();

    if (this.graphicsPool.length < this.maxPoolSize) {
      this.graphicsPool.push(graphics);
    } else {
      graphics.destroy();
    }
  }

  /**
   * 풀 상태 조회
   */
  getStats(): {
    sprites: { [key: string]: number };
    containers: number;
    graphics: number;
  } {
    const sprites: { [key: string]: number } = {};
    this.spritePools.forEach((pool, key) => {
      sprites[key] = pool.length;
    });

    return {
      sprites,
      containers: this.containerPool.length,
      graphics: this.graphicsPool.length,
    };
  }

  /**
   * 풀 정리 (페이지 전환 시 호출)
   */
  clear(): void {
    this.spritePools.forEach((pool) => {
      pool.forEach((sprite) => sprite.destroy());
    });
    this.spritePools.clear();

    this.containerPool.forEach((container) => container.destroy());
    this.containerPool = [];

    this.graphicsPool.forEach((graphics) => graphics.destroy());
    this.graphicsPool = [];
  }

  /**
   * 최대 풀 크기 설정
   */
  setMaxPoolSize(size: number): void {
    this.maxPoolSize = size;
  }
}

export const spritePool = new SpritePool();
export { SpritePool };
