import React, { useEffect, useState } from 'react';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경
import { ElementProps } from '../../types/supabase';

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

export default function Layout() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedProps = useStore((state) => state.selectedElementProps) as ElementProps;
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

  const parsePropValue = (value: string, key: string): string | number | boolean | React.CSSProperties | React.ReactNode | readonly string[] | undefined => {
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

  const handlePropChange = async (key: string, value: string | number | boolean | React.CSSProperties | React.ReactNode | readonly string[] | undefined) => {
    if (selectedElementId) {
      const newProps = { [key]: value } as unknown as ElementProps;
      updateElementProps(selectedElementId, newProps);

      const { error } = await supabase
        .from('elements')
        .update({ props: { [key]: value } })
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
              payload: { props: { [key]: value }, rect, tag: (element as HTMLElement)?.tagName?.toLowerCase() || '' },
            },
            "*"
          );
        }
      }
    }
  };

  // 텍스트 입력용 임시 상태 관리
  const handleTextInputChange = (key: string, value: string) => {
    setTempInputValues((prev) => ({ ...prev, [key]: value }));
  };

  // 엔터키 입력 시 프로퍼티 변경 적용
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, key: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = tempInputValues[key];
      if (value !== undefined) {
        const parsedValue = parsePropValue(value, key);
        handlePropChange(key, parsedValue);
        setTempInputValues((prev) => {
          const newValues = { ...prev };
          delete newValues[key];
          return newValues;
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
        <div className='flex flex-col gap-2'>
          <label htmlFor="element-display">Display</label>
          <select
            id="element-display"
            value={display}
            onChange={(e) => handleStyleChange('display', e.target.value)}
            aria-label="Display"
          >
            <option value="block">Block</option>
            <option value="flex">Flex</option>
            <option value="grid">Grid</option>
            <option value="inline">Inline</option>
            <option value="inline-block">Inline Block</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {display === 'flex' && (
        <div className='panel flex_panel'>
          <div className='flex flex-col gap-2'>
            <label htmlFor="element-flex-direction">Flex Direction</label>
            <select
              id="element-flex-direction"
              value={flexDirection}
              onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
              aria-label="Flex Direction"
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
              <option value="row-reverse">Row Reverse</option>
              <option value="column-reverse">Column Reverse</option>
            </select>
          </div>
        </div>
      )}

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
          <label htmlFor="element-width">Size(W * H)</label>
          <div className="size_inputs">
            <input
              id="element-width"
              type="text"
              value={tempInputValues['width'] ?? (selectedProps.style as React.CSSProperties)?.width ?? ''}
              onChange={(e) => handleTextInputChange('width', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'width')}
              aria-label="Width"
            />
            <span>*</span>
            <input
              id="element-height"
              type="text"
              value={tempInputValues['height'] ?? (selectedProps.style as React.CSSProperties)?.height ?? ''}
              onChange={(e) => handleTextInputChange('height', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'height')}
              aria-label="Height"
            />
          </div>
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