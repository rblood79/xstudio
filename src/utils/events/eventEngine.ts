import {
    EventAction,
    ElementEvent,
    EventContext,
    EventExecutionResult,
    isImplementedActionType
} from '../../types/events/events.types';

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
            // Legacy snake_case
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

            // New camelCase (Inspector)
            'updateState': this.executeUpdateStateAction.bind(this),
            'setState': this.executeUpdateStateAction.bind(this),
            'scrollTo': this.executeScrollToAction.bind(this),
            'showModal': this.executeShowModalAction.bind(this),
            'hideModal': this.executeHideModalAction.bind(this),
            'showToast': this.executeShowToastAction.bind(this),
            'toggleVisibility': this.executeToggleVisibilityAction.bind(this),
            'validateForm': this.executeValidateFormAction.bind(this),
            'resetForm': this.executeResetFormAction.bind(this),
            'submitForm': this.executeSubmitFormAction.bind(this),
            'copyToClipboard': this.executeCopyToClipboardAction.bind(this),
            'customFunction': this.executeCustomFunctionAction.bind(this),
            'apiCall': this.executeAPICallAction.bind(this),

            // Component Interaction (Phase 3)
            'setComponentState': this.executeSetComponentStateAction.bind(this),
            'triggerComponentAction': this.executeTriggerComponentActionAction.bind(this),
            'updateFormField': this.executeUpdateFormFieldAction.bind(this),
            // Collection Interaction (Phase 4)
            'filterCollection': this.executeFilterCollectionAction.bind(this),
            'selectItem': this.executeSelectItemAction.bind(this),
            'clearSelection': this.executeClearSelectionAction.bind(this),
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
            // enabled가 명시적으로 false인 경우만 스킵 (undefined는 true로 간주)
            if (action.enabled === false) {
                continue;
            }

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
                console.error(`[EventEngine] Action execution failed:`, err);
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
        // Registry 기반 타입 검증
        if (!isImplementedActionType(actionType)) {
            throw new Error(`Action type not implemented: ${actionType}`);
        }

        const handler = this.actionHandlers[actionType];
        if (!handler) {
            throw new Error(`Unknown action type: ${actionType}`);
        }

        return await handler(action, context);
    }

    // 보안 강화된 custom_function 실행
    private async executeCustomFunctionAction(action: EventAction, context: EventContext): Promise<unknown> {
        const actionData = action as { config?: Record<string, unknown>; value?: Record<string, unknown> };
        const config = (actionData.config || actionData.value || {}) as { code: string; params?: Record<string, unknown> };
        const code = config.code;

        if (!code) {
            throw new Error('Custom function code is required');
        }

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
                params: config.params || {},
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
                const { event, element, state, params, console, document } = context;
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
        // 두 가지 타입 시스템 지원:
        // 1. 기존: action.value
        // 2. 새로운: action.config
        const actionData = action as { config?: Record<string, unknown>; value?: Record<string, unknown> };
        const value = (actionData.config || actionData.value || {}) as {
            path?: string;
            url?: string; // 하위 호환성
            openInNewTab?: boolean;
            newTab?: boolean; // 하위 호환성
            replace?: boolean;
        };

        // path 또는 url (하위 호환)
        const path = value.path || value.url;
        // openInNewTab 또는 newTab (하위 호환)
        const openInNewTab = value.openInNewTab || value.newTab;
        const replace = value.replace;

        if (!path || typeof path !== 'string') {
            throw new Error('Invalid path');
        }

        // 새 탭에서 열기
        if (openInNewTab) {
            window.open(path, '_blank');
            return;
        }

        // 내부 페이지인지 외부 URL인지 구분
        const isInternalPage = this.isInternalPath(path);

        if (isInternalPage) {
            // 빌더 모드 (iframe 안)에서 실행 중인지 확인
            if (this.isBuilderMode()) {
                // postMessage로 부모에게 페이지 전환 요청
                window.parent.postMessage({
                    type: 'NAVIGATE_TO_PAGE',
                    payload: { path, replace }
                }, '*');
            } else {
                // 퍼블리시 모드에서는 React Router 사용 (향후 구현)
                console.warn('[EventEngine] Navigate in published mode not yet implemented');
                // TODO: 향후 퍼블리시 모드에서 React Router navigate() 호출
            }
        } else {
            // 외부 URL - 기존 방식
            try {
                new URL(path);
                window.location.href = path;
            } catch {
                throw new Error('Invalid URL');
            }
        }
    }

    /**
     * 빌더 모드(iframe 안)에서 실행 중인지 확인
     */
    private isBuilderMode(): boolean {
        return window.self !== window.top && window.parent !== window.self;
    }

    /**
     * 내부 페이지 경로인지 확인 (slug 기반)
     * 예: "/", "/dashboard", "/about" 등
     */
    private isInternalPath(path: string): boolean {
        // 외부 URL 패턴 (http://, https://, //, mailto:, tel: 등)
        const externalUrlPattern = /^(https?:\/\/|\/\/|mailto:|tel:)/i;

        // 외부 URL이 아니고 슬래시로 시작하면 내부 페이지
        return !externalUrlPattern.test(path) && path.startsWith('/');
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

    private async executeSubmitFormAction(action: EventAction): Promise<void> {
        const actionData = action as { config?: Record<string, unknown>; value?: Record<string, unknown> };
        const config = (actionData.config || actionData.value || {}) as { formId: string };
        const form = document.getElementById(config.formId) as HTMLFormElement;

        if (form) {
            form.requestSubmit();
        }
    }

    private async executeShowToastAction(action: EventAction): Promise<void> {
        const actionData = action as { config?: Record<string, unknown>; value?: Record<string, unknown> };
        const config = (actionData.config || actionData.value || {}) as {
            message: string;
            variant?: 'info' | 'success' | 'warning' | 'error';
            duration?: number;
        };

        // postMessage로 Builder에 토스트 표시 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'SHOW_TOAST',
                payload: config
            }, '*');
        } else {
            console.log(`[Toast ${config.variant || 'info'}]: ${config.message}`);
        }
    }

    private async executeAPICallAction(action: EventAction): Promise<unknown> {
        const actionData = action as { config?: Record<string, unknown>; value?: Record<string, unknown> };
        const config = (actionData.config || actionData.value || {}) as {
            endpoint: string;
            method?: string;
            headers?: Record<string, string>;
            body?: unknown;
        };

        try {
            const response = await fetch(config.endpoint, {
                method: config.method || 'GET',
                headers: config.headers,
                body: config.body ? JSON.stringify(config.body) : undefined,
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[EventEngine] API call failed:', error);
            throw error;
        }
    }

    // ===== Phase 3: Component Interaction Actions =====

    private async executeSetComponentStateAction(action: EventAction): Promise<void> {
        const config = action.value as { targetId: string; statePath: string; value: unknown };

        // postMessage로 Preview에 상태 변경 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'SET_COMPONENT_STATE',
                payload: config
            }, '*');
        } else {
            console.warn('[EventEngine] setComponentState in published mode not yet implemented');
        }
    }

    private async executeTriggerComponentActionAction(action: EventAction): Promise<void> {
        const config = action.value as { targetId: string; action: string; params?: Record<string, unknown> };

        // postMessage로 Preview에 액션 실행 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'TRIGGER_COMPONENT_ACTION',
                payload: config
            }, '*');
        } else {
            console.warn('[EventEngine] triggerComponentAction in published mode not yet implemented');
        }
    }

    private async executeUpdateFormFieldAction(action: EventAction): Promise<void> {
        const config = action.value as { formId?: string; fieldName: string; value: unknown };

        let field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;

        if (config.formId) {
            const form = document.getElementById(config.formId) as HTMLFormElement;
            if (form) {
                field = form.querySelector(`[name="${config.fieldName}"]`);
            }
        } else {
            field = document.querySelector(`[name="${config.fieldName}"]`);
        }

        if (field) {
            field.value = String(config.value);
            // trigger change event
            field.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn(`[EventEngine] Form field not found: ${config.fieldName}`);
        }
    }

    // ===== Phase 4: Collection Interaction Actions =====

    private async executeFilterCollectionAction(action: EventAction): Promise<void> {
        const config = action.value as {
            targetId: string;
            filterMode: 'text' | 'function' | 'field';
            query?: string;
            filterFn?: string;
            fieldName?: string;
            fieldValue?: unknown;
        };

        // postMessage로 Preview에 필터링 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'FILTER_COLLECTION',
                payload: config
            }, '*');
        } else {
            console.warn('[EventEngine] filterCollection in published mode not yet implemented');
        }
    }

    private async executeSelectItemAction(action: EventAction): Promise<void> {
        const config = action.value as {
            targetId: string;
            itemId?: string;
            itemIndex?: number;
            behavior: 'replace' | 'add' | 'toggle';
        };

        // postMessage로 Preview에 선택 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'SELECT_ITEM',
                payload: config
            }, '*');
        } else {
            console.warn('[EventEngine] selectItem in published mode not yet implemented');
        }
    }

    private async executeClearSelectionAction(action: EventAction): Promise<void> {
        const config = action.value as { targetId: string };

        // postMessage로 Preview에 선택 해제 요청
        if (this.isBuilderMode()) {
            window.parent.postMessage({
                type: 'CLEAR_SELECTION',
                payload: config
            }, '*');
        } else {
            console.warn('[EventEngine] clearSelection in published mode not yet implemented');
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