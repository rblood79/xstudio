/**
 * AI Settings Store
 *
 * 프로바이더/모델 선택, API 키 관리
 * localStorage에 영구 저장 (Pencil의 electron-store 패턴과 동일)
 */

import { create } from 'zustand';

// ─── Provider / Model 정의 ───

export type AIProviderType = 'anthropic' | 'openai' | 'groq' | 'google';

export interface AIModelInfo {
  id: string;
  label: string;
  provider: AIProviderType;
  maxTokens: number;
  supportsToolCalling: boolean;
}

export const AI_PROVIDERS: Record<AIProviderType, { label: string; placeholder: string }> = {
  anthropic: { label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...' },
  openai: { label: 'OpenAI', placeholder: 'sk-proj-...' },
  groq: { label: 'Groq', placeholder: 'gsk_...' },
  google: { label: 'Google (Gemini)', placeholder: 'AIza...' },
};

export const AI_MODELS: AIModelInfo[] = [
  // Anthropic
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic', maxTokens: 8192, supportsToolCalling: true },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic', maxTokens: 8192, supportsToolCalling: true },
  // OpenAI
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', maxTokens: 4096, supportsToolCalling: true },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', maxTokens: 4096, supportsToolCalling: true },
  { id: 'o3-mini', label: 'o3-mini', provider: 'openai', maxTokens: 4096, supportsToolCalling: true },
  // Groq
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'groq', maxTokens: 2048, supportsToolCalling: true },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'groq', maxTokens: 2048, supportsToolCalling: true },
  // Google
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', maxTokens: 8192, supportsToolCalling: true },
  { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash', provider: 'google', maxTokens: 8192, supportsToolCalling: true },
];

// ─── localStorage 키 ───

const STORAGE_KEY = 'xstudio:ai-settings';

interface PersistedSettings {
  provider: AIProviderType;
  modelId: string;
  apiKeys: Partial<Record<AIProviderType, string>>;
}

function loadPersistedSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', apiKeys: {} };
}

function savePersistedSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ─── Store ───

interface AISettingsState {
  provider: AIProviderType;
  modelId: string;
  apiKeys: Partial<Record<AIProviderType, string>>;
  showSettings: boolean;

  // Computed
  currentModel: AIModelInfo | undefined;
  modelsForProvider: AIModelInfo[];
  isConfigured: boolean;

  // Actions
  setProvider: (provider: AIProviderType) => void;
  setModelId: (modelId: string) => void;
  setApiKey: (provider: AIProviderType, key: string) => void;
  clearApiKey: (provider: AIProviderType) => void;
  getApiKey: (provider: AIProviderType) => string | undefined;
  setShowSettings: (show: boolean) => void;
  toggleSettings: () => void;
}

export const useAISettingsStore = create<AISettingsState>((set, get) => {
  const persisted = loadPersistedSettings();

  return {
    provider: persisted.provider,
    modelId: persisted.modelId,
    apiKeys: persisted.apiKeys,
    showSettings: false,

    // Computed (getter-like)
    get currentModel() {
      const state = get();
      return AI_MODELS.find((m) => m.id === state.modelId);
    },
    get modelsForProvider() {
      const state = get();
      return AI_MODELS.filter((m) => m.provider === state.provider);
    },
    get isConfigured() {
      const state = get();
      const key = state.apiKeys[state.provider];
      return !!key && key.length > 0;
    },

    setProvider: (provider) => {
      const models = AI_MODELS.filter((m) => m.provider === provider);
      const firstModel = models[0]?.id ?? '';
      set({ provider, modelId: firstModel });
      const state = get();
      savePersistedSettings({ provider, modelId: firstModel, apiKeys: state.apiKeys });
    },

    setModelId: (modelId) => {
      set({ modelId });
      const state = get();
      savePersistedSettings({ provider: state.provider, modelId, apiKeys: state.apiKeys });
    },

    setApiKey: (provider, key) => {
      set((state) => {
        const apiKeys = { ...state.apiKeys, [provider]: key };
        savePersistedSettings({ provider: state.provider, modelId: state.modelId, apiKeys });
        return { apiKeys };
      });
    },

    clearApiKey: (provider) => {
      set((state) => {
        const apiKeys = { ...state.apiKeys };
        delete apiKeys[provider];
        savePersistedSettings({ provider: state.provider, modelId: state.modelId, apiKeys });
        return { apiKeys };
      });
    },

    getApiKey: (provider) => {
      return get().apiKeys[provider];
    },

    setShowSettings: (show) => set({ showSettings: show }),
    toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  };
});
