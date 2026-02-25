import { memo, useCallback, useMemo } from "react";
import { Type, FileText, Layout, EyeOff, PointerOff, PencilRuler, Image, Link as LinkIcon, ArrowUpDown, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const CardEditor = memo(function CardEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // 새 구조 (Card → CardHeader → Heading, Card → CardContent → Description)에서
  // 2-depth 탐색으로 Heading/Description 자식을 찾는 헬퍼
  const buildDeepChildUpdates = useCallback((
    syncs: Array<{ wrapperTag: string; childTag: string; propKey: string; value: string }>
  ) => {
    const { childrenMap } = useStore.getState();
    const directChildren = childrenMap.get(elementId) ?? [];
    const updates: Array<{ elementId: string; props: Record<string, unknown> }> = [];

    for (const sync of syncs) {
      // 1단계: 직계 자식에서 래퍼(CardHeader/CardContent) 탐색
      const wrapperEl = directChildren.find(c => c.tag === sync.wrapperTag);
      if (wrapperEl) {
        // 2단계: 래퍼의 자식에서 대상 태그 탐색
        const wrapperChildren = childrenMap.get(wrapperEl.id) ?? [];
        const targetEl = wrapperChildren.find(c => c.tag === sync.childTag);
        if (targetEl) {
          updates.push({
            elementId: targetEl.id,
            props: { ...targetEl.props, [sync.propKey]: sync.value },
          });
        }
      } else {
        // 하위 호환: 직계 자식에 바로 Heading/Description이 있는 경우 (flat 구조)
        const directEl = directChildren.find(c => c.tag === sync.childTag);
        if (directEl) {
          updates.push({
            elementId: directEl.id,
            props: { ...directEl.props, [sync.propKey]: sync.value },
          });
        }
      }
    }
    return updates;
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleTitleChange = useCallback((value: string) => {
    const updatedProps = { ...currentProps, title: value };
    const childUpdates = buildDeepChildUpdates([
      { wrapperTag: 'CardHeader', childTag: 'Heading', propKey: 'children', value },
    ]);
    useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
  }, [currentProps, buildDeepChildUpdates]);

  const handleDescriptionChange = useCallback((value: string) => {
    const updatedProps = { ...currentProps, description: value };
    const childUpdates = buildDeepChildUpdates([
      { wrapperTag: 'CardContent', childTag: 'Description', propKey: 'children', value },
    ]);
    useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
  }, [currentProps, buildDeepChildUpdates]);

  const handleFooterChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, footer: value });
  }, [currentProps, onUpdate]);

  const handleVariantChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, variant: value });
  }, [currentProps, onUpdate]);

  const handleSizeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, size: value });
  }, [currentProps, onUpdate]);

  const handleOrientationChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, orientation: value });
  }, [currentProps, onUpdate]);

  const handleAssetChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, asset: value || undefined });
  }, [currentProps, onUpdate]);

  const handleAssetSrcChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, assetSrc: value });
  }, [currentProps, onUpdate]);

  const handlePreviewChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, preview: value });
  }, [currentProps, onUpdate]);

  const handleHrefChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, href: value });
  }, [currentProps, onUpdate]);

  const handleTargetChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, target: value });
  }, [currentProps, onUpdate]);

  const handleIsSelectableChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isSelectable: checked });
  }, [currentProps, onUpdate]);

  const handleIsSelectedChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isSelected: checked });
  }, [currentProps, onUpdate]);

  const handleIsQuietChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isQuiet: checked });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  // ⭐ 최적화: 조건부 렌더링을 위한 값들을 useMemo로 캐싱
  const showAssetSrc = useMemo(
    () => Boolean(currentProps.asset),
    [currentProps.asset]
  );

  const showPreview = useMemo(
    () => currentProps.variant === 'gallery',
    [currentProps.variant]
  );

  const showTarget = useMemo(
    () => Boolean(currentProps.href),
    [currentProps.href]
  );

  const showIsSelected = useMemo(
    () => Boolean(currentProps.isSelectable),
    [currentProps.isSelectable]
  );

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="card_1"
        />
      </PropertySection>
    ),
    [customId, elementId]
  );

  const contentSection = useMemo(
    () => (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TITLE}
          value={String(currentProps.title || '')}
          onChange={handleTitleChange}
          icon={Type}
          placeholder="Card title"
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || '')}
          onChange={handleDescriptionChange}
          icon={FileText}
          placeholder="Description text"
          multiline
        />

        <PropertyInput
          label="Footer"
          value={String(currentProps.footer || '')}
          onChange={handleFooterChange}
          icon={FileText}
          placeholder="Footer text"
        />
      </PropertySection>
    ),
    [
      currentProps.title,
      currentProps.description,
      currentProps.footer,
      handleTitleChange,
      handleDescriptionChange,
      handleFooterChange,
    ]
  );

  const designSection = useMemo(
    () => (
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || 'default')}
          onChange={handleVariantChange}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'surface', label: 'Surface' },
            { value: 'elevated', label: 'Elevated' },
            { value: 'outlined', label: 'Outlined' },
            { value: 'gallery', label: 'Gallery' },
            { value: 'quiet', label: 'Quiet' }
          ]}
          icon={Layout}
        />

        <PropertySelect
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || 'md')}
          onChange={handleSizeChange}
          options={[
            { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
            { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
            { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
          ]}
          icon={PencilRuler}
        />

        <PropertySelect
          label="Orientation"
          value={String(currentProps.orientation || 'vertical')}
          onChange={handleOrientationChange}
          options={[
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' }
          ]}
          icon={ArrowUpDown}
        />
      </PropertySection>
    ),
    [
      currentProps.variant,
      currentProps.size,
      currentProps.orientation,
      handleVariantChange,
      handleSizeChange,
      handleOrientationChange,
    ]
  );

  const assetSection = useMemo(
    () => (
      <PropertySection title="Asset & Media">
        <PropertySelect
          label="Asset Type"
          value={String(currentProps.asset || '')}
          onChange={handleAssetChange}
          options={[
            { value: '', label: 'None' },
            { value: 'file', label: 'File' },
            { value: 'folder', label: 'Folder' },
            { value: 'image', label: 'Image' },
            { value: 'video', label: 'Video' },
            { value: 'audio', label: 'Audio' }
          ]}
          icon={Image}
        />

        {showAssetSrc && (
          <PropertyInput
            label="Asset Source URL"
            value={String(currentProps.assetSrc || '')}
            onChange={handleAssetSrcChange}
            icon={Image}
            placeholder="https://example.com/image.jpg"
          />
        )}

        {showPreview && (
          <PropertyInput
            label="Preview Image URL"
            value={String(currentProps.preview || '')}
            onChange={handlePreviewChange}
            icon={Image}
            placeholder="https://example.com/preview.jpg"
          />
        )}
      </PropertySection>
    ),
    [
      currentProps.asset,
      currentProps.assetSrc,
      currentProps.preview,
      showAssetSrc,
      showPreview,
      handleAssetChange,
      handleAssetSrcChange,
      handlePreviewChange,
    ]
  );

  const interactionsSection = useMemo(
    () => (
      <PropertySection title="Interactions">
        <PropertyInput
          label="Link (href)"
          value={String(currentProps.href || '')}
          onChange={handleHrefChange}
          icon={LinkIcon}
          placeholder="https://example.com"
        />

        {showTarget && (
          <PropertySelect
            label="Link Target"
            value={String(currentProps.target || '_self')}
            onChange={handleTargetChange}
            options={[
              { value: '_self', label: 'Same Tab' },
              { value: '_blank', label: 'New Tab' }
            ]}
            icon={LinkIcon}
          />
        )}

        <PropertySwitch
          label="Selectable"
          isSelected={Boolean(currentProps.isSelectable)}
          onChange={handleIsSelectableChange}
          icon={CheckSquare}
        />

        {showIsSelected && (
          <PropertySwitch
            label="Selected"
            isSelected={Boolean(currentProps.isSelected)}
            onChange={handleIsSelectedChange}
            icon={CheckSquare}
          />
        )}
      </PropertySection>
    ),
    [
      currentProps.href,
      currentProps.target,
      currentProps.isSelectable,
      currentProps.isSelected,
      showTarget,
      showIsSelected,
      handleHrefChange,
      handleTargetChange,
      handleIsSelectableChange,
      handleIsSelectedChange,
    ]
  );

  const statesSection = useMemo(
    () => (
      <PropertySection title="States">
        <PropertySwitch
          label={PROPERTY_LABELS.IS_QUIET}
          isSelected={Boolean(currentProps.isQuiet)}
          onChange={handleIsQuietChange}
          icon={EyeOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={handleIsDisabledChange}
          icon={PointerOff}
        />
      </PropertySection>
    ),
    [
      currentProps.isQuiet,
      currentProps.isDisabled,
      handleIsQuietChange,
      handleIsDisabledChange,
    ]
  );

  return (
    <>
      {basicSection}
      {contentSection}
      {designSection}
      {assetSection}
      {interactionsSection}
      {statesSection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
