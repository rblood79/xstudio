import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { supabase } from '../../env/supabase.client';
import { selectedElementIdStore, selectedElementPropsStore, updateElementProps} from '../stores/elements';

function Layout() {
  const selectedElementId = useStore(selectedElementIdStore);
  const selectedProps = useStore(selectedElementPropsStore);
  const display = (selectedProps.style as React.CSSProperties)?.display || 'block';

  const handleDisplayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (selectedElementId) {
      const currentStyle = (selectedProps.style || {}) as React.CSSProperties;
      const updatedStyle = { ...currentStyle, display: value };
      updateElementProps(selectedElementId, { style: updatedStyle });
      handlePropChange("style", updatedStyle);
    }
  };

  const parsePropValue = (value: string, key: string): string | number | boolean | React.CSSProperties => {
    if (key === 'style') {
      try {
        return JSON.parse(value) as React.CSSProperties; // 문자열을 CSSProperties로 파싱
      } catch {
        return value; // 파싱 실패 시 문자열로 유지
      }
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    const numValue = Number(value);
    return isNaN(numValue) ? value : numValue;
  };

  const handlePropChange = async (key: string, value: string | number | boolean | React.CSSProperties) => {
    if (!selectedElementId) return;
    const updatedProps = { ...selectedProps, [key]: value };
    updateElementProps(selectedElementId, updatedProps);

    const { error } = await supabase
      .from('elements')
      .update({ props: updatedProps })
      .eq('id', selectedElementId);

    if (error) {
      console.error('Supabase update error:', error);
    } else {
      window.parent.postMessage(
        {
          type: "UPDATE_ELEMENT_PROPS",
          elementId: selectedElementId,
          payload: { props: updatedProps }
        },
        "*"
      );
    }
  };

  useEffect(() => {
    const handleSelectedMessage = (event: MessageEvent) => {
      if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.props) {
        const props = event.data.payload.props as Record<string, string | number | boolean | React.CSSProperties>;
        updateElementProps(event.data.elementId, props);
      }
    };
    window.addEventListener("message", handleSelectedMessage);
    return () => window.removeEventListener("message", handleSelectedMessage);
  }, []);

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
                onChange={(e) => handlePropChange(key, parsePropValue(e.target.value, key))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Layout;