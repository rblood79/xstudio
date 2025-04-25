/**/
import './index.css';
import { useState } from 'react';

function AI() {
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const generateResponse = async () => {
        try {
            setIsLoading(true);
            setOutput('생성 중...');

            const response = await fetch('http://121.146.229.198:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'phi3:mini',
                    prompt: prompt,
                    stream: false
                })
            });

            const data = await response.json();
            setOutput(data.response);
        } catch (error) {
            console.error('Error:', error);
            setOutput('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="sidebar-content">
            <h3>AI Assistant</h3>
            <input
                type="text"
                placeholder="프롬프트를 입력하세요"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
            <button
                onClick={generateResponse}
                disabled={isLoading || !prompt.trim()}
            >
                {isLoading ? '생성 중...' : '생성하기'}
            </button>
            <div className="ai-output">
                <pre>{output}</pre>
            </div>
        </div>
    );
}

export default AI;