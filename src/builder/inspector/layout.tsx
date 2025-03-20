import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { supabase } from '../../env/supabase.client';
import { selectedElementIdStore, selectedElementPropsStore, updateElementProps } from '../stores/elements';

// 재사용 가능한 Select 컴포넌트 추가
const ReusableSelect = ({ value, onChange, options }: { value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>, options: string[] }) => {
  return (
    <select value={value} onChange={onChange}>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

function Layout() {
  const selectedElementId = useStore(selectedElementIdStore);
  const selectedProps = useStore(selectedElementPropsStore);
  const display = (selectedProps.style as React.CSSProperties)?.display || 'block';
  const flexDirection = (selectedProps.style as React.CSSProperties)?.flexDirection || 'column';

  // 공통의 style 변경 핸들러 추가
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
    <div className='p-4'>
      <div className='className_panel'>
        <label>Class Name</label>
        <input
          type="text"
          value={typeof selectedProps.className === 'string' ? selectedProps.className : ''}
          onChange={(e) => handlePropChange('className', e.target.value)}
        />
      </div>

      <div className='text_panel'>
        <label>Text</label>
        <input
          type="text"
          value={typeof selectedProps.text === 'string' ? selectedProps.text : ''}
          onChange={(e) => handlePropChange('text', e.target.value)}
        />
      </div>

      <div className='display_panel'>
        <label>Display</label>
        {/* display select를 재사용 가능한 컴포넌트로 교체 */}
        <ReusableSelect
          value={display}
          onChange={(e) => handleStyleChange('display', e.target.value)}
          options={["flex", "grid", "block", "inline", "none"]}
        />
      </div>

      <div className='flex_panel'>
        <label>Flex Direction</label>
        {/* flexDirection select도 재사용 */}
        <ReusableSelect
          value={flexDirection}
          onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
          options={["column", "row", "row-reverse", "column-reverse", "initial", "inherit"]}
        />
      </div>

      <div className='align_items_panel'>
        <label>Align Items</label>
        {/* alignItems select도 재사용 */}
        <ReusableSelect
          value={(selectedProps.style as React.CSSProperties)?.alignItems || 'stretch'}
          onChange={(e) => handleStyleChange('alignItems', e.target.value)}
          options={["stretch", "flex-start", "flex-end", "center", "baseline", "initial", "inherit"]}
        />
      </div>

      <div className='justify_content_panel'>
        <label>Justify Content</label>
        {/* justifyContent select도 재사용 */}
        <ReusableSelect
          value={(selectedProps.style as React.CSSProperties)?.justifyContent || 'flex-start'}
          onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
          options={["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "initial", "inherit"]}
        />
      </div>

      <div className='gap_panel'>
        <label>Gap</label>
        {/* gap select 추가 */}
        <ReusableSelect
          value={String((selectedProps.style as React.CSSProperties)?.gap || '0')}
          onChange={(e) => handleStyleChange('gap', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='padding_panel'>
        <label>Padding</label>
        {/* padding select 추가 */}
        <ReusableSelect
          value={String((selectedProps.style as React.CSSProperties)?.padding || '0')}
          onChange={(e) => handleStyleChange('padding', e.target.value)}
          options={["0", "4px", "8px", "16px", "32px"]}
        />
      </div>

      <div className='size_panel'>
        <label>Size(W * H)</label>
        {/* flexDirection select도 재사용 */}
        <div className='flex flex-row flex-[3_1_auto]'>
          <input
            type="text"
            value={typeof selectedProps.style === 'object' && 'width' in selectedProps.style ? selectedProps.style.width : ''}
            onChange={(e) => handleStyleChange('width', e.target.value)}
          />
          <input
            type="text"
            value={typeof selectedProps.style === 'object' && 'height' in selectedProps.style ? selectedProps.style.height : ''}
            onChange={(e) => handleStyleChange('height', e.target.value)}
          />
        </div>
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