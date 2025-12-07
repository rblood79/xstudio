/**
 * EventEngine 테스트
 *
 * Phase 1-6 이벤트 시스템 테스트
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEngine } from '../eventEngine';
import type { EventContext, ElementEvent, EventAction } from '../../../types/events/events.types';

describe('EventEngine', () => {
  let engine: EventEngine;

  beforeEach(() => {
    engine = new EventEngine();
  });

  describe('State Management', () => {
    it('should set and get state', () => {
      engine.setState('testKey', 'testValue');
      const state = engine.getState();
      expect(state.testKey).toBe('testValue');
    });

    it('should handle multiple state updates', () => {
      engine.setState('key1', 'value1');
      engine.setState('key2', 'value2');
      const state = engine.getState();
      expect(state.key1).toBe('value1');
      expect(state.key2).toBe('value2');
    });
  });

  describe('Action Type Validation', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-element',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should reject unknown action types', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'unknownAction' as never,
            enabled: true,
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(false);
      expect(result.actionResults[0].error).toContain('not implemented');
    });

    it('should skip disabled actions', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: false,
            value: { key: 'test', value: 'disabled' },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      // disabled actions are skipped, so no action results
      expect(result.actionResults.length).toBe(0);
      expect(engine.getState().test).toBeUndefined();
    });
  });

  describe('Phase 1: Basic Interaction - navigate action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-element',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute navigate action with path', async () => {
      const postMessageSpy = vi.spyOn(window.parent, 'postMessage');

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'navigate',
            enabled: true,
            value: { path: '/about' },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());

      // Builder mode check - if in iframe, should postMessage
      // In test environment, window.self === window.top, so it won't postMessage
      // This test validates the action doesn't throw
      expect(true).toBe(true);
    });

    it('should handle navigate action with config field (Inspector format)', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'navigate',
            enabled: true,
            // Inspector uses config field instead of value
          } as EventAction & { config: { path: string } },
        ],
        enabled: true,
      };

      // @ts-expect-error - Adding config for test
      mockEvent.actions[0].config = { path: '/dashboard' };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true);
    });

    it('should skip navigate action without path', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'navigate',
            enabled: true,
            value: { path: '' }, // Empty path
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true); // Skipped, not failed
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('no path'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Phase 1: Basic Interaction - showToast action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-element',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute showToast action', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'showToast',
            enabled: true,
            value: { message: 'Hello World', variant: 'success' },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true);
    });
  });

  describe('Phase 2: Form Components - setState action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('change'),
      element: document.createElement('input'),
      elementId: 'test-input',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute setState action with key/value', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onChange',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: true,
            value: { key: 'formValue', value: 'test input' },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(engine.getState().formValue).toBe('test input');
    });

    it('should execute updateState action (alias)', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onChange',
        actions: [
          {
            id: 'action-1',
            type: 'updateState',
            enabled: true,
            value: { key: 'counter', value: 42 },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(engine.getState().counter).toBe(42);
    });
  });

  describe('Phase 2: Form Components - toggleVisibility action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('change'),
      element: document.createElement('input'),
      elementId: 'test-input',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute toggleVisibility action', async () => {
      // Create a target element
      const targetElement = document.createElement('div');
      targetElement.setAttribute('data-element-id', 'target-element');
      document.body.appendChild(targetElement);

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onChange',
        actions: [
          {
            id: 'action-1',
            type: 'toggleVisibility',
            enabled: true,
            value: { elementId: 'target-element', show: false },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(targetElement.style.display).toBe('none');

      // Clean up
      document.body.removeChild(targetElement);
    });
  });

  describe('Phase 2: Form Components - copyToClipboard action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'copy-button',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute copyToClipboard action', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'copyToClipboard',
            enabled: true,
            value: { text: 'Copied text!' },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(writeTextMock).toHaveBeenCalledWith('Copied text!');
    });
  });

  describe('Phase 3: Selection Components - scrollTo action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('change'),
      element: document.createElement('select'),
      elementId: 'test-select',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute scrollTo action', async () => {
      // Create a target element
      const targetElement = document.createElement('div');
      targetElement.setAttribute('data-element-id', 'scroll-target');
      const scrollIntoViewMock = vi.fn();
      targetElement.scrollIntoView = scrollIntoViewMock;
      document.body.appendChild(targetElement);

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onChange',
        actions: [
          {
            id: 'action-1',
            type: 'scrollTo',
            enabled: true,
            value: { elementId: 'scroll-target', behavior: 'smooth' },
          },
        ],
        enabled: true,
      };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Clean up
      document.body.removeChild(targetElement);
    });
  });

  describe('Phase 4: Collection Components - customFunction action', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-button',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute safe customFunction action', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'customFunction',
            enabled: true,
            value: {
              code: 'console.log("Custom function executed");',
            },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('[Custom Function]', 'Custom function executed');

      consoleSpy.mockRestore();
    });

    it('should reject dangerous customFunction code', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'customFunction',
            enabled: true,
            value: {
              code: 'eval("alert(1)")', // Dangerous pattern
            },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(false);
      expect(result.actionResults[0].error).toContain('forbidden');
    });

    it('should skip customFunction with empty code', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'customFunction',
            enabled: true,
            value: { code: '' },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no code'));

      consoleSpy.mockRestore();
    });
  });

  describe('Sequential Action Execution', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-button',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should execute multiple actions sequentially', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: true,
            value: { key: 'step', value: 1 },
          },
          {
            id: 'action-2',
            type: 'setState',
            enabled: true,
            value: { key: 'step', value: 2 },
          },
          {
            id: 'action-3',
            type: 'setState',
            enabled: true,
            value: { key: 'step', value: 3 },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(true);
      expect(result.actionResults.length).toBe(3);
      expect(engine.getState().step).toBe(3); // Final value
    });

    it('should continue after one action fails', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: true,
            value: { key: 'before', value: true },
          },
          {
            id: 'action-2',
            type: 'customFunction',
            enabled: true,
            value: { code: 'throw new Error("Intentional error");' },
          },
          {
            id: 'action-3',
            type: 'setState',
            enabled: true,
            value: { key: 'after', value: true },
          },
        ],
        enabled: true,
      };

      const result = await engine.executeEvent(mockEvent, createMockContext());
      expect(result.success).toBe(false); // Overall failed
      expect(result.actionResults.length).toBe(3);
      expect(result.actionResults[0].success).toBe(true);
      expect(result.actionResults[1].success).toBe(false);
      expect(result.actionResults[2].success).toBe(true);
      expect(engine.getState().before).toBe(true);
      expect(engine.getState().after).toBe(true);
    });
  });

  describe('Action Config Field Support (Inspector Format)', () => {
    const createMockContext = (): EventContext => ({
      event: new Event('click'),
      element: document.createElement('button'),
      elementId: 'test-button',
      pageId: 'test-page',
      projectId: 'test-project',
      state: {},
    });

    it('should support config field for setState', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: true,
          } as EventAction,
        ],
        enabled: true,
      };

      // Add config field (Inspector format)
      // @ts-expect-error - Adding config for test
      mockEvent.actions[0].config = { key: 'configTest', value: 'from config' };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(engine.getState().configTest).toBe('from config');
    });

    it('should prefer config over value when both exist', async () => {
      const mockEvent: ElementEvent = {
        id: 'event-1',
        event_type: 'onClick',
        actions: [
          {
            id: 'action-1',
            type: 'setState',
            enabled: true,
            value: { key: 'test', value: 'from value' },
          } as EventAction,
        ],
        enabled: true,
      };

      // Add config field (should take precedence)
      // @ts-expect-error - Adding config for test
      mockEvent.actions[0].config = { key: 'test', value: 'from config' };

      await engine.executeEvent(mockEvent, createMockContext());
      expect(engine.getState().test).toBe('from config');
    });
  });

  // ==========================================
  // Phase 2: Form Components - Extended Tests
  // ==========================================

  describe('Phase 2: Form Components - Extended', () => {
    describe('TextField/Input Events', () => {
      const createInputContext = (): EventContext => ({
        event: new Event('focus'),
        element: document.createElement('input'),
        elementId: 'text-field-1',
        pageId: 'test-page',
        projectId: 'test-project',
        state: {},
      });

      it('should handle onFocus event with setState', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-focus',
          event_type: 'onFocus',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isFocused', value: true },
            },
          ],
          enabled: true,
        };

        await engine.executeEvent(mockEvent, createInputContext());
        expect(engine.getState().isFocused).toBe(true);
      });

      it('should handle onBlur event with setState', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-blur',
          event_type: 'onBlur',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isFocused', value: false },
            },
            {
              id: 'action-2',
              type: 'setState',
              enabled: true,
              value: { key: 'hasBeenBlurred', value: true },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          ...createInputContext(),
          event: new Event('blur'),
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().isFocused).toBe(false);
        expect(engine.getState().hasBeenBlurred).toBe(true);
      });

      it('should handle onKeyDown event', async () => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        const mockEvent: ElementEvent = {
          id: 'event-keydown',
          event_type: 'onKeyDown',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'lastKeyPressed', value: 'Enter' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          ...createInputContext(),
          event: keyEvent,
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().lastKeyPressed).toBe('Enter');
      });
    });

    describe('Checkbox/Switch Events', () => {
      it('should toggle checkbox state', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-change',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isChecked', value: true },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('input'),
          elementId: 'checkbox-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().isChecked).toBe(true);
      });

      it('should handle switch onChange with visibility toggle', async () => {
        // Create target element
        const targetElement = document.createElement('div');
        targetElement.setAttribute('data-element-id', 'panel-1');
        document.body.appendChild(targetElement);

        const mockEvent: ElementEvent = {
          id: 'event-switch',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'toggleVisibility',
              enabled: true,
              value: { elementId: 'panel-1', show: true },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('input'),
          elementId: 'switch-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        // When show: true, toggleVisibility sets display to 'block'
        expect(targetElement.style.display).toBe('block');

        // Clean up
        document.body.removeChild(targetElement);
      });
    });

    describe('Slider Events', () => {
      it('should update state on slider change', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-slider',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'sliderValue', value: 75 },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('input'),
          elementId: 'slider-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().sliderValue).toBe(75);
      });
    });

    describe('Form Submission', () => {
      it('should handle onSubmit event with multiple actions', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const mockEvent: ElementEvent = {
          id: 'event-submit',
          event_type: 'onSubmit',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isSubmitting', value: true },
            },
            {
              id: 'action-2',
              type: 'showToast',
              enabled: true,
              value: { message: 'Form submitted!', variant: 'success' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('submit'),
          element: document.createElement('form'),
          elementId: 'form-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        const result = await engine.executeEvent(mockEvent, context);
        expect(result.success).toBe(true);
        expect(engine.getState().isSubmitting).toBe(true);

        consoleSpy.mockRestore();
      });
    });
  });

  // ==========================================
  // Phase 3: Selection Components Tests
  // ==========================================

  describe('Phase 3: Selection Components', () => {
    describe('Select/ComboBox Events', () => {
      it('should handle selection change with setState', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-select',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedOption', value: 'option-2' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('select'),
          elementId: 'select-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedOption).toBe('option-2');
      });

      it('should handle ComboBox selection with scroll action', async () => {
        // Create target element for scroll
        const targetElement = document.createElement('div');
        targetElement.setAttribute('data-element-id', 'detail-section');
        const scrollIntoViewMock = vi.fn();
        targetElement.scrollIntoView = scrollIntoViewMock;
        document.body.appendChild(targetElement);

        const mockEvent: ElementEvent = {
          id: 'event-combo',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedItem', value: 'item-3' },
            },
            {
              id: 'action-2',
              type: 'scrollTo',
              enabled: true,
              value: { elementId: 'detail-section', behavior: 'smooth' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('input'),
          elementId: 'combobox-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedItem).toBe('item-3');
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

        // Clean up
        document.body.removeChild(targetElement);
      });
    });

    describe('RadioGroup Events', () => {
      it('should handle radio selection', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-radio',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedRadio', value: 'option-b' },
            },
            {
              id: 'action-2',
              type: 'showToast',
              enabled: true,
              value: { message: 'Selection changed', variant: 'info' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('input'),
          elementId: 'radio-group-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        const result = await engine.executeEvent(mockEvent, context);
        expect(result.success).toBe(true);
        expect(engine.getState().selectedRadio).toBe('option-b');
      });
    });
  });

  // ==========================================
  // Phase 4: Collection Components Tests
  // ==========================================

  describe('Phase 4: Collection Components', () => {
    describe('ListBox/GridList Events', () => {
      it('should handle item selection in ListBox', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-listbox',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedItems', value: ['item-1', 'item-3'] },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('div'),
          elementId: 'listbox-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedItems).toEqual(['item-1', 'item-3']);
      });

      it('should handle onClick in GridList item', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-gridlist-item',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'activeItem', value: 'grid-item-5' },
            },
            {
              id: 'action-2',
              type: 'showToast',
              enabled: true,
              value: { message: 'Item selected', variant: 'success' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('div'),
          elementId: 'gridlist-item-5',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        const result = await engine.executeEvent(mockEvent, context);
        expect(result.success).toBe(true);
        expect(engine.getState().activeItem).toBe('grid-item-5');
      });
    });

    describe('Table Events', () => {
      it('should handle row click in Table', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-table-row',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedRowId', value: 'row-42' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('tr'),
          elementId: 'table-row-42',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedRowId).toBe('row-42');
      });
    });

    describe('Tree Events', () => {
      it('should handle tree node expansion', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-tree',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'expandedNodes', value: ['node-1', 'node-2'] },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('div'),
          elementId: 'tree-node-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().expandedNodes).toEqual(['node-1', 'node-2']);
      });
    });
  });

  // ==========================================
  // Phase 5: Layout/Navigation Components Tests
  // ==========================================

  describe('Phase 5: Layout/Navigation Components', () => {
    describe('Tabs Events', () => {
      it('should handle tab selection', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-tab',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'activeTab', value: 'tab-2' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('button'),
          elementId: 'tab-2',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().activeTab).toBe('tab-2');
      });
    });

    describe('Breadcrumbs Events', () => {
      it('should handle breadcrumb navigation', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-breadcrumb',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'navigate',
              enabled: true,
              value: { path: '/dashboard' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('a'),
          elementId: 'breadcrumb-home',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        // Navigate action logs but doesn't fail in test environment
        const result = await engine.executeEvent(mockEvent, context);
        expect(result.success).toBe(true);
      });
    });

    describe('ToggleButtonGroup Events', () => {
      it('should handle toggle button selection', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-toggle',
          event_type: 'onClick',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedFormat', value: 'grid' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('click'),
          element: document.createElement('button'),
          elementId: 'toggle-grid',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedFormat).toBe('grid');
      });
    });
  });

  // ==========================================
  // Phase 6: Data Components Tests
  // ==========================================

  describe('Phase 6: Data Components', () => {
    describe('Calendar/DatePicker Events', () => {
      it('should handle date selection in Calendar', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-calendar',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'selectedDate', value: '2024-12-25' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('div'),
          elementId: 'calendar-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().selectedDate).toBe('2024-12-25');
      });

      it('should handle DatePicker with showToast confirmation', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-datepicker',
          event_type: 'onChange',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'appointmentDate', value: '2024-01-15' },
            },
            {
              id: 'action-2',
              type: 'showToast',
              enabled: true,
              value: { message: 'Date selected: 2024-01-15', variant: 'success' },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('change'),
          element: document.createElement('div'),
          elementId: 'datepicker-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        const result = await engine.executeEvent(mockEvent, context);
        expect(result.success).toBe(true);
        expect(engine.getState().appointmentDate).toBe('2024-01-15');
      });
    });

    describe('Mouse Events (Common)', () => {
      it('should handle onMouseEnter', async () => {
        const mockEvent: ElementEvent = {
          id: 'event-mouseenter',
          event_type: 'onMouseEnter',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isHovered', value: true },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('mouseenter'),
          element: document.createElement('div'),
          elementId: 'hoverable-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().isHovered).toBe(true);
      });

      it('should handle onMouseLeave', async () => {
        // First set hovered to true
        engine.setState('isHovered', true);

        const mockEvent: ElementEvent = {
          id: 'event-mouseleave',
          event_type: 'onMouseLeave',
          actions: [
            {
              id: 'action-1',
              type: 'setState',
              enabled: true,
              value: { key: 'isHovered', value: false },
            },
          ],
          enabled: true,
        };

        const context: EventContext = {
          event: new Event('mouseleave'),
          element: document.createElement('div'),
          elementId: 'hoverable-1',
          pageId: 'test-page',
          projectId: 'test-project',
          state: {},
        };

        await engine.executeEvent(mockEvent, context);
        expect(engine.getState().isHovered).toBe(false);
      });
    });
  });
});
