import React, { useState, useEffect } from 'react';

function Layout() {
    const [display, setDisplay] = useState('block');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [selectedProps, setSelectedProps] = useState<Record<string, string | number | boolean>>({});

    const handleDisplayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setDisplay(event.target.value);
        // TODO: iframe에서 선택된 element의 display 변경 로직 추가
        console.log('Display changed:', event.target.value);
    };

    useEffect(() => {
        const handleSelectedMessage = (event: MessageEvent) => {
            if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.props) {
                setSelectedElementId(event.data.elementId);
                setSelectedProps(event.data.payload.props);
            }
        };
        window.addEventListener("message", handleSelectedMessage);
        return () => window.removeEventListener("message", handleSelectedMessage);
    }, []);

    const handlePropChange = (key: string, value: string | number | boolean) => {
        setSelectedProps(prev => {
            const updated = { ...prev, [key]: value };
            window.parent.postMessage({
                type: "UPDATE_ELEMENT_PROPS",
                elementId: selectedElementId,
                payload: { props: updated }
            }, "*");
            return updated;
        });
    };

    return (
        <div>
            <div>
                <label>Display:</label>
                <select value={display} onChange={handleDisplayChange}>
                    <option value="flex">flex</option>
                    <option value="grid">grid</option>
                    <option value="block">block</option>
                    <option value="inline">inline</option>
                    <option value="none">none</option>
                    {/* 추가 옵션 필요 시 여기에 추가 */}
                </select>
            </div>
            {selectedElementId && (
                <div>
                    <h3>Edit Props for {selectedElementId}</h3>
                    {Object.keys(selectedProps).map(key => (
                        <div key={key}>
                            <label>{key}:</label>
                            <input
                                type="text"
                                value={typeof selectedProps[key] === 'boolean' ? String(selectedProps[key]) : selectedProps[key]}
                                onChange={(e) => handlePropChange(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Layout;