import {
    EventAction,
    ElementEvent,
    EventContext,
    EventExecutionResult,
    ActionType
} from '../types/events';

class EventEngine {
    private static instance: EventEngine;
    private globalState: Record<string, any> = {};

    static getInstance(): EventEngine {
        if (!EventEngine.instance) {
            EventEngine.instance = new EventEngine();
        }
        return EventEngine.instance;
    }

    // 전역 상태 관리
    setState(key: string, value: any) {
        this.globalState[key] = value;
    }

    getState() {
        return { ...this.globalState };
    }

    // 이벤트 실행
    async executeEvent(
        event: ElementEvent,
        context: EventContext
    ): Promise<EventExecutionResult> {
        const startTime = Date.now();
        const actionResults: any[] = [];

        // 이벤트가 비활성화되어 있으면 실행하지 않음
        if (event.enabled === false) {
            return {
                success: false,
                actionResults: [],
                totalExecutionTime: 0
            };
        }

        // 기본 동작 방지
        if (event.preventDefault) {
            context.event.preventDefault();
        }

        // 이벤트 전파 중단
        if (event.stopPropagation) {
            context.event.stopPropagation();
        }

        // 액션들 순차 실행
        for (const action of event.actions) {
            try {
                const result = await this.executeAction(action, context);
                actionResults.push({
                    actionId: action.id,
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error('액션 실행 오류:', error);
                actionResults.push({
                    actionId: action.id,
                    success: false,
                    error: error instanceof Error ? error.message : '알 수 없는 오류'
                });
            }
        }

        const totalExecutionTime = Date.now() - startTime;

        return {
            success: actionResults.every(result => result.success),
            actionResults,
            totalExecutionTime
        };
    }

    // 개별 액션 실행
    private async executeAction(action: EventAction, context: EventContext): Promise<any> {
        // 액션이 비활성화되어 있으면 실행하지 않음
        if (action.enabled === false) {
            return null;
        }

        // 실행 조건 확인
        if (action.condition) {
            try {
                const conditionResult = this.evaluateCondition(action.condition, context);
                if (!conditionResult) {
                    return null;
                }
            } catch (error) {
                console.error('실행 조건 평가 오류:', error);
                return null;
            }
        }

        // 지연 시간 처리
        if (action.delay && action.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, action.delay));
        }

        // 액션 타입별 실행
        switch (action.type) {
            case 'navigate':
                return this.executeNavigateAction(action, context);

            case 'toggle_visibility':
                return this.executeToggleVisibilityAction(action, context);

            case 'update_state':
                return this.executeUpdateStateAction(action, context);

            case 'show_modal':
                return this.executeShowModalAction(action, context);

            case 'hide_modal':
                return this.executeHideModalAction(action, context);

            case 'custom_function':
                return this.executeCustomFunctionAction(action, context);

            case 'scroll_to':
                return this.executeScrollToAction(action, context);

            case 'copy_to_clipboard':
                return this.executeCopyToClipboardAction(action, context);

            case 'update_props':
                return this.executeUpdatePropsAction(action, context);

            default:
                console.warn('지원되지 않는 액션 타입:', action.type);
                return null;
        }
    }

    // 조건 평가
    private evaluateCondition(condition: string, context: EventContext): boolean {
        try {
            // 안전한 컨텍스트 생성
            const safeContext = {
                event: context.event,
                element: context.element,
                elementId: context.elementId,
                pageId: context.pageId,
                projectId: context.projectId,
                state: this.getState()
            };

            // Function 생성자를 사용하여 조건 평가
            const func = new Function(
                'event', 'element', 'elementId', 'pageId', 'projectId', 'state',
                `return ${condition}`
            );

            return func(
                safeContext.event,
                safeContext.element,
                safeContext.elementId,
                safeContext.pageId,
                safeContext.projectId,
                safeContext.state
            );
        } catch (error) {
            console.error('조건 평가 오류:', error);
            return false;
        }
    }

    // 커스텀 함수 액션 실행 (디버깅 코드 제거)
    private async executeCustomFunctionAction(action: EventAction, context: EventContext): Promise<any> {
        const value = action.value as any;
        if (!value?.code) {
            console.warn('커스텀 함수 코드가 없습니다');
            return null;
        }

        try {
            // 안전한 컨텍스트 생성
            const safeContext = {
                event: context.event,
                element: context.element,
                elementId: context.elementId,
                pageId: context.pageId,
                projectId: context.projectId,
                state: this.getState(),
                setState: (key: string, val: any) => this.setState(key, val),
                console: console
            };

            if (value.async) {
                // 비동기 함수 실행
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const func = new AsyncFunction(
                    'event', 'element', 'elementId', 'pageId', 'projectId', 'state', 'setState', 'console',
                    value.code
                );

                return await func(
                    safeContext.event,
                    safeContext.element,
                    safeContext.elementId,
                    safeContext.pageId,
                    safeContext.projectId,
                    safeContext.state,
                    safeContext.setState,
                    safeContext.console
                );
            } else {
                // 동기 함수 실행
                const func = new Function(
                    'event', 'element', 'elementId', 'pageId', 'projectId', 'state', 'setState', 'console',
                    value.code
                );

                return func(
                    safeContext.event,
                    safeContext.element,
                    safeContext.elementId,
                    safeContext.pageId,
                    safeContext.projectId,
                    safeContext.state,
                    safeContext.setState,
                    safeContext.console
                );
            }
        } catch (error) {
            console.error('커스텀 함수 실행 오류:', error);
            throw error;
        }
    }

    // 상태 업데이트 액션 실행
    private executeUpdateStateAction(action: EventAction, context: EventContext): any {
        const value = action.value as any;
        if (!value?.key) {
            console.warn('상태 키가 없습니다');
            return null;
        }

        if (value.merge && typeof this.globalState[value.key] === 'object' && typeof value.value === 'object') {
            // 객체 병합
            this.setState(value.key, { ...this.globalState[value.key], ...value.value });
        } else {
            // 값 교체
            this.setState(value.key, value.value);
        }

        return this.globalState[value.key];
    }

    // 네비게이션 액션 실행
    private executeNavigateAction(action: EventAction, context: EventContext): any {
        const value = action.value as any;
        if (!value?.url) {
            console.warn('네비게이션 URL이 없습니다');
            return null;
        }

        if (value.newTab) {
            window.open(value.url, '_blank');
        } else if (value.replace) {
            window.location.replace(value.url);
        } else {
            window.location.href = value.url;
        }

        return { url: value.url, newTab: value.newTab, replace: value.replace };
    }

    // 다른 액션들 구현 (기본 틀)
    private executeToggleVisibilityAction(action: EventAction, context: EventContext): any {
        console.log('표시/숨김 토글 액션 실행:', action);
        // TODO: 구현
        return null;
    }

    private executeShowModalAction(action: EventAction, context: EventContext): any {
        console.log('모달 표시 액션 실행:', action);
        // TODO: 구현
        return null;
    }

    private executeHideModalAction(action: EventAction, context: EventContext): any {
        console.log('모달 숨김 액션 실행:', action);
        // TODO: 구현
        return null;
    }

    private executeScrollToAction(action: EventAction, context: EventContext): any {
        console.log('스크롤 이동 액션 실행:', action);
        // TODO: 구현
        return null;
    }

    private executeCopyToClipboardAction(action: EventAction, context: EventContext): any {
        console.log('클립보드 복사 액션 실행:', action);
        // TODO: 구현
        return null;
    }

    private executeUpdatePropsAction(action: EventAction, context: EventContext): any {
        console.log('속성 업데이트 액션 실행:', action);
        // TODO: 구현
        return null;
    }
}

export default EventEngine;
