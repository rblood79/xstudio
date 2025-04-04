import React, { useEffect, useState } from 'react';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경
import { ElementProps } from '../../types/supabase';
import { iconProps } from '../../builder/constants';
import { FileCode2 } from 'lucide-react';
// CSS 속성 옵션 상수
const DISPLAY_OPTIONS = [
  'block',
  'flex',
  'grid',
  'inline',
  'inline-block',
  'none',
  'contents',
  'flow-root',
  'inline-flex',
  'inline-grid'
] as const;

const FLEX_DIRECTION_OPTIONS = [
  'row',
  'column',
  'row-reverse',
  'column-reverse'
] as const;

type DisplayValue = typeof DISPLAY_OPTIONS[number];
type FlexDirectionValue = typeof FLEX_DIRECTION_OPTIONS[number];

interface ReusableSelectProps {
  id: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
}

const ReusableSelect: React.FC<ReusableSelectProps> = ({ id, value, onChange, options }) => {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full p-2 border border-gray-300 rounded"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
        </option>
      ))}
    </select>
  );
};

export default function Layout() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedProps = useStore((state) => state.selectedElementProps) as ElementProps;
  const { updateElementProps } = useStore();
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const display = ((selectedProps.style as React.CSSProperties)?.display || 'block') as DisplayValue;
  const currentFlexDirection = ((selectedProps.style as React.CSSProperties)?.flexDirection || 'column') as FlexDirectionValue;

  // 스타일 변경을 실제로 적용하는 함수
  const applyStyleChange = async (prop: keyof React.CSSProperties, newValue: string) => {
    if (selectedElementId) {
      const currentStyle = (selectedProps.style || {}) as React.CSSProperties;
      const updatedStyle = { ...currentStyle };

      if (newValue === '') {
        delete updatedStyle[prop];
      } else {
        (updatedStyle[prop] as unknown) = newValue;
      }

      const updatedProps = {
        ...selectedProps,
        style: updatedStyle
      };

      // First update local state
      updateElementProps(selectedElementId, updatedProps);

      // Immediately update DOM
      const previewIframe = document.getElementById('previewFrame') as HTMLIFrameElement;
      if (previewIframe?.contentDocument) {
        const element = previewIframe.contentDocument.querySelector(`[data-element-id="${selectedElementId}"]`) as HTMLElement;
        if (element) {
          // Apply the style directly to the element
          Object.assign(element.style, updatedStyle);
        }
      }

      // Then update Supabase
      const { error } = await supabase
        .from('elements')
        .update({ props: updatedProps })
        .eq('id', selectedElementId);

      if (error) {
        console.error('Supabase update error:', error);
        return;
      }

      // Update parent window about the changes
      const element = previewIframe?.contentDocument?.querySelector(`[data-element-id="${selectedElementId}"]`) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        window.parent.postMessage(
          {
            type: "UPDATE_ELEMENT_PROPS",
            elementId: selectedElementId,
            payload: {
              props: updatedProps,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              },
              tag: element.tagName.toLowerCase()
            },
          },
          "*"
        );
      }
    }
  };

  // 크기 입력 완료 시 스타일 적용
  const handleSizeInputComplete = async (prop: 'width' | 'height', value: string) => {
    if (!value.trim()) {
      if (selectedElementId) {
        const currentStyle = (selectedProps.style || {}) as React.CSSProperties;
        const updatedStyle = { ...currentStyle };
        delete updatedStyle[prop];
        await applyStyleChange(prop, '');
      }
      return;
    }

    // 숫자만 입력된 경우 px 단위 추가
    const processedValue = /^\d+$/.test(value) ? `${value}px` : value;
    await applyStyleChange(prop, processedValue);
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
      const currentStyle = selectedProps.style as React.CSSProperties;
      const initialValues: Record<string, string> = {
        ...(typeof selectedProps.className === 'string' ? { className: selectedProps.className } : {}),
        ...(typeof selectedProps.id === 'string' ? { id: selectedProps.id } : {}),
        ...(typeof selectedProps.text === 'string' ? { text: selectedProps.text } : {}),
        ...(currentStyle?.width ? { width: currentStyle.width.toString() } : {}),
        ...(currentStyle?.height ? { height: currentStyle.height.toString() } : {})
      };
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

  useEffect(() => {
    if (selectedElementId) {
      // Fetch current element data when selected element changes
      const fetchElementData = async () => {
        const { data: currentElement } = await supabase
          .from('elements')
          .select('props')
          .eq('id', selectedElementId)
          .single();

        if (currentElement?.props) {
          updateElementProps(selectedElementId, currentElement.props);
        }
      };
      fetchElementData();
    }
  }, [selectedElementId]);

  return (
    <div className='inspector_pages'>
      <div className='panel-header'>
        <FileCode2 color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
        <h3 className='panel-title'>Inspector</h3>
      </div>
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
          <ReusableSelect
            id="element-display"
            value={display}
            onChange={(e) => applyStyleChange('display', e.target.value)}
            options={DISPLAY_OPTIONS}
          />
        </div>
      </div>

      {display === 'flex' && (
        <div className='panel flex_panel'>
          <div className='flex flex-col gap-2'>
            <label htmlFor="element-flex-direction">Flex Direction</label>
            <ReusableSelect
              id="element-flex-direction"
              value={currentFlexDirection}
              onChange={(e) => applyStyleChange('flexDirection', e.target.value)}
              options={FLEX_DIRECTION_OPTIONS}
            />
          </div>
        </div>
      )}

      <div className='panel align_items_panel'>
        <label htmlFor="alignItemsSelect">Align Items</label>
        <ReusableSelect
          id="alignItemsSelect"
          value={(selectedProps.style as React.CSSProperties)?.alignItems || 'stretch'}
          onChange={(e) => applyStyleChange('alignItems', e.target.value)}
          options={["stretch", "flex-start", "flex-end", "center", "baseline", "initial", "inherit"]}
        />
      </div>

      <div className='panel justify_content_panel'>
        <label htmlFor="justifyContentSelect">Justify Content</label>
        <ReusableSelect
          id="justifyContentSelect"
          value={(selectedProps.style as React.CSSProperties)?.justifyContent || 'flex-start'}
          onChange={(e) => applyStyleChange('justifyContent', e.target.value)}
          options={["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "initial", "inherit"]}
        />
      </div>

      <div className='panel gap_panel'>
        <label htmlFor="gapSelect">Gap</label>
        <ReusableSelect
          id="gapSelect"
          value={String((selectedProps.style as React.CSSProperties)?.gap || '0')}
          onChange={(e) => applyStyleChange('gap', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='panel padding_panel'>
        <label htmlFor="paddingSelect">Padding</label>
        <ReusableSelect
          id="paddingSelect"
          value={String((selectedProps.style as React.CSSProperties)?.padding || '0')}
          onChange={(e) => applyStyleChange('padding', e.target.value)}
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
              value={tempInputValues['width'] || ''}
              onChange={(e) => handleTextInputChange('width', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSizeInputComplete('width', e.currentTarget.value);
                }
              }}
              onBlur={(e) => handleSizeInputComplete('width', e.target.value)}
              placeholder="auto"
              aria-label="Width"
            />
            <span>*</span>
            <input
              id="element-height"
              type="text"
              value={tempInputValues['height'] || ''}
              onChange={(e) => handleTextInputChange('height', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSizeInputComplete('height', e.currentTarget.value);
                }
              }}
              onBlur={(e) => handleSizeInputComplete('height', e.target.value)}
              placeholder="auto"
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