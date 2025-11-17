/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * 자주 접근하는 elements를 메모리에 캐싱하여 IndexedDB 읽기 횟수 감소
 * - O(1) 읽기/쓰기 성능 (Map + LinkedList)
 * - 자동 크기 제한 (기본 1000개)
 * - 메모리 효율적 (가장 오래된 항목 자동 제거)
 */

export interface CacheNode<T> {
  key: string;
  value: T;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

export class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, CacheNode<T>>;
  private head: CacheNode<T> | null = null;
  private tail: CacheNode<T> | null = null;

  // 통계
  private hits = 0;
  private misses = 0;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  // === Core Operations ===

  get(key: string): T | null {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return null;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.hits++;
    return node.value;
  }

  set(key: string, value: T): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      this.moveToFront(existingNode);
      return;
    }

    // Create new node
    const newNode: CacheNode<T> = {
      key,
      value,
      prev: null,
      next: null,
    };

    // Add to cache
    this.cache.set(key, newNode);
    this.addToFront(newNode);

    // Check capacity
    if (this.cache.size > this.capacity) {
      this.removeLRU();
    }
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  // === LinkedList Operations ===

  private moveToFront(node: CacheNode<T>): void {
    if (node === this.head) {
      return; // Already at front
    }

    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: CacheNode<T>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private removeLRU(): void {
    if (!this.tail) {
      return;
    }

    const lruNode = this.tail;
    this.removeNode(lruNode);
    this.cache.delete(lruNode.key);
  }

  // === Batch Operations ===

  setMany(items: Array<{ key: string; value: T }>): void {
    items.forEach(({ key, value }) => {
      this.set(key, value);
    });
  }

  deleteMany(keys: string[]): void {
    keys.forEach((key) => {
      this.delete(key);
    });
  }

  // === Statistics ===

  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  private estimateMemoryUsage(): string {
    // Rough estimate: 2KB per element on average
    const bytes = this.cache.size * 2048;

    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }

  // === Utility ===

  getSize(): number {
    return this.cache.size;
  }

  getCapacity(): number {
    return this.capacity;
  }

  setCapacity(newCapacity: number): void {
    this.capacity = newCapacity;

    // Remove excess items if needed
    while (this.cache.size > this.capacity) {
      this.removeLRU();
    }
  }
}
