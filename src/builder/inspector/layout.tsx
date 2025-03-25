import React, { useEffect, useState } from 'react';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경

// 재사용 가능한 Select 컴포넌트
const ReusableSelect = ({ value, onChange, options, id }: { value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>, options: string[], id: string }) => {
  return (
    <select id={id} value={value} onChange={onChange} aria-label="Select option">
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
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
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

  // 텍스트 입력용 임시 상태 관리
  const handleTextInputChange = (key: string, value: string) => {
    setTempInputValues(prev => ({ ...prev, [key]: value }));
  };

  // 엔터키 입력 시 프로퍼티 변경 적용
  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter' && selectedElementId) {
      const value = tempInputValues[key];
      if (value !== undefined) {
        // 값을 적절한 타입으로 변환
        const parsedValue = parsePropValue(value, key);
        const updatedProps = { ...selectedProps, [key]: parsedValue };
        updateElementProps(selectedElementId, updatedProps);
        
        // Supabase 업데이트
        supabase
          .from('elements')
          .update({ props: updatedProps })
          .eq('id', selectedElementId)
          .then(({ error }) => {
            if (error) {
              console.error('Supabase update error:', error);
            } else {
              // iframe 업데이트
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
          });
      }
    }
  };

  // 컴포넌트 마운트 시 초기 값 설정
  useEffect(() => {
    if (selectedElementId) {
      const initialValues: Record<string, string> = {};
      if (typeof selectedProps.className === 'string') initialValues['className'] = selectedProps.className;
      if (typeof selectedProps.id === 'string') initialValues['id'] = selectedProps.id;
      if (typeof selectedProps.text === 'string') initialValues['text'] = selectedProps.text;
      setTempInputValues(initialValues);
    }
  }, [selectedElementId, selectedProps]);

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
        <label htmlFor="className">Class Name</label>
        <input
          id="className"
          aria-label="Class Name"
          value={tempInputValues.className || ''}
          onChange={(e) => handleTextInputChange('className', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'className')}
        />
      </div>

      <div className='panel id_panel'>
        <label htmlFor="elementId">Id</label>
        <input
          id="elementId"
          aria-label="Element ID"
          value={tempInputValues.id || ''}
          onChange={(e) => handleTextInputChange('id', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'id')}
        />
      </div>

      <div className='panel text_panel'>
        <label htmlFor="elementText">Text</label>
        <input
          id="elementText"
          aria-label="Element Text"
          type="text"
          value={tempInputValues.text || ''}
          onChange={(e) => handleTextInputChange('text', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'text')}
        />
      </div>

      <div className='panel display_panel'>
        <label htmlFor="displaySelect">Display</label>
        <ReusableSelect
          id="displaySelect"
          value={display}
          onChange={(e) => handleStyleChange('display', e.target.value)}
          options={["flex", "grid", "block", "inline", "none"]}
        />
      </div>

      <div className='panel flex_panel'>
        <label htmlFor="flexDirectionSelect">Flex Direction</label>
        <ReusableSelect
          id="flexDirectionSelect"
          value={flexDirection}
          onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
          options={["column", "row", "row-reverse", "column-reverse", "initial", "inherit"]}
        />
      </div>

      <div className='panel align_items_panel'>
        <label htmlFor="alignItemsSelect">Align Items</label>
        <ReusableSelect
          id="alignItemsSelect"
          value={(selectedProps.style as React.CSSProperties)?.alignItems || 'stretch'}
          onChange={(e) => handleStyleChange('alignItems', e.target.value)}
          options={["stretch", "flex-start", "flex-end", "center", "baseline", "initial", "inherit"]}
        />
      </div>

      <div className='panel justify_content_panel'>
        <label htmlFor="justifyContentSelect">Justify Content</label>
        <ReusableSelect
          id="justifyContentSelect"
          value={(selectedProps.style as React.CSSProperties)?.justifyContent || 'flex-start'}
          onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
          options={["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "initial", "inherit"]}
        />
      </div>

      <div className='panel gap_panel'>
        <label htmlFor="gapSelect">Gap</label>
        <ReusableSelect
          id="gapSelect"
          value={String((selectedProps.style as React.CSSProperties)?.gap || '0')}
          onChange={(e) => handleStyleChange('gap', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='panel padding_panel'>
        <label htmlFor="paddingSelect">Padding</label>
        <ReusableSelect
          id="paddingSelect"
          value={String((selectedProps.style as React.CSSProperties)?.padding || '0')}
          onChange={(e) => handleStyleChange('padding', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='panel size_panel'>
        <div className='flex flex-col gap-2'>
          <label htmlFor="elementWidth">Width</label>
          <input
            id="elementWidth"
            aria-label="Element Width"
            className='w-full'
            type="text"
            value={typeof selectedProps.style === 'object' && 'width' in selectedProps.style ? selectedProps.style.width : ''}
            onChange={(e) => handleStyleChange('width', e.target.value)}
          />
          <label htmlFor="elementHeight">Height</label>
          <input
            id="elementHeight"
            aria-label="Element Height"
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
              <label htmlFor={`prop-${key}`}>{key}</label>
              <textarea
                id={`prop-${key}`}
                aria-label={`Edit ${key}`}
                value={key in tempInputValues ? tempInputValues[key] : typeof selectedProps[key] === 'object' ? JSON.stringify(selectedProps[key]) : String(selectedProps[key])}
                onChange={(e) => handleTextInputChange(key, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, key)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Layout;