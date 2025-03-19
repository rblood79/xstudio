import React, { useState, useEffect } from 'react';
import { supabase } from '../../env/supabase.client';

function Layout() {
    const [display, setDisplay] = useState('block');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    interface StyleProps {
        [key: string]: string | number | boolean;
    }

    const [selectedProps, setSelectedProps] = useState<Record<string, string | number | boolean | StyleProps | Record<string, unknown>>>({});

    const handleDisplayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setDisplay(value);
        if (selectedElementId) {
            const currentStyle = (selectedProps.style && typeof selectedProps.style === 'object') ? selectedProps.style : {};
            const updatedStyle = { ...currentStyle, display: value };
            handlePropChange("style", updatedStyle);
        }
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

    const handlePropChange = async (
        key: string,
        value: string | number | boolean | Record<string, string | number | boolean | StyleProps>
    ) => {
        const updatedProps = { ...selectedProps, [key]: value };
        setSelectedProps(updatedProps);

        // supabase 업데이트
        const { error } = await supabase
            .from('elements')
            .update({ props: updatedProps })
            .eq('id', selectedElementId);

        if (error) {
            console.error('Supabase update error:', error);
            return;
        }

        // 업데이트 성공 시 메시지 전송
        window.parent.postMessage(
            {
                type: "UPDATE_ELEMENT_PROPS",
                elementId: selectedElementId,
                payload: { props: updatedProps }
            },
            "*"
        );
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
                                value={typeof selectedProps[key] === 'object' ? JSON.stringify(selectedProps[key]) : String(selectedProps[key])}
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