import { memo, useCallback, useMemo } from "react";
import {
  Type,
  FileText,
  Layout,
  EyeOff,
  PointerOff,
  PencilRuler,
  Image,
  Link as LinkIcon,
  ArrowUpDown,
  CheckSquare,
  Palette,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import type { ComponentEditorProps } from "../../../inspector/types";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const CardEditor = memo(
  function CardEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return element?.customId || "";
    }, [elementId]);

    // 새 구조 (Card → CardHeader → Heading, Card → CardContent → Description)에서
    // 2-depth 탐색으로 Heading/Description 자식을 찾는 헬퍼
    const buildDeepChildUpdates = useCallback(
      (
        syncs: Array<{
          wrapperTag: string;
          childTag: string;
          propKey: string;
          value: string;
        }>,
      ) => {
        const { childrenMap } = useStore.getState();
        const directChildren = childrenMap.get(elementId) ?? [];
        const updates: Array<{
          elementId: string;
          props: Record<string, unknown>;
        }> = [];

        for (const sync of syncs) {
          // 1단계: 직계 자식에서 래퍼(CardHeader/CardContent) 탐색
          const wrapperEl = directChildren.find(
            (c) => c.tag === sync.wrapperTag,
          );
          if (wrapperEl) {
            // 2단계: 래퍼의 자식에서 대상 태그 탐색
            const wrapperChildren = childrenMap.get(wrapperEl.id) ?? [];
            const targetEl = wrapperChildren.find(
              (c) => c.tag === sync.childTag,
            );
            if (targetEl) {
              updates.push({
                elementId: targetEl.id,
                props: { ...targetEl.props, [sync.propKey]: sync.value },
              });
            }
          } else {
            // 하위 호환: 직계 자식에 바로 Heading/Description이 있는 경우 (flat 구조)
            const directEl = directChildren.find(
              (c) => c.tag === sync.childTag,
            );
            if (directEl) {
              updates.push({
                elementId: directEl.id,
                props: { ...directEl.props, [sync.propKey]: sync.value },
              });
            }
          }
        }
        return updates;
      },
      [elementId],
    );

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
    const handleTitleChange = useCallback(
      (value: string) => {
        const updatedProps = { title: value };
        const childUpdates = buildDeepChildUpdates([
          {
            wrapperTag: "CardHeader",
            childTag: "Heading",
            propKey: "children",
            value,
          },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildDeepChildUpdates],
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        const updatedProps = { description: value };
        const childUpdates = buildDeepChildUpdates([
          {
            wrapperTag: "CardContent",
            childTag: "Description",
            propKey: "children",
            value,
          },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildDeepChildUpdates],
    );

    const handleFooterChange = useCallback(
      (value: string) => {
        onUpdate({ footer: value });
      },
      [onUpdate],
    );

    const handleVariantChange = useCallback(
      (value: string) => {
        onUpdate({ variant: value });
      },
      [onUpdate],
    );

    const handleSizeChange = useCallback(
      (value: string) => {
        onUpdate({ size: value });
      },
      [onUpdate],
    );

    const handleOrientationChange = useCallback(
      (value: string) => {
        onUpdate({ orientation: value });
      },
      [onUpdate],
    );

    const handleCardTypeChange = useCallback(
      (value: string) => {
        onUpdate({ cardType: value || undefined });
      },
      [onUpdate],
    );

    const handleAccentColorChange = useCallback(
      (value: string) => {
        onUpdate({ accentColor: value || undefined });
      },
      [onUpdate],
    );

    const handleAssetChange = useCallback(
      (value: string) => {
        onUpdate({ asset: value || undefined });
      },
      [onUpdate],
    );

    const handleAssetSrcChange = useCallback(
      (value: string) => {
        onUpdate({ assetSrc: value });
      },
      [onUpdate],
    );

    const handlePreviewChange = useCallback(
      (value: string) => {
        onUpdate({ preview: value });
      },
      [onUpdate],
    );

    const handleHrefChange = useCallback(
      (value: string) => {
        onUpdate({ href: value });
      },
      [onUpdate],
    );

    const handleTargetChange = useCallback(
      (value: string) => {
        onUpdate({ target: value });
      },
      [onUpdate],
    );

    const handleIsSelectableChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isSelectable: checked });
      },
      [onUpdate],
    );

    const handleIsSelectedChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isSelected: checked });
      },
      [onUpdate],
    );

    const handleIsQuietChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isQuiet: checked });
      },
      [onUpdate],
    );

    const handleIsDisabledChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isDisabled: checked });
      },
      [onUpdate],
    );

    // ⭐ 최적화: 조건부 렌더링을 위한 값들을 useMemo로 캐싱
    const showAssetSrc = useMemo(
      () => Boolean(currentProps.asset),
      [currentProps.asset],
    );

    const showPreview = useMemo(
      () => currentProps.variant === "gallery",
      [currentProps.variant],
    );

    const showTarget = useMemo(
      () => Boolean(currentProps.href),
      [currentProps.href],
    );

    const showIsSelected = useMemo(
      () => Boolean(currentProps.isSelectable),
      [currentProps.isSelectable],
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
      [customId, elementId],
    );

    const contentSection = useMemo(
      () => (
        <PropertySection title="Content">
          <PropertyInput
            label={PROPERTY_LABELS.TITLE}
            value={String(currentProps.title || "")}
            onChange={handleTitleChange}
            icon={Type}
            placeholder="Card title"
          />

          <PropertyInput
            label={PROPERTY_LABELS.DESCRIPTION}
            value={String(currentProps.description || "")}
            onChange={handleDescriptionChange}
            icon={FileText}
            placeholder="Description text"
            multiline
          />

          <PropertyInput
            label="Footer"
            value={String(currentProps.footer || "")}
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
      ],
    );

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySelect
            label={PROPERTY_LABELS.VARIANT}
            value={String(currentProps.variant || "primary")}
            onChange={handleVariantChange}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "tertiary", label: "Tertiary" },
              { value: "quiet", label: "Quiet" },
            ]}
            icon={Layout}
          />

          <PropertySelect
            label="Card Type"
            value={String(currentProps.cardType || "default")}
            onChange={handleCardTypeChange}
            options={[
              { value: "default", label: "Default" },
              { value: "asset", label: "Asset" },
              { value: "user", label: "User" },
              { value: "product", label: "Product" },
            ]}
            icon={PencilRuler}
          />

          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={handleSizeChange}
          />

          <PropertySelect
            label="Orientation"
            value={String(currentProps.orientation || "vertical")}
            onChange={handleOrientationChange}
            options={[
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
            ]}
            icon={ArrowUpDown}
          />

          <PropertySelect
            label="Accent Color"
            value={String(currentProps.accentColor || "")}
            onChange={handleAccentColorChange}
            options={[
              { value: "", label: "Default" },
              { value: "red", label: "Red" },
              { value: "orange", label: "Orange" },
              { value: "yellow", label: "Yellow" },
              { value: "green", label: "Green" },
              { value: "turquoise", label: "Turquoise" },
              { value: "cyan", label: "Cyan" },
              { value: "blue", label: "Blue" },
              { value: "indigo", label: "Indigo" },
              { value: "purple", label: "Purple" },
              { value: "pink", label: "Pink" },
            ]}
            icon={Palette}
          />
        </PropertySection>
      ),
      [
        currentProps.variant,
        currentProps.cardType,
        currentProps.size,
        currentProps.orientation,
        currentProps.accentColor,
        handleVariantChange,
        handleCardTypeChange,
        handleSizeChange,
        handleOrientationChange,
        handleAccentColorChange,
      ],
    );

    const assetSection = useMemo(
      () => (
        <PropertySection title="Asset & Media">
          <PropertySelect
            label="Asset Type"
            value={String(currentProps.asset || "")}
            onChange={handleAssetChange}
            options={[
              { value: "", label: "None" },
              { value: "file", label: "File" },
              { value: "folder", label: "Folder" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
              { value: "audio", label: "Audio" },
            ]}
            icon={Image}
          />

          {showAssetSrc && (
            <PropertyInput
              label="Asset Source URL"
              value={String(currentProps.assetSrc || "")}
              onChange={handleAssetSrcChange}
              icon={Image}
              placeholder="https://example.com/image.jpg"
            />
          )}

          {showPreview && (
            <PropertyInput
              label="Preview Image URL"
              value={String(currentProps.preview || "")}
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
      ],
    );

    const interactionsSection = useMemo(
      () => (
        <PropertySection title="Interactions">
          <PropertyInput
            label="Link (href)"
            value={String(currentProps.href || "")}
            onChange={handleHrefChange}
            icon={LinkIcon}
            placeholder="https://example.com"
          />

          {showTarget && (
            <PropertySelect
              label="Link Target"
              value={String(currentProps.target || "_self")}
              onChange={handleTargetChange}
              options={[
                { value: "_self", label: "Same Tab" },
                { value: "_blank", label: "New Tab" },
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
      ],
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
      ],
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
  },
  (prevProps, nextProps) => {
    // ⭐ 기본 비교: id와 properties만 비교
    return (
      prevProps.elementId === nextProps.elementId &&
      JSON.stringify(prevProps.currentProps) ===
        JSON.stringify(nextProps.currentProps)
    );
  },
);

/**
 * Card hybrid afterSections: Content / Asset & Media / Interactions
 *
 * Design 및 States 섹션은 GenericPropertyEditor가 Spec으로 자동 생성하므로 여기서는 제외.
 * 2-depth childSync (Card → CardHeader → Heading, Card → CardContent → Description) 로직 포함.
 */
export const CardHybridAfterSections = memo(function CardHybridAfterSections({
  elementId,
  currentProps,
  onUpdate,
}: ComponentEditorProps) {
  // 2-depth 자식 동기화 헬퍼
  const buildDeepChildUpdates = useCallback(
    (
      syncs: Array<{
        wrapperTag: string;
        childTag: string;
        propKey: string;
        value: string;
      }>,
    ) => {
      const { childrenMap } = useStore.getState();
      const directChildren = childrenMap.get(elementId) ?? [];
      const updates: Array<{
        elementId: string;
        props: Record<string, unknown>;
      }> = [];

      for (const sync of syncs) {
        const wrapperEl = directChildren.find((c) => c.tag === sync.wrapperTag);
        if (wrapperEl) {
          const wrapperChildren = childrenMap.get(wrapperEl.id) ?? [];
          const targetEl = wrapperChildren.find((c) => c.tag === sync.childTag);
          if (targetEl) {
            updates.push({
              elementId: targetEl.id,
              props: { ...targetEl.props, [sync.propKey]: sync.value },
            });
          }
        } else {
          // 하위 호환: flat 구조 (CardHeader 없이 Heading이 직계 자식인 경우)
          const directEl = directChildren.find((c) => c.tag === sync.childTag);
          if (directEl) {
            updates.push({
              elementId: directEl.id,
              props: { ...directEl.props, [sync.propKey]: sync.value },
            });
          }
        }
      }
      return updates;
    },
    [elementId],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      const childUpdates = buildDeepChildUpdates([
        {
          wrapperTag: "CardHeader",
          childTag: "Heading",
          propKey: "children",
          value,
        },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren({ title: value }, childUpdates);
    },
    [buildDeepChildUpdates],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      const childUpdates = buildDeepChildUpdates([
        {
          wrapperTag: "CardContent",
          childTag: "Description",
          propKey: "children",
          value,
        },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(
          { description: value },
          childUpdates,
        );
    },
    [buildDeepChildUpdates],
  );

  const handleFooterChange = useCallback(
    (value: string) => {
      onUpdate({ footer: value });
    },
    [onUpdate],
  );

  const handleAssetChange = useCallback(
    (value: string) => {
      onUpdate({ asset: value || undefined });
    },
    [onUpdate],
  );

  const handleAssetSrcChange = useCallback(
    (value: string) => {
      onUpdate({ assetSrc: value });
    },
    [onUpdate],
  );

  const handlePreviewChange = useCallback(
    (value: string) => {
      onUpdate({ preview: value });
    },
    [onUpdate],
  );

  const handleHrefChange = useCallback(
    (value: string) => {
      onUpdate({ href: value });
    },
    [onUpdate],
  );

  const handleTargetChange = useCallback(
    (value: string) => {
      onUpdate({ target: value });
    },
    [onUpdate],
  );

  const handleIsSelectableChange = useCallback(
    (checked: boolean) => {
      onUpdate({ isSelectable: checked });
    },
    [onUpdate],
  );

  const handleIsSelectedChange = useCallback(
    (checked: boolean) => {
      onUpdate({ isSelected: checked });
    },
    [onUpdate],
  );

  const showAssetSrc = useMemo(
    () => Boolean(currentProps.asset),
    [currentProps.asset],
  );

  const showPreview = useMemo(
    () => currentProps.variant === "gallery",
    [currentProps.variant],
  );

  const showTarget = useMemo(
    () => Boolean(currentProps.href),
    [currentProps.href],
  );

  const showIsSelected = useMemo(
    () => Boolean(currentProps.isSelectable),
    [currentProps.isSelectable],
  );

  const contentSection = useMemo(
    () => (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TITLE}
          value={String(currentProps.title || "")}
          onChange={handleTitleChange}
          icon={Type}
          placeholder="Card title"
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={handleDescriptionChange}
          icon={FileText}
          placeholder="Description text"
          multiline
        />

        <PropertyInput
          label="Footer"
          value={String(currentProps.footer || "")}
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
    ],
  );

  const assetSection = useMemo(
    () => (
      <PropertySection title="Asset & Media">
        <PropertySelect
          label="Asset Type"
          value={String(currentProps.asset || "")}
          onChange={handleAssetChange}
          options={[
            { value: "", label: "None" },
            { value: "file", label: "File" },
            { value: "folder", label: "Folder" },
            { value: "image", label: "Image" },
            { value: "video", label: "Video" },
            { value: "audio", label: "Audio" },
          ]}
          icon={Image}
        />

        {showAssetSrc && (
          <PropertyInput
            label="Asset Source URL"
            value={String(currentProps.assetSrc || "")}
            onChange={handleAssetSrcChange}
            icon={Image}
            placeholder="https://example.com/image.jpg"
          />
        )}

        {showPreview && (
          <PropertyInput
            label="Preview Image URL"
            value={String(currentProps.preview || "")}
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
    ],
  );

  const interactionsSection = useMemo(
    () => (
      <PropertySection title="Interactions">
        <PropertyInput
          label="Link (href)"
          value={String(currentProps.href || "")}
          onChange={handleHrefChange}
          icon={LinkIcon}
          placeholder="https://example.com"
        />

        {showTarget && (
          <PropertySelect
            label="Link Target"
            value={String(currentProps.target || "_self")}
            onChange={handleTargetChange}
            options={[
              { value: "_self", label: "Same Tab" },
              { value: "_blank", label: "New Tab" },
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
    ],
  );

  return (
    <>
      {contentSection}
      {assetSection}
      {interactionsSection}
    </>
  );
});
