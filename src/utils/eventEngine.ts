import {
    EventAction,
    ElementEvent,
    EventContext,
    EventExecutionResult
} from '../types/events';

export class EventEngine {
    private static instance: EventEngine;
    private state: Record<string, unknown> = {};
    private actionHandlers: Record<string, (action: EventAction, context: EventContext) => unknown> = {};
    private executionTimeouts = new Map<string, NodeJS.Timeout>();

    static getInstance(): EventEngine {
        if (!EventEngine.instance) {
            EventEngine.instance = new EventEngine();
        }
        return EventEngine.instance;
    }

    constructor() {
        this.initializeActionHandlers();
    }

    private initializeActionHandlers() {
        this.actionHandlers = {
            'update_state': this.executeUpdateStateAction.bind(this),
            'navigate': this.executeNavigateAction.bind(this),
            'toggle_visibility': this.executeToggleVisibilityAction.bind(this),
            'show_modal': this.executeShowModalAction.bind(this),
            'hide_modal': this.executeHideModalAction.bind(this),
            'scroll_to': this.executeScrollToAction.bind(this),
            'copy_to_clipboard': this.executeCopyToClipboardAction.bind(this),
            'custom_function': this.executeCustomFunctionAction.bind(this),
            'validate_form': this.executeValidateFormAction.bind(this),
            'reset_form': this.executeResetFormAction.bind(this),
        };
    }

    setState(key: string, value: unknown) {
        this.state[key] = value;
    }

    getState() {
        return { ...this.state };
    }

    async executeEvent(event: ElementEvent, context: EventContext): Promise<EventExecutionResult> {
        const startTime = Date.now();
        const actionResults: Array<{
            actionId: string;
            success: boolean;
            error?: string;
            data?: unknown;
        }> = [];

        // 이벤트 실행 타임아웃 설정
        const eventTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Event execution timeout')), 10000)
        );

        try {
            await Promise.race([
                this.executeEventActions(event, context, actionResults),
                eventTimeout
            ]);
        } catch (error) {
            actionResults.push({
                actionId: 'event',
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }

        const totalExecutionTime = Date.now() - startTime;

        return {
            success: actionResults.every(result => result.success),
            actionResults,
            totalExecutionTime
        };
    }

    private async executeEventActions(
        event: ElementEvent,
        context: EventContext,
        actionResults: Array<{
            actionId: string;
            success: boolean;
            error?: string;
            data?: unknown;
        }>
    ): Promise<void> {
        for (const action of event.actions) {
            if (!action.enabled) continue;

            try {
                const result = await this.executeActionWithTimeout(action, context);
                actionResults.push({
                    actionId: action.id,
                    success: true,
                    data: result
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                actionResults.push({
                    actionId: action.id,
                    success: false,
                    error: err.message
                });
                console.error(`Action execution failed:`, err);
            }
        }
    }

    private async executeActionWithTimeout(
        action: EventAction,
        context: EventContext
    ): Promise<unknown> {
        const actionId = action.id;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.executionTimeouts.delete(actionId);
                reject(new Error(`Action timeout: ${action.type}`));
            }, 5000);

            this.executionTimeouts.set(actionId, timeout);

            this.executeAction(action.type, action, context)
                .then(result => {
                    clearTimeout(timeout);
                    this.executionTimeouts.delete(actionId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    this.executionTimeouts.delete(actionId);
                    reject(error);
                });
        });
    }

    private async executeAction(actionType: string, action: EventAction, context: EventContext): Promise<unknown> {
        const handler = this.actionHandlers[actionType];
        if (!handler) {
            throw new Error(`Unknown action type: ${actionType}`);
        }

        return await handler(action, context);
    }

    // 보안 강화된 custom_function 실행
    private async executeCustomFunctionAction(action: EventAction, context: EventContext): Promise<unknown> {
        const { code } = action.value as { code: string };

        // 코드 검증
        if (!this.isValidCustomCode(code)) {
            throw new Error('Invalid custom code: contains forbidden patterns');
        }

        try {
            // 안전한 실행 컨텍스트 생성
            const safeContext = {
                event: context.event,
                element: context.element,
                state: this.getState(),
                console: {
                    log: (...args: unknown[]) => console.log('[Custom Function]', ...args),
                    error: (...args: unknown[]) => console.error('[Custom Function]', ...args),
                    warn: (...args: unknown[]) => console.warn('[Custom Function]', ...args),
                },
                // 제한된 DOM API만 제공
                document: {
                    getElementById: (id: string) => {
                        const element = document.getElementById(id);
                        return element ? {
                            style: element.style,
                            textContent: element.textContent,
                            value: (element as HTMLInputElement).value
                        } : null;
                    }
                }
            };

            // with 문 대신 직접 컨텍스트 객체를 사용
            const func = new Function('context', `
                "use strict";
                const { event, element, state, console, document } = context;
                ${code}
            `);

            return func(safeContext);
        } catch (error) {
            throw new Error(`Custom function execution failed: ${error}`);
        }
    }

    private isValidCustomCode(code: string): boolean {
        // 위험한 패턴 검사
        const dangerousPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /setTimeout\s*\(/,
            /setInterval\s*\(/,
            /import\s*\(/,
            /require\s*\(/,
            /window\./,
            /document\./,
            /localStorage/,
            /sessionStorage/,
            /fetch\s*\(/,
            /XMLHttpRequest/,
            /\.innerHTML/,
            /\.outerHTML/,
            /\.insertAdjacentHTML/
        ];

        return !dangerousPatterns.some(pattern => pattern.test(code));
    }

    // 나머지 액션 핸들러들...
    private async executeUpdateStateAction(action: EventAction): Promise<void> {
        const { key, value } = action.value as { key: string; value: unknown };
        if (key && typeof key === 'string') {
            this.setState(key, value);
        }
    }

    private async executeNavigateAction(action: EventAction): Promise<void> {
        const { url } = action.value as { url: string };
        if (url && typeof url === 'string') {
            // URL 검증
            try {
                new URL(url);
                window.location.href = url;
            } catch {
                throw new Error('Invalid URL');
            }
        }
    }

    // 누락된 메서드들 추가
    private async executeToggleVisibilityAction(action: EventAction, context: EventContext): Promise<void> {
        const { show, elementId } = action.value as { show?: boolean; elementId?: string };
        const targetId = elementId || context.elementId;
        const element = document.querySelector(`[data-element-id="${targetId}"]`) as HTMLElement;

        if (element) {
            element.style.display = show === false ? 'none' : 'block';
        }
    }

    private async executeShowModalAction(action: EventAction): Promise<void> {
        const { modalId, backdrop = true } = action.value as { modalId: string; backdrop?: boolean };

        // 보안 검증: modalId가 유효한지 확인
        if (!modalId || typeof modalId !== 'string') {
            throw new Error('Invalid modal ID');
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            throw new Error(`Modal with ID "${modalId}" not found`);
        }

        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');

        if (backdrop) {
            // 백드롭 생성 및 관리
            const backdropElement = document.createElement('div');
            backdropElement.className = 'modal-backdrop';
            backdropElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            `;

            backdropElement.addEventListener('click', () => {
                this.executeHideModalAction(action);
            });

            document.body.appendChild(backdropElement);
            modal.setAttribute('data-backdrop-id', backdropElement.id || 'backdrop');
        }
    }

    private async executeHideModalAction(action: EventAction): Promise<void> {
        const { modalId } = action.value as { modalId: string };

        if (!modalId || typeof modalId !== 'string') {
            throw new Error('Invalid modal ID');
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID "${modalId}" not found`);
            return;
        }

        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        // 백드롭 제거
        const backdropId = modal.getAttribute('data-backdrop-id');
        if (backdropId) {
            const backdrop = document.getElementById(backdropId);
            if (backdrop) {
                backdrop.remove();
            }
        }
    }

    private async executeScrollToAction(action: EventAction): Promise<void> {
        const { elementId, behavior = 'smooth' } = action.value as { elementId: string; behavior?: ScrollBehavior };
        const element = document.querySelector(`[data-element-id="${elementId}"]`);

        if (element) {
            element.scrollIntoView({ behavior });
        }
    }

    private async executeCopyToClipboardAction(action: EventAction): Promise<void> {
        const { text } = action.value as { text: string };
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            // 폴백 구현
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    private async executeValidateFormAction(action: EventAction): Promise<boolean> {
        const { formId, rules = [] } = action.value as { formId: string; rules: unknown[] };

        if (!formId || typeof formId !== 'string') {
            throw new Error('Invalid form ID');
        }

        const form = document.getElementById(formId) as HTMLFormElement;
        if (!form) {
            throw new Error(`Form with ID "${formId}" not found`);
        }

        let isValid = true;
        const errors: string[] = [];

        for (const rule of rules) {
            const { field, type, message, required, minLength, maxLength, pattern } = rule as {
                field: string;
                type: string;
                message?: string;
                required?: boolean;
                minLength?: number;
                maxLength?: number;
                pattern?: string;
            };
            const fieldElement = form.querySelector(`[name="${field}"]`) as HTMLInputElement;

            if (!fieldElement) {
                errors.push(`Field "${field}" not found`);
                isValid = false;
                continue;
            }

            const value = fieldElement.value.trim();

            // 필수 필드 검증
            if (required && !value) {
                errors.push(message || `Field "${field}" is required`);
                isValid = false;
                continue;
            }

            // 길이 검증
            if (minLength && value.length < minLength) {
                errors.push(message || `Field "${field}" must be at least ${minLength} characters`);
                isValid = false;
            }

            if (maxLength && value.length > maxLength) {
                errors.push(message || `Field "${field}" must be no more than ${maxLength} characters`);
                isValid = false;
            }

            // 패턴 검증
            if (pattern && value && !new RegExp(pattern).test(value)) {
                errors.push(message || `Field "${field}" format is invalid`);
                isValid = false;
            }

            // 타입별 검증
            switch (type) {
                case 'email':
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        errors.push(message || `Field "${field}" must be a valid email`);
                        isValid = false;
                    }
                    break;
                case 'number':
                    if (value && isNaN(Number(value))) {
                        errors.push(message || `Field "${field}" must be a number`);
                        isValid = false;
                    }
                    break;
                case 'url':
                    if (value) {
                        try {
                            new URL(value);
                        } catch {
                            errors.push(message || `Field "${field}" must be a valid URL`);
                            isValid = false;
                        }
                    }
                    break;
            }
        }

        // 에러 표시
        if (!isValid) {
            console.warn('Form validation errors:', errors);
            // 에러를 상태에 저장하거나 UI에 표시
            this.setState('formErrors', { formId, errors });
        }

        return isValid;
    }

    private async executeResetFormAction(action: EventAction): Promise<void> {
        const { formId } = action.value as { formId: string };
        const form = document.getElementById(formId) as HTMLFormElement;

        if (form) {
            form.reset();
        }
    }

    // 정리 메서드
    cleanup() {
        this.executionTimeouts.forEach(timeout => clearTimeout(timeout));
        this.executionTimeouts.clear();

        // 상태 정리
        this.state = {};

        // 액션 핸들러 정리
        this.actionHandlers = {};
    }
}

// 싱글톤 인스턴스
export const eventEngine = new EventEngine();