import { Element } from '../types/store';
import { ElementEvent } from '../types/events';
import { EventEngine } from './eventEngine';
import { createHash } from 'crypto';

export interface EventHandlerContext {
    eventEngine: EventEngine;
    projectId: string;
    pageId: string;
}

export class EventHandlerFactory {
    private eventEngine: EventEngine;
    private projectId: string;
    private pageId: string;
    private handlerCache = new Map<string, Record<string, (e: Event) => void>>();
    private cleanupFunctions = new Set<() => void>();

    constructor(context: EventHandlerContext) {
        this.eventEngine = context.eventEngine;
        this.projectId = context.projectId;
        this.pageId = context.pageId;

        // 메모리 누수 방지를 위한 정리 함수 등록
        this.registerCleanup(() => {
            this.handlerCache.clear();
            this.cleanupFunctions.clear();
        });
    }

    // 이벤트 핸들러 생성 (캐싱 + 보안 강화)
    createEventHandlers(element: Element): Record<string, (e: Event) => void> {
        const cacheKey = this.generateCacheKey(element);

        if (this.handlerCache.has(cacheKey)) {
            return this.handlerCache.get(cacheKey)!;
        }

        const handlers: Record<string, (e: Event) => void> = {};

        if (element.props.events && Array.isArray(element.props.events)) {
            const events = element.props.events as ElementEvent[];

            // 보안 검증: 이벤트 타입 화이트리스트
            const allowedEventTypes = [
                'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
                'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onKeyUp'
            ];

            const activeEventTypes = [...new Set(
                events
                    .filter(event =>
                        event.enabled !== false &&
                        allowedEventTypes.includes(event.event_type)
                    )
                    .map(event => event.event_type)
            )];

            activeEventTypes.forEach(eventType => {
                handlers[eventType] = this.createSecureEventHandler(element, eventType);
            });
        }

        this.handlerCache.set(cacheKey, handlers);
        return handlers;
    }

    private createSecureEventHandler(element: Element, eventType: string) {
        return async (event: Event) => {
            try {
                // 이벤트 타입 검증
                if (!this.isValidEventType(eventType)) {
                    console.warn(`Invalid event type: ${eventType}`);
                    return;
                }

                const elementEvents = element.props.events as ElementEvent[] || [];
                const matchingEvents = elementEvents.filter(
                    e => e.event_type === eventType && e.enabled !== false
                );

                if (matchingEvents.length === 0) return;

                const context = {
                    event,
                    element: event.target as HTMLElement,
                    elementId: element.id,
                    pageId: this.pageId,
                    projectId: this.projectId,
                    state: this.eventEngine.getState()
                };

                // 병렬 실행 + 타임아웃 설정
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Event execution timeout')), 5000)
                );

                await Promise.race([
                    Promise.allSettled(
                        matchingEvents.map(elementEvent =>
                            this.eventEngine.executeEvent(elementEvent, context)
                        )
                    ),
                    timeoutPromise
                ]);

            } catch (error) {
                console.error(`Event handler error for ${eventType}:`, error);
                // 에러 모니터링 서비스로 전송
            }
        };
    }

    private generateCacheKey(element: Element): string {
        const eventsHash = createHash('md5')
            .update(JSON.stringify(element.props.events))
            .digest('hex');
        return `${element.id}-${eventsHash}`;
    }

    private isValidEventType(eventType: string): boolean {
        const allowedTypes = [
            'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
            'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onKeyUp'
        ];
        return allowedTypes.includes(eventType);
    }

    private registerCleanup(cleanupFn: () => void) {
        this.cleanupFunctions.add(cleanupFn);
    }

    // 정리 메서드
    cleanup() {
        this.cleanupFunctions.forEach(fn => fn());
    }

    // 특정 요소의 캐시만 정리
    clearElementCache(elementId: string) {
        for (const [key] of this.handlerCache) {
            if (key.startsWith(elementId)) {
                this.handlerCache.delete(key);
            }
        }
    }
}