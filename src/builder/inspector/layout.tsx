import React, { useEffect } from 'react';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경

// 재사용 가능한 Select 컴포넌트
const ReusableSelect = ({ value, onChange, options }: { value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>, options: string[] }) => {
  return (
    <select value={value} onChange={onChange}>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

function Layout() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedProps = useStore((state) => state.selectedElementProps);
  const { updateElementProps } = useStore();
  const display = (selectedProps.style as React.CSSProperties)?.display || 'block';
  const flexDirection = (selectedProps.style as React.CSSProperties)?.flexDirection || 'column';

  const handleStyleChange = (prop: keyof React.CSSProperties, newValue: string) => {
    if (selectedElementId) {
      const currentStyle = (selectedProps.style || {}) as React.CSSProperties;
      const updatedStyle = { ...currentStyle, [prop]: newValue };
      updateElementProps(selectedElementId, { style: updatedStyle });
      handlePropChange("style", updatedStyle);
    }
  };

  const parsePropValue = (value: string, key: string): string | number | boolean | React.CSSProperties => {
    if (key === 'style') {
      try {
        return JSON.parse(value) as React.CSSProperties;
      } catch {
        return value;
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
      const previewIframe = window.parent.document.querySelector('iframe#previewFrame') as HTMLIFrameElement;
      if (previewIframe && previewIframe.contentWindow) {
        const element = previewIframe.contentWindow.document.querySelector(`[data-element-id="${selectedElementId}"]`);
        let rect = null;
        if (element) {
          const boundingRect = element.getBoundingClientRect();
          rect = { top: boundingRect.top, left: boundingRect.left, width: boundingRect.width, height: boundingRect.height };
        }
        window.parent.postMessage(
          {
            type: "UPDATE_ELEMENT_PROPS",
            elementId: selectedElementId,
            payload: { props: updatedProps, rect, tag: (element as HTMLElement)?.tagName?.toLowerCase() || '' },
          },
          "*"
        );
      }
    }
  };

  useEffect(() => {
    const handleSelectedMessage = (event: MessageEvent) => {
      if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.props) {
        updateElementProps(event.data.elementId, event.data.payload.props);
      }
    };
    window.addEventListener("message", handleSelectedMessage);
    return () => window.removeEventListener("message", handleSelectedMessage);
  }, [updateElementProps]);

  return (
    <div className='flex flex-col gap-4 p-4'>
      
      <div className='panel className_panel'>
        <label>Class Name</label>
        <input
          value={typeof selectedProps.className === 'string' ? selectedProps.className : ''}
          onChange={(e) => handlePropChange('className', e.target.value)}
        />
      </div>

      <div className='panel id_panel'>
        <label>Id</label>
        <input
          value={typeof selectedProps.id === 'string' ? selectedProps.id : ''}
          onChange={(e) => handlePropChange('id', e.target.value)}
        />
      </div>

      <div className='panel text_panel'>
        <label>Text</label>
        <input
          type="text"
          value={typeof selectedProps.text === 'string' ? selectedProps.text : ''}
          onChange={(e) => handlePropChange('text', e.target.value)}
        />
      </div>

      <div className='panel display_panel'>
        <label>Display</label>
        <ReusableSelect
          value={display}
          onChange={(e) => handleStyleChange('display', e.target.value)}
          options={["flex", "grid", "block", "inline", "none"]}
        />
      </div>

      <div className='panel flex_panel'>
        <label>Flex Direction</label>
        <ReusableSelect
          value={flexDirection}
          onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
          options={["column", "row", "row-reverse", "column-reverse", "initial", "inherit"]}
        />
      </div>

      <div className='panel align_items_panel'>
        <label>Align Items</label>
        <ReusableSelect
          value={(selectedProps.style as React.CSSProperties)?.alignItems || 'stretch'}
          onChange={(e) => handleStyleChange('alignItems', e.target.value)}
          options={["stretch", "flex-start", "flex-end", "center", "baseline", "initial", "inherit"]}
        />
      </div>

      <div className='panel justify_content_panel'>
        <label>Justify Content</label>
        <ReusableSelect
          value={(selectedProps.style as React.CSSProperties)?.justifyContent || 'flex-start'}
          onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
          options={["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "initial", "inherit"]}
        />
      </div>

      <div className='panel gap_panel'>
        <label>Gap</label>
        <ReusableSelect
          value={String((selectedProps.style as React.CSSProperties)?.gap || '0')}
          onChange={(e) => handleStyleChange('gap', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='panel padding_panel'>
        <label>Padding</label>
        <ReusableSelect
          value={String((selectedProps.style as React.CSSProperties)?.padding || '0')}
          onChange={(e) => handleStyleChange('padding', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='panel size_panel'>
        <label>Size(W * H)</label>
        <div className='flex flex-row'>
          <input
            className='w-full'
            type="text"
            value={typeof selectedProps.style === 'object' && 'width' in selectedProps.style ? selectedProps.style.width : ''}
            onChange={(e) => handleStyleChange('width', e.target.value)}
          />
          <input
            className='w-full'
            type="text"
            value={typeof selectedProps.style === 'object' && 'height' in selectedProps.style ? selectedProps.style.height : ''}
            onChange={(e) => handleStyleChange('height', e.target.value)}
          />
        </div>
      </div>

      {selectedElementId && (
        <div>
          <h3>Edit Props for {selectedElementId}</h3>
          {Object.keys(selectedProps).map((key) => (
            <div key={key}>
              <label>{key}</label>
              <textarea
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