import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { TokenList } from './components/TokenList';
import { TokenForm } from './components/TokenForm';
import { ThemeHeader } from './components/ThemeHeader';
import { ThemePreview } from './components/ThemePreview';
import { Palette, Eye, AlertCircle } from 'lucide-react';
import './styles/ThemeEditor.css';

interface Props {
    projectId: string;
}

type TabType = 'tokens' | 'preview';

export default function ThemeEditor({ projectId }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('tokens');

    const {
        activeTheme,
        rawTokens,
        semanticTokens,
        loading,
        dirty,
        lastError,
        updateToken,
        addToken,
        deleteToken,
        saveAll,
        snapshotVersion,
        clearError
    } = useTheme();

    if (loading) return (
        <div className="theme-loading">
            <span>Loading theme...</span>
        </div>
    );

    return (
        <div className="theme-editor-container">
            <ThemeHeader
                theme={activeTheme}
                dirty={dirty}
                onSnapshot={snapshotVersion}
            />

            {lastError && (
                <div className="theme-error-banner">
                    <div className="error-content">
                        <AlertCircle size={14} />
                        <span>{lastError}</span>
                    </div>
                    <button onClick={clearError} className="error-close">×</button>
                </div>
            )}

            {/* Debug Controls */}
            <div className="theme-debug-controls">
                <span className="debug-status">Status: {dirty ? 'Dirty' : 'Clean'}</span>
                <button
                    onClick={() => {
                        console.log('[theme] Manual save triggered');
                        saveAll();
                    }}
                    className="debug-save-button"
                >
                    Manual Save
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="theme-tab-navigation">
                <button
                    onClick={() => setActiveTab('tokens')}
                    className={activeTab === 'tokens' ? 'theme-tab active' : 'theme-tab'}
                >
                    <Palette size={14} />
                    <span>Tokens</span>
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={activeTab === 'preview' ? 'theme-tab active' : 'theme-tab'}
                >
                    <Eye size={14} />
                    <span>Preview</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="theme-tab-content">
                {activeTab === 'tokens' && (
                    <div className="theme-tokens-view">
                        {/* Raw Tokens Section */}
                        <div className="theme-section">
                            <div className="section-header">
                                <div className="section-title">
                                    Raw Tokens ({rawTokens.length})
                                </div>
                            </div>
                            <div className="section-content">
                                <TokenList
                                    tokens={rawTokens}
                                    scope="raw"
                                    onUpdate={updateToken}
                                    onDelete={deleteToken}
                                />
                            </div>
                        </div>

                        {/* Semantic Tokens Section */}
                        <div className="theme-section">
                            <div className="section-header">
                                <div className="section-title">
                                    Semantic Tokens ({semanticTokens.length})
                                </div>
                            </div>
                            <div className="section-content">
                                <TokenList
                                    tokens={semanticTokens}
                                    scope="semantic"
                                    onUpdate={updateToken}
                                    onDelete={deleteToken}
                                />
                            </div>
                        </div>

                        {/* Add Token Form Section */}
                        <div className="theme-section">
                            <div className="section-header">
                                <div className="section-title">Add New Token</div>
                            </div>
                            <div className="section-content">
                                <TokenForm rawTokens={rawTokens} onAdd={addToken} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="theme-preview-view">
                        <div className="theme-section">
                            <div className="section-header">
                                <div className="section-title">Theme Preview</div>
                            </div>
                            <div className="section-content">
                                <ThemePreview />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="theme-footer">
                <span className="footer-info">
                    Project: {projectId} | Version: v{activeTheme?.version}
                </span>
            </div>
        </div>
    );
}