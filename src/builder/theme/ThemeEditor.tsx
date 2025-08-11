
import { useTheme } from '../../hooks/useTheme';
import { TokenList } from './components/TokenList';
import { TokenForm } from './components/TokenForm';
import { ThemeHeader } from './components/ThemeHeader';
import { ThemePreview } from './components/ThemePreview';
//import './styles/components.css';

interface Props {
    projectId: string;
}

export default function ThemeEditor({ projectId }: Props) {
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

    if (loading) return <div className="p-3 text-xs">Loading theme...</div>;

    return (
        <div className="flex flex-col gap-6 p-3">
            <ThemeHeader
                theme={activeTheme}
                dirty={dirty}
                onSnapshot={snapshotVersion}
            />

            {lastError && (
                <div className="text-[11px] text-red-600 flex items-center justify-between">
                    <span>{lastError}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600">×</button>
                </div>
            )}

            {/* 디버깅용 수동 저장 버튼 */}
            <div className="flex items-center gap-2 text-[11px]">
                <span>Status: {dirty ? 'Dirty' : 'Clean'}</span>
                <button
                    onClick={() => {
                        console.log('[theme] Manual save triggered');
                        saveAll();
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Manual Save
                </button>
            </div>

            {/* Raw Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Raw Tokens ({rawTokens.length})
                </h4>
                <TokenList
                    tokens={rawTokens}
                    scope="raw"
                    onUpdate={updateToken}
                    onDelete={deleteToken}
                />
            </section>

            {/* Semantic Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Semantic Tokens ({semanticTokens.length})
                </h4>
                <TokenList
                    tokens={semanticTokens}
                    scope="semantic"
                    onUpdate={updateToken}
                    onDelete={deleteToken}
                />
            </section>

            {/* Add Token Form */}
            <TokenForm rawTokens={rawTokens} onAdd={addToken} />

            {/* Theme Preview */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Theme Preview
                </h4>
                <ThemePreview />
            </section>

            <footer className="pt-2 border-t">
                <p className="text-[10px] text-neutral-500">
                    Project: {projectId} | Version: v{activeTheme?.version}
                </p>
            </footer>
        </div>
    );
}