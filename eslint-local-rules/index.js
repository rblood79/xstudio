/**
 * Local ESLint Rules for XStudio
 *
 * Custom rules to prevent anti-patterns discovered during refactoring.
 *
 * @see CHANGELOG.md - Anti-Patterns Discovered & Documented
 */

export default {
  'no-zustand-grouped-selectors': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow Zustand grouped selectors with object returns (causes infinite loops)',
        category: 'Best Practices',
        recommended: true,
      },
      messages: {
        groupedSelector: 'Avoid Zustand grouped selectors with object returns. Use individual selectors instead to prevent infinite loops. See CHANGELOG.md for details.',
      },
      schema: [],
    },
    create(context) {
      return {
        CallExpression(node) {
          // Detect: useStore((state) => ({ field1: state.field1, ... }))
          if (
            node.callee.name === 'useStore' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'ArrowFunctionExpression'
          ) {
            const selectorFn = node.arguments[0];
            const body = selectorFn.body;

            // Check if returning an object expression directly
            if (body.type === 'ObjectExpression') {
              context.report({
                node,
                messageId: 'groupedSelector',
              });
            }
          }
        },
      };
    },
  },

  'no-zustand-use-shallow': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow useShallow wrapper with Zustand (causes infinite loops)',
        category: 'Best Practices',
        recommended: true,
      },
      messages: {
        useShallowDetected: 'Avoid useShallow wrapper with Zustand. Use individual selectors instead. See CHANGELOG.md for details.',
      },
      schema: [],
    },
    create(context) {
      return {
        CallExpression(node) {
          // Detect: useStore(useShallow(...))
          if (
            node.callee.name === 'useStore' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'CallExpression' &&
            node.arguments[0].callee.name === 'useShallow'
          ) {
            context.report({
              node,
              messageId: 'useShallowDetected',
            });
          }
        },
      };
    },
  },

  'prefer-keyboard-shortcuts-registry': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Suggest using useKeyboardShortcutsRegistry instead of manual event listeners',
        category: 'Best Practices',
        recommended: false,
      },
      messages: {
        manualListener: 'Consider using useKeyboardShortcutsRegistry hook instead of manual keyboard event listeners. See src/builder/hooks/useKeyboardShortcutsRegistry.ts',
      },
      schema: [],
    },
    create(context) {
      return {
        CallExpression(node) {
          // Detect: window.addEventListener('keydown', ...)
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'window' &&
            node.callee.property.name === 'addEventListener' &&
            node.arguments.length >= 2 &&
            node.arguments[0].type === 'Literal' &&
            node.arguments[0].value === 'keydown'
          ) {
            context.report({
              node,
              messageId: 'manualListener',
            });
          }
        },
      };
    },
  },

  'prefer-copy-paste-hook': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Suggest using useCopyPaste hook for clipboard operations',
        category: 'Best Practices',
        recommended: false,
      },
      messages: {
        manualClipboard: 'Consider using useCopyPaste hook instead of manual clipboard operations. See src/builder/hooks/useCopyPaste.ts',
      },
      schema: [],
    },
    create(context) {
      return {
        MemberExpression(node) {
          // Detect: navigator.clipboard.writeText(...) or navigator.clipboard.readText(...)
          if (
            node.object.type === 'MemberExpression' &&
            node.object.object.name === 'navigator' &&
            node.object.property.name === 'clipboard' &&
            (node.property.name === 'writeText' || node.property.name === 'readText')
          ) {
            context.report({
              node,
              messageId: 'manualClipboard',
            });
          }
        },
      };
    },
  },

  'no-eventtype-legacy-import': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow importing EventType from legacy paths',
        category: 'Best Practices',
        recommended: true,
      },
      messages: {
        legacyImport: 'Import EventType from "@/types/events/events.types" instead of legacy paths. See CHANGELOG.md for details.',
      },
      schema: [],
    },
    create(context) {
      return {
        ImportDeclaration(node) {
          // Detect imports from legacy event type paths
          const source = node.source.value;
          if (
            typeof source === 'string' &&
            (source.includes('/events/types/eventTypes') ||
             source.includes('/inspector/events/types/eventTypes'))
          ) {
            // Check if importing EventType specifically
            const hasEventTypeImport = node.specifiers.some(
              (spec) =>
                spec.type === 'ImportSpecifier' &&
                spec.imported.name === 'EventType'
            );

            if (hasEventTypeImport) {
              context.report({
                node,
                messageId: 'legacyImport',
              });
            }
          }
        },
      };
    },
  },
};
