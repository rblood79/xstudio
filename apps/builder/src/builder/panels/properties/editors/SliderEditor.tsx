import { memo, useCallback, useMemo } from "react";
import {
  Type,
  Layout,
  NotebookTabs,
  Ratio,
  ArrowDown,
  ArrowUp,
  Move,
  FileText,
  Tag,
  PointerOff,
  Globe,
  DollarSign,
  GripHorizontal,
} from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import type { ComponentEditorProps } from "../../../inspector/types";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";

export const SliderEditor = memo(function SliderEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const { buildChildUpdates } = useSyncChildProp(elementId);

  // 변경된 key만 전달 — updateAndSave가 element.props와 merge하므로 stale props 전파 방지
  const updateProp = useCallback(
    (key: string, value: unknown) => {
      onUpdate({ [key]: value });
    },
    [onUpdate],
  );

  const handleLabelChange = useCallback(
    (value: string) => {
      const updatedProps = { label: value };
      const childUpdates = buildChildUpdates([
        { childTag: "Label", propKey: "children", value },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    },
    [buildChildUpdates],
  );

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  // 숫자 프로퍼티 업데이트 함수
  const updateNumberProp = (
    key: string,
    value: string,
    defaultValue?: number,
  ) => {
    const numericValue =
      value === "" ? undefined : Number(value) || defaultValue;
    updateProp(key, numericValue);
  };

  // SliderTrack에 부모 prop 직접 동기화 (value/minValue/maxValue)
  const syncSliderTrackProp = useCallback(
    (key: string, value: unknown) => {
      const { childrenMap } = useStore.getState();
      const children = childrenMap.get(elementId) ?? [];
      const track = children.find((c) => c.tag === "SliderTrack");
      if (!track) return;
      useStore.getState().updateElementProps(track.id, {
        ...track.props,
        [key]: value,
      });
    },
    [elementId],
  );

  const isRange = Array.isArray(currentProps.value);
  const rangeValues: [number, number] = isRange
    ? [
        Number((currentProps.value as number[])[0]) || 0,
        Number((currentProps.value as number[])[1]) || 100,
      ]
    : [0, 100];

  const handleRangeModeToggle = useCallback(
    async (checked: boolean) => {
      const store = useStore.getState();
      const { childrenMap, elementsMap } = store;
      const minVal = Number(currentProps.minValue) || 0;
      const maxVal = Number(currentProps.maxValue) || 100;

      // SliderTrack 자식 찾기
      const sliderChildren = childrenMap.get(elementId) ?? [];
      const sliderTrack = sliderChildren.find((c) => c.tag === "SliderTrack");
      const sliderOutput = sliderChildren.find((c) => c.tag === "SliderOutput");

      if (checked) {
        // Single → Range
        const current = Number(currentProps.value) || 50;
        const start = Math.max(minVal, current - (maxVal - minVal) * 0.15);
        const end = Math.min(maxVal, current + (maxVal - minVal) * 0.15);
        const startVal = Math.round(start);
        const endVal = Math.round(end);

        // 1. value 업데이트
        onUpdate({ value: [startVal, endVal] });

        // 2. SliderOutput 텍스트 업데이트
        if (sliderOutput) {
          store.updateElementProps(sliderOutput.id, {
            ...sliderOutput.props,
            children: `${startVal} – ${endVal}`,
          });
        }

        // 3. SliderTrack에 두 번째 Thumb 추가
        if (sliderTrack) {
          const trackChildren = childrenMap.get(sliderTrack.id) ?? [];
          const thumbCount = trackChildren.filter(
            (c) => c.tag === "SliderThumb",
          ).length;
          if (thumbCount < 2) {
            const parentEl = elementsMap.get(elementId);
            await store.addElement({
              id: crypto.randomUUID(),
              tag: "SliderThumb",
              props: {
                style: { width: 18, height: 18, borderRadius: "50%" },
              },
              parent_id: sliderTrack.id,
              page_id: parentEl?.page_id ?? null,
              layout_id: parentEl?.layout_id ?? null,
              order_num: thumbCount,
              deleted: false,
            });
          }
        }
      } else {
        // Range → Single
        const vals = currentProps.value as number[];
        const singleVal = Array.isArray(vals) ? vals[0] : (vals ?? 50);

        // 1. value 업데이트
        onUpdate({ value: singleVal });

        // 2. SliderOutput 텍스트 업데이트
        if (sliderOutput) {
          store.updateElementProps(sliderOutput.id, {
            ...sliderOutput.props,
            children: String(singleVal),
          });
        }

        // 3. SliderTrack에서 여분의 Thumb 제거 (1개만 남김)
        if (sliderTrack) {
          const trackChildren = childrenMap.get(sliderTrack.id) ?? [];
          const thumbs = trackChildren.filter((c) => c.tag === "SliderThumb");
          if (thumbs.length > 1) {
            const toRemove = thumbs.slice(1).map((t) => t.id);
            await store.removeElements(toRemove);
          }
        }
      }
    },
    [
      elementId,
      currentProps.minValue,
      currentProps.maxValue,
      currentProps.value,
      onUpdate,
    ],
  );

  const updateRangeValue = useCallback(
    (index: 0 | 1, raw: string) => {
      const num = raw === "" ? 0 : Number(raw) || 0;
      // Store에서 최신 value 직접 읽기 (stale closure 방지)
      const el = useStore.getState().elementsMap.get(elementId);
      const currentVal = (el?.props as Record<string, unknown>)?.value;
      const latest: [number, number] = Array.isArray(currentVal)
        ? [Number(currentVal[0]) || 0, Number(currentVal[1]) || 100]
        : [0, 100];
      latest[index] = num;
      onUpdate({ value: latest });
      syncSliderTrackProp("value", latest);

      // SliderOutput 텍스트 동기화
      const childUpdates = buildChildUpdates([
        {
          childTag: "SliderOutput",
          propKey: "children",
          value: `${latest[0]} – ${latest[1]}`,
        },
      ]);
      if (childUpdates.length > 0) {
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren({}, childUpdates);
      }
    },
    [elementId, onUpdate, buildChildUpdates],
  );

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="slider_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={handleLabelChange}
          icon={Type}
        />

        <PropertySwitch
          label="Range Mode"
          isSelected={isRange}
          onChange={handleRangeModeToggle}
          icon={GripHorizontal}
        />

        {isRange ? (
          <>
            <PropertyInput
              label="Start Value"
              value={String(rangeValues[0])}
              onChange={(value) => updateRangeValue(0, value)}
              icon={NotebookTabs}
              placeholder="0"
            />
            <PropertyInput
              label="End Value"
              value={String(rangeValues[1])}
              onChange={(value) => updateRangeValue(1, value)}
              icon={NotebookTabs}
              placeholder="100"
            />
          </>
        ) : (
          <PropertyInput
            label={PROPERTY_LABELS.DEFAULT_VALUE}
            value={String(currentProps.value ?? "")}
            onChange={(value) => {
              updateNumberProp("value", value);
              const numVal = value === "" ? 0 : Number(value) || 0;
              syncSliderTrackProp("value", numVal);
              const childUpdates = buildChildUpdates([
                {
                  childTag: "SliderOutput",
                  propKey: "children",
                  value: String(numVal),
                },
              ]);
              if (childUpdates.length > 0) {
                useStore
                  .getState()
                  .updateSelectedPropertiesWithChildren({}, childUpdates);
              }
            }}
            icon={NotebookTabs}
            placeholder="0"
          />
        )}
      </PropertySection>

      {/* Number Formatting Section */}
      <PropertySection title="Number Formatting">
        <PropertyInput
          label="Locale"
          value={String(currentProps.locale || "")}
          onChange={(value) => updateProp("locale", value || undefined)}
          placeholder="ko-KR, en-US, etc."
          icon={Globe}
        />

        <PropertySelect
          label="Value Format"
          value={String(currentProps.valueFormat || "number")}
          onChange={(value) => updateProp("valueFormat", value)}
          options={[
            { value: "number", label: "Number" },
            { value: "percent", label: "Percent" },
            { value: "unit", label: "Unit" },
            { value: "custom", label: "Custom" },
          ]}
          icon={DollarSign}
        />

        {currentProps.valueFormat === "unit" && (
          <PropertyInput
            label="Unit"
            value={String(currentProps.unit || "")}
            onChange={(value) => updateProp("unit", value || undefined)}
            icon={Type}
            placeholder="kilometer, celsius, meter, etc."
          />
        )}

        <PropertySwitch
          label="Show Value"
          isSelected={currentProps.showValue !== false}
          onChange={(checked) => updateProp("showValue", checked)}
          icon={NotebookTabs}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "default")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "default", label: "Default" },
            { value: "accent", label: "Accent" },
            { value: "neutral", label: "Neutral" },
          ]}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "horizontal")}
          onChange={(value) => updateProp("orientation", value)}
          options={[
            {
              value: "horizontal",
              label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL,
            },
            { value: "vertical", label: PROPERTY_LABELS.ORIENTATION_VERTICAL },
          ]}
          icon={Ratio}
        />
      </PropertySection>

      {/* Range Section */}
      <PropertySection title="Range">
        <PropertyInput
          label={PROPERTY_LABELS.MIN_VALUE}
          value={String(currentProps.minValue ?? "")}
          onChange={(value) => {
            const numVal = value === "" ? 0 : Number(value) || 0;
            updateNumberProp("minValue", value, 0);
            syncSliderTrackProp("minValue", numVal);
          }}
          icon={ArrowDown}
          placeholder="0"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MAX_VALUE}
          value={String(currentProps.maxValue ?? "")}
          onChange={(value) => {
            const numVal = value === "" ? 100 : Number(value) || 100;
            updateNumberProp("maxValue", value, 100);
            syncSliderTrackProp("maxValue", numVal);
          }}
          icon={ArrowUp}
          placeholder="100"
        />

        <PropertyInput
          label={PROPERTY_LABELS.STEP}
          value={String(currentProps.step ?? "")}
          onChange={(value) => updateNumberProp("step", value, 1)}
          icon={Move}
          placeholder="1"
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={Tag}
          placeholder="slider-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.FORM}
          value={String(currentProps.form || "")}
          onChange={(value) => updateProp("form", value || undefined)}
          icon={FileText}
          placeholder="form-id"
        />
      </PropertySection>
    </>
  );
});

/**
 * Slider hybrid afterSections
 *
 * GenericPropertyEditor가 Design/Behavior/Form Integration을 렌더링한 뒤
 * Content, Number Formatting, Range 섹션을 이어서 렌더링한다.
 */
export const SliderHybridAfterSections = memo(
  function SliderHybridAfterSections({
    elementId,
    currentProps,
    onUpdate,
  }: ComponentEditorProps) {
    const { buildChildUpdates } = useSyncChildProp(elementId);

    const updateProp = useCallback(
      (key: string, value: unknown) => {
        onUpdate({ [key]: value });
      },
      [onUpdate],
    );

    const updateNumberProp = useCallback(
      (key: string, value: string, defaultValue?: number) => {
        const numericValue =
          value === "" ? undefined : Number(value) || defaultValue;
        updateProp(key, numericValue);
      },
      [updateProp],
    );

    // SliderTrack에 부모 prop 직접 동기화 (value/minValue/maxValue)
    const syncSliderTrackProp = useCallback(
      (key: string, value: unknown) => {
        const { childrenMap } = useStore.getState();
        const children = childrenMap.get(elementId) ?? [];
        const track = children.find((c) => c.tag === "SliderTrack");
        if (!track) return;
        useStore.getState().updateElementProps(track.id, {
          ...track.props,
          [key]: value,
        });
      },
      [elementId],
    );

    const isRange = Array.isArray(currentProps.value);
    const rangeValues: [number, number] = isRange
      ? [
          Number((currentProps.value as number[])[0]) || 0,
          Number((currentProps.value as number[])[1]) || 100,
        ]
      : [0, 100];

    const handleRangeModeToggle = useCallback(
      async (checked: boolean) => {
        const store = useStore.getState();
        const { childrenMap, elementsMap } = store;
        const minVal = Number(currentProps.minValue) || 0;
        const maxVal = Number(currentProps.maxValue) || 100;

        const sliderChildren = childrenMap.get(elementId) ?? [];
        const sliderTrack = sliderChildren.find((c) => c.tag === "SliderTrack");
        const sliderOutput = sliderChildren.find(
          (c) => c.tag === "SliderOutput",
        );

        if (checked) {
          const current = Number(currentProps.value) || 50;
          const start = Math.max(minVal, current - (maxVal - minVal) * 0.15);
          const end = Math.min(maxVal, current + (maxVal - minVal) * 0.15);
          const startVal = Math.round(start);
          const endVal = Math.round(end);

          onUpdate({ value: [startVal, endVal] });

          if (sliderOutput) {
            store.updateElementProps(sliderOutput.id, {
              ...sliderOutput.props,
              children: `${startVal} – ${endVal}`,
            });
          }

          if (sliderTrack) {
            const trackChildren = childrenMap.get(sliderTrack.id) ?? [];
            const thumbCount = trackChildren.filter(
              (c) => c.tag === "SliderThumb",
            ).length;
            if (thumbCount < 2) {
              const parentEl = elementsMap.get(elementId);
              await store.addElement({
                id: crypto.randomUUID(),
                tag: "SliderThumb",
                props: {
                  style: { width: 18, height: 18, borderRadius: "50%" },
                },
                parent_id: sliderTrack.id,
                page_id: parentEl?.page_id ?? null,
                layout_id: parentEl?.layout_id ?? null,
                order_num: thumbCount,
                deleted: false,
              });
            }
          }
        } else {
          const vals = currentProps.value as number[];
          const singleVal = Array.isArray(vals) ? vals[0] : (vals ?? 50);

          onUpdate({ value: singleVal });

          if (sliderOutput) {
            store.updateElementProps(sliderOutput.id, {
              ...sliderOutput.props,
              children: String(singleVal),
            });
          }

          if (sliderTrack) {
            const trackChildren = childrenMap.get(sliderTrack.id) ?? [];
            const thumbs = trackChildren.filter((c) => c.tag === "SliderThumb");
            if (thumbs.length > 1) {
              const toRemove = thumbs.slice(1).map((t) => t.id);
              await store.removeElements(toRemove);
            }
          }
        }
      },
      [
        elementId,
        currentProps.minValue,
        currentProps.maxValue,
        currentProps.value,
        onUpdate,
      ],
    );

    const updateRangeValue = useCallback(
      (index: 0 | 1, raw: string) => {
        const num = raw === "" ? 0 : Number(raw) || 0;
        const el = useStore.getState().elementsMap.get(elementId);
        const currentVal = (el?.props as Record<string, unknown>)?.value;
        const latest: [number, number] = Array.isArray(currentVal)
          ? [Number(currentVal[0]) || 0, Number(currentVal[1]) || 100]
          : [0, 100];
        latest[index] = num;
        onUpdate({ value: latest });
        syncSliderTrackProp("value", latest);

        const childUpdates = buildChildUpdates([
          {
            childTag: "SliderOutput",
            propKey: "children",
            value: `${latest[0]} – ${latest[1]}`,
          },
        ]);
        if (childUpdates.length > 0) {
          useStore
            .getState()
            .updateSelectedPropertiesWithChildren({}, childUpdates);
        }
      },
      [elementId, onUpdate, buildChildUpdates, syncSliderTrackProp],
    );

    return (
      <>
        {/* Content Section */}
        <PropertySection title="Content">
          <PropertySwitch
            label="Range Mode"
            isSelected={isRange}
            onChange={handleRangeModeToggle}
            icon={GripHorizontal}
          />

          {isRange ? (
            <>
              <PropertyInput
                label="Start Value"
                value={String(rangeValues[0])}
                onChange={(value) => updateRangeValue(0, value)}
                icon={NotebookTabs}
                placeholder="0"
              />
              <PropertyInput
                label="End Value"
                value={String(rangeValues[1])}
                onChange={(value) => updateRangeValue(1, value)}
                icon={NotebookTabs}
                placeholder="100"
              />
            </>
          ) : (
            <PropertyInput
              label={PROPERTY_LABELS.DEFAULT_VALUE}
              value={String(currentProps.value ?? "")}
              onChange={(value) => {
                updateNumberProp("value", value);
                const numVal = value === "" ? 0 : Number(value) || 0;
                syncSliderTrackProp("value", numVal);
                const childUpdates = buildChildUpdates([
                  {
                    childTag: "SliderOutput",
                    propKey: "children",
                    value: String(numVal),
                  },
                ]);
                if (childUpdates.length > 0) {
                  useStore
                    .getState()
                    .updateSelectedPropertiesWithChildren({}, childUpdates);
                }
              }}
              icon={NotebookTabs}
              placeholder="0"
            />
          )}
        </PropertySection>

        {/* Number Formatting Section */}
        <PropertySection title="Number Formatting">
          <PropertyInput
            label="Locale"
            value={String(currentProps.locale || "")}
            onChange={(value) => updateProp("locale", value || undefined)}
            placeholder="ko-KR, en-US, etc."
            icon={Globe}
          />

          <PropertySelect
            label="Value Format"
            value={String(currentProps.valueFormat || "number")}
            onChange={(value) => updateProp("valueFormat", value)}
            options={[
              { value: "number", label: "Number" },
              { value: "percent", label: "Percent" },
              { value: "unit", label: "Unit" },
              { value: "custom", label: "Custom" },
            ]}
            icon={DollarSign}
          />

          {currentProps.valueFormat === "unit" && (
            <PropertyInput
              label="Unit"
              value={String(currentProps.unit || "")}
              onChange={(value) => updateProp("unit", value || undefined)}
              icon={Type}
              placeholder="kilometer, celsius, meter, etc."
            />
          )}

          <PropertySwitch
            label="Show Value"
            isSelected={currentProps.showValue !== false}
            onChange={(checked) => updateProp("showValue", checked)}
            icon={NotebookTabs}
          />
        </PropertySection>

        {/* Range Section */}
        <PropertySection title="Range">
          <PropertyInput
            label={PROPERTY_LABELS.MIN_VALUE}
            value={String(currentProps.minValue ?? "")}
            onChange={(value) => {
              const numVal = value === "" ? 0 : Number(value) || 0;
              updateNumberProp("minValue", value, 0);
              syncSliderTrackProp("minValue", numVal);
            }}
            icon={ArrowDown}
            placeholder="0"
          />

          <PropertyInput
            label={PROPERTY_LABELS.MAX_VALUE}
            value={String(currentProps.maxValue ?? "")}
            onChange={(value) => {
              const numVal = value === "" ? 100 : Number(value) || 100;
              updateNumberProp("maxValue", value, 100);
              syncSliderTrackProp("maxValue", numVal);
            }}
            icon={ArrowUp}
            placeholder="100"
          />

          <PropertyInput
            label={PROPERTY_LABELS.STEP}
            value={String(currentProps.step ?? "")}
            onChange={(value) => updateNumberProp("step", value, 1)}
            icon={Move}
            placeholder="1"
          />
        </PropertySection>
      </>
    );
  },
);
