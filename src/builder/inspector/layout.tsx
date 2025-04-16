import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores/elements';
import { ElementProps } from '../../types/supabase';
import { FileCode2 } from 'lucide-react';
import { debounce } from 'lodash';
//import { buttonStyles } from '../components/Button';
import './layout.css';

// Tailwind 클래스 카테고리 정의
const TAILWIND_OPTIONS = {
  variant: ['primary', 'secondary', 'destructive', 'surface', 'icon'],
  paddingTop: ['pt-0', 'pt-2', 'pt-4', 'pt-8'],
  paddingRight: ['pr-0', 'pr-2', 'pr-4', 'pr-8'],
  paddingBottom: ['pb-0', 'pb-2', 'pb-4', 'pb-8'],
  paddingLeft: ['pl-0', 'pl-2', 'pl-4', 'pl-8'],
  width: ['w-auto', 'w-full', 'w-1/2', 'w-64'],
};

// 클래스 정규화 함수
const normalizeClasses = (classes: string[]): string => {
  const classMap = new Map<string, string>();
  classes.forEach((cls) => {
    const prefix = cls.match(/^(p[trbl]?-|bg-|text-|w-|hover:bg-|pressed:bg-|dark:bg-|dark:text-)/)?.[0] || cls.split('-')[0];
    classMap.set(prefix, cls); // 동일 prefix의 마지막 클래스만 유지
  });
  return Array.from(classMap.values()).join(' ');
};

const ReusableSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ id, label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id}>{label}</label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export default function Inspector() {
  const { selectedElementId, selectedElementProps, updateElementProps } = useStore();
  const [localProps, setLocalProps] = useState<ElementProps>(selectedElementProps);
  const [activeTab, setActiveTab] = useState<'styles' | 'properties' | 'events'>('styles');

  useEffect(() => {
    setLocalProps(selectedElementProps);
  }, [selectedElementProps]);

  const updateSupabase = useCallback(
    debounce(async (elementId: string, props: ElementProps) => {
      const { error } = await supabase.from('elements').update({ props }).eq('id', elementId);
      if (error) {
        console.error('Supabase update error:', error);
        return;
      }

      const applyToIframe = () => {
        const previewIframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if (!previewIframe?.contentDocument) {
          setTimeout(applyToIframe, 100);
          return;
        }
        const element = previewIframe.contentDocument.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;

        if (element) {
          //const variantClasses = buttonStyles({ variant: props.variant || 'primary' });
          //const combinedClasses = normalizeClasses([...variantClasses.split(' '), ...(props.className || '').split(' ')]);
          //element.className = combinedClasses;
          Object.entries(props.events || {}).forEach(([eventName, script]) => {
            if (script) element[eventName as keyof HTMLElementEventMap] = () => new Function(script)();
          });
          const rect = element.getBoundingClientRect();
          window.parent.postMessage(
            {
              type: 'UPDATE_ELEMENT_PROPS',
              elementId,
              payload: {
                props,
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                tag: element.tagName.toLowerCase(),
              },
            },
            '*'
          );
        }

      };
      applyToIframe();
    }, 300),
    []
  );

  const updateProps = (newProps: Partial<ElementProps>) => {
    if (!selectedElementId) return;
    const updatedProps = { ...localProps, ...newProps, style: undefined };
    setLocalProps(updatedProps);
    updateElementProps(selectedElementId, updatedProps);
    updateSupabase(selectedElementId, updatedProps);
  };

  const applyVariantChange = (variant: string) => {
    //const variantClasses = buttonStyles({ variant });
    const currentClasses = (localProps.className || '').split(' ').filter(Boolean);
    const filteredClasses = currentClasses.filter(
      (c) => !c.match(/^(bg-|text-|hover:bg-|pressed:bg-|dark:bg-|dark:text-)/)
    );
    //const updatedClasses = normalizeClasses([...filteredClasses, ...variantClasses.split(' ')]);
    updateProps({ variant, className: filteredClasses.join(' ') });
  };

  const applyClassChange = (category: keyof typeof TAILWIND_OPTIONS, newClass: string) => {
    const currentClasses = (localProps.className || '').split(' ').filter(Boolean);
    const options = TAILWIND_OPTIONS[category];
    const prefix = category === 'variant' ? '' : category.replace('padding', 'p'); // 예: paddingTop -> pt
    const filteredClasses = currentClasses.filter(
      (c) => !options.some((opt) => opt === c) && !c.startsWith(prefix + '-')
    );
    const updatedClasses = normalizeClasses([...filteredClasses, newClass]);
    updateProps({ className: updatedClasses });
  };

  const applyPropChange = (key: string, value: string) => {
    const parsedValue = value === 'true' ? true : value === 'false' ? false : value;
    updateProps({ [key]: parsedValue });
  };

  const currentClasses = (localProps.className || '').split(' ').filter(Boolean);
  const getCurrentClass = (category: keyof typeof TAILWIND_OPTIONS) => {
    const options = TAILWIND_OPTIONS[category];
    const prefix = category === 'variant' ? '' : category.replace('padding', 'p');
    return currentClasses.find((c) => options.includes(c) || c.startsWith(prefix + '-')) || options[0];
  };

  return (
    <div className="layout px-4 py-2">
      <div className="tabs flex border-b mb-4">
        {['styles', 'properties', 'events'].map((tab) => (
          <button
            key={tab}
            className={`px-2 py-1 ${activeTab === tab ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'styles' && (
        <div className="space-y-4">

          <ReusableSelect
            id="paddingTop"
            label="Padding Top"
            value={getCurrentClass('paddingTop')}
            onChange={(value) => applyClassChange('paddingTop', value)}
            options={TAILWIND_OPTIONS.paddingTop}
          />
          <ReusableSelect
            id="paddingRight"
            label="Padding Right"
            value={getCurrentClass('paddingRight')}
            onChange={(value) => applyClassChange('paddingRight', value)}
            options={TAILWIND_OPTIONS.paddingRight}
          />
          <ReusableSelect
            id="paddingBottom"
            label="Padding Bottom"
            value={getCurrentClass('paddingBottom')}
            onChange={(value) => applyClassChange('paddingBottom', value)}
            options={TAILWIND_OPTIONS.paddingBottom}
          />
          <ReusableSelect
            id="paddingLeft"
            label="Padding Left"
            value={getCurrentClass('paddingLeft')}
            onChange={(value) => applyClassChange('paddingLeft', value)}
            options={TAILWIND_OPTIONS.paddingLeft}
          />
          <ReusableSelect
            id="width"
            label="Width"
            value={getCurrentClass('width')}
            onChange={(value) => applyClassChange('width', value)}
            options={TAILWIND_OPTIONS.width}
          />
          <div className="text-sm text-gray-500">
            Current Classes: {currentClasses.join(' ') || 'None'}
          </div>
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="space-y-4">
          <input
            value={localProps.text || ''}
            onChange={(e) => applyPropChange('text', e.target.value)}
            placeholder="Text"
            className="w-full p-2 border border-gray-300 rounded"
          />

          {/* ToggleButtonGroup의 selectionMode 선택 UI */}
          {selectedElementProps.tag === 'ToggleButtonGroup' && (
            <>
              <ReusableSelect
                id="selectionMode"
                label="Selection Mode"
                value={localProps.selectionMode || 'single'}
                onChange={(value) => applyPropChange('selectionMode', value)}
                options={['single', 'multiple']}
              />
              <ReusableSelect
                id="orientation"
                label="Orientation"
                value={localProps.orientation || 'horizontal'}
                onChange={(value) => applyPropChange('orientation', value)}
                options={['horizontal', 'vertical']}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDisabled"
                  checked={localProps.isDisabled || false}
                  onChange={(e) => applyPropChange('isDisabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isDisabled">Disabled</label>
              </div>
            </>
          )}

          {/* ToggleButton의 프로퍼티 UI */}
          {selectedElementProps.tag === 'ToggleButton' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSelected"
                  checked={localProps.isSelected || false}
                  onChange={(e) => applyPropChange('isSelected', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isSelected">Selected</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultSelected"
                  checked={localProps.defaultSelected || false}
                  onChange={(e) => applyPropChange('defaultSelected', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="defaultSelected">Default Selected</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDisabled"
                  checked={localProps.isDisabled || false}
                  onChange={(e) => applyPropChange('isDisabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isDisabled">Disabled</label>
              </div>
            </>
          )}

          {/* TextField의 프로퍼티 UI */}
          {selectedElementProps.tag === 'TextField' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDisabled"
                  checked={localProps.isDisabled || false}
                  onChange={(e) => applyPropChange('isDisabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isDisabled">Disabled</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="readOnly"
                  checked={localProps.readOnly || false}
                  onChange={(e) => applyPropChange('readOnly', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="readOnly">Read Only</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={localProps.required || false}
                  onChange={(e) => applyPropChange('required', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="required">Required</label>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* 이벤트 탭 생략 */}
        </div>
      )}
    </div>
  );
}