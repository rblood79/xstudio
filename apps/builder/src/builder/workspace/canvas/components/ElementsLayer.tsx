import { memo, useEffect, useMemo } from "react";
import type { Element } from "../../../../types/core/store.types";
import {
  parseBorder,
  publishLayoutMap,
  parsePadding,
  type ComputedLayout,
} from "../layout";
import { applyImplicitStyles } from "../layout/engines/implicitStyles";
import type { PixiPageRendererInput } from "../renderers";
import {
  buildPageChildrenMap,
  buildChildrenIdMap,
  buildPageDirtyState,
  createPageElementsSignature,
  createPageLayoutSignature,
  getCachedPageLayout,
  getCachedRenderIdSet,
  getCachedTopLevelCandidateIds,
} from "../scene";
import { updateElementCount } from "../utils/gpuProfilerCore";
import { ElementSprite } from "../sprites";
import {
  calculateViewportBounds,
  useViewportCulling,
} from "../hooks/useViewportCulling";
import { DirectContainer } from "./DirectContainer";

const NON_CONTAINER_TAGS = new Set([
  "Text",
  "Heading",
  "Description",
  "Label",
  "Paragraph",
  "Link",
  "Strong",
  "Em",
  "Code",
  "Pre",
  "Blockquote",
  "ListItem",
  "ListBoxItem",
  "GridListItem",
  "Input",
  "Separator",
  "Skeleton",
  "ColorSwatch",
  "ColorWheel",
  "ColorArea",
  "ColorSlider",
  "FieldError",
  "DateSegment",
  "TimeSegment",
  "SliderOutput",
  "SliderThumb",
  "SelectValue",
  "SelectIcon",
  "ComboBoxInput",
  "ComboBoxTrigger",
  "CalendarHeader",
  "CalendarGrid",
]);

export interface ElementsLayerProps {
  rendererInput: PixiPageRendererInput;
}

export const ElementsLayer = memo(function ElementsLayer({
  rendererInput,
}: ElementsLayerProps) {
  const {
    pageElements,
    bodyElement,
    elementById,
    dirtyElementIds,
    depthMap,
    pageWidth,
    pageHeight,
    zoom,
    panOffset,
    pagePositionVersion = 0,
    wasmLayoutReady = false,
    layoutVersion = 0,
  } = rendererInput;

  const pageChildrenMap = useMemo(() => {
    return buildPageChildrenMap({
      bodyElement,
      elementById,
      pageElements,
    });
  }, [bodyElement?.id, elementById, pageElements]);
  const pageDirtyState = useMemo(() => {
    return buildPageDirtyState({
      bodyElement,
      dirtyElementIds,
      elementsMap: elementById,
      pageChildrenMap,
    });
  }, [bodyElement, dirtyElementIds, elementById, pageChildrenMap]);
  const pageElementsSignature = useMemo(() => {
    return createPageElementsSignature(pageElements);
  }, [pageElements]);
  const pageLayoutSignature = useMemo(() => {
    return createPageLayoutSignature(bodyElement, pageElements);
  }, [bodyElement, pageElements]);
  const childrenIdMap = useMemo(() => {
    return buildChildrenIdMap(pageChildrenMap);
  }, [pageChildrenMap]);

  const sortedElements = useMemo(() => {
    return [...pageElements].sort((a, b) => {
      const depthA = depthMap.get(a.id) ?? 0;
      const depthB = depthMap.get(b.id) ?? 0;
      if (depthA !== depthB) {
        return depthA - depthB;
      }
      return (a.order_num || 0) - (b.order_num || 0);
    });
  }, [depthMap, pageElements]);

  const cullingCacheKey = useMemo(() => {
    return [
      bodyElement?.page_id ?? "page",
      pageElementsSignature,
      zoom,
      panOffset.x,
      panOffset.y,
      pagePositionVersion,
    ].join(":");
  }, [
    bodyElement?.page_id,
    pageElementsSignature,
    zoom,
    panOffset.x,
    panOffset.y,
    pagePositionVersion,
  ]);

  const topLevelViewport = useMemo(() => {
    const screenWidth =
      typeof window !== "undefined" ? window.innerWidth : pageWidth;
    const screenHeight =
      typeof window !== "undefined" ? window.innerHeight : pageHeight;

    return calculateViewportBounds(screenWidth, screenHeight);
  }, [pageHeight, pageWidth, pagePositionVersion, panOffset.x, panOffset.y, zoom]);

  const topLevelCandidateIds = useMemo(() => {
    return getCachedTopLevelCandidateIds({
      bodyElementId: bodyElement?.id ?? null,
      cacheKey: `${cullingCacheKey}:top-level`,
      pageChildrenMap,
      viewport: topLevelViewport,
    });
  }, [bodyElement?.id, cullingCacheKey, pageChildrenMap, topLevelViewport]);

  const cullingCandidates = useMemo(() => {
    if (topLevelCandidateIds.size === 0) {
      return sortedElements;
    }

    return sortedElements.filter((element) => topLevelCandidateIds.has(element.id));
  }, [sortedElements, topLevelCandidateIds]);

  const { visibleElements } = useViewportCulling({
    cacheKey: cullingCacheKey,
    elements: cullingCandidates,
    zoom,
    panOffset,
    enabled: true,
    version: pagePositionVersion,
  });

  const renderIdSet = useMemo(() => {
    return getCachedRenderIdSet({
      cacheKey: `${cullingCacheKey}:renderIdSet`,
      elementById,
      visibleElements,
    });
  }, [cullingCacheKey, elementById, visibleElements]);

  const fullTreeLayoutMap = useMemo(() => {
    void layoutVersion;
    return getCachedPageLayout({
      bodyElement,
      childrenIdMap,
      elementById,
      pageChildrenMap,
      pageDirtyState,
      pageElementsSignature,
      pageLayoutSignature,
      pageHeight,
      pageWidth,
      wasmLayoutReady,
    });
  }, [
    bodyElement,
    childrenIdMap,
    elementById,
    layoutVersion,
    pageChildrenMap,
    pageDirtyState,
    pageElementsSignature,
    pageLayoutSignature,
    pageHeight,
    pageWidth,
    wasmLayoutReady,
  ]);

  // 레이아웃 결과 사이드 이펙트: publish + 성능 측정
  useEffect(() => {
    if (!bodyElement) return;

    if (import.meta.env.DEV && !fullTreeLayoutMap) {
      console.warn(
        "[Phase1] Full-tree layout failed, falling back to per-level",
      );
    }

    if (import.meta.env.DEV && fullTreeLayoutMap) {
      updateElementCount(fullTreeLayoutMap.size);
    }

    publishLayoutMap(fullTreeLayoutMap, bodyElement.page_id);
  }, [fullTreeLayoutMap, bodyElement]);

  const renderedTree = useMemo(() => {
    function isContainerTagForLayout(
      tag: string,
      style?: Record<string, unknown>,
    ): boolean {
      if (tag === "Section") {
        return style?.display === "flex" || style?.flexDirection !== undefined;
      }
      return !NON_CONTAINER_TAGS.has(tag);
    }

    function createContainerChildRenderer(
      containerElement: Element,
      containerWidth: number,
      containerHeight: number,
      overrideChildren?: Element[],
    ): (childElement: Element) => React.ReactNode {
      let cachedLayoutMap: Map<string, ComputedLayout> | null = null;
      let cachedPadding = { top: 0, right: 0, bottom: 0, left: 0 };
      const containerChildren =
        overrideChildren ?? pageChildrenMap.get(containerElement.id) ?? [];

      return (childElement: Element): React.ReactNode => {
        if (!cachedLayoutMap) {
          const { effectiveParent } = applyImplicitStyles(
            containerElement,
            containerChildren,
            (id: string) => pageChildrenMap.get(id) ?? [],
            elementById,
          );
          void effectiveParent;

          if (fullTreeLayoutMap) {
            cachedLayoutMap = fullTreeLayoutMap;
          } else {
            const parentStyle = containerElement.props?.style as
              | Record<string, unknown>
              | undefined;
            cachedPadding = parsePadding(parentStyle, containerWidth);
            cachedLayoutMap = new Map();
          }
        }

        const layout = cachedLayoutMap.get(childElement.id);
        if (!layout) {
          return null;
        }

        let effectiveChildElement = childElement;
        const containerTag = containerElement.tag ?? "";

        if (containerTag === "Card") {
          const cardProps = containerElement.props as
            | Record<string, unknown>
            | undefined;
          if (childElement.tag === "Heading") {
            const headingText = cardProps?.title;
            if (headingText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(headingText),
                },
              };
            }
          } else if (childElement.tag === "Description") {
            const descriptionText = cardProps?.description;
            if (descriptionText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(descriptionText),
                },
              };
            }
          }
        }

        if (containerTag === "CardHeader") {
          const cardElement = elementById.get(containerElement.parent_id ?? "");
          if (cardElement && childElement.tag === "Heading") {
            const cardProps = cardElement.props as
              | Record<string, unknown>
              | undefined;
            const headingText = cardProps?.heading ?? cardProps?.title;
            if (headingText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(headingText),
                },
              };
            }
          }
        }

        if (containerTag === "CardContent") {
          const cardElement = elementById.get(containerElement.parent_id ?? "");
          if (cardElement && childElement.tag === "Description") {
            const cardProps = cardElement.props as
              | Record<string, unknown>
              | undefined;
            const descriptionText = cardProps?.description;
            if (descriptionText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(descriptionText),
                },
              };
            }
          }
        }

        if (
          [
            "TextField",
            "NumberField",
            "SearchField",
            "DateField",
            "TimeField",
            "ColorField",
            "TextArea",
          ].includes(containerTag)
        ) {
          const fieldProps = containerElement.props as
            | Record<string, unknown>
            | undefined;
          if (childElement.tag === "Label") {
            const labelText = fieldProps?.label;
            if (labelText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(labelText),
                },
              };
            }
          }
        }

        if (["Checkbox", "Radio", "Switch"].includes(containerTag)) {
          const formProps = containerElement.props as
            | Record<string, unknown>
            | undefined;
          if (childElement.tag === "Label") {
            const labelText = formProps?.children ?? formProps?.label;
            if (labelText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(labelText),
                },
              };
            }
          }
        }

        if (
          ["Dialog", "Popover", "Tooltip", "Toast", "Form"].includes(
            containerTag,
          )
        ) {
          const overlayProps = containerElement.props as
            | Record<string, unknown>
            | undefined;
          if (childElement.tag === "Heading") {
            const headingText = overlayProps?.heading ?? overlayProps?.title;
            if (headingText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(headingText),
                },
              };
            }
          } else if (childElement.tag === "Description") {
            const descriptionText =
              overlayProps?.description ?? overlayProps?.message;
            if (descriptionText != null) {
              effectiveChildElement = {
                ...childElement,
                props: {
                  ...childElement.props,
                  children: String(descriptionText),
                },
              };
            }
          }
        }

        if (
          effectiveChildElement.tag === "Input" &&
          [
            "TextField",
            "NumberField",
            "SearchField",
            "DateField",
            "TimeField",
            "ColorField",
            "TextArea",
          ].includes(containerTag)
        ) {
          const existingStyle = (effectiveChildElement.props?.style ||
            {}) as Record<string, unknown>;
          if (existingStyle.backgroundColor === "transparent") {
            const { backgroundColor, ...restStyle } = existingStyle;
            void backgroundColor;
            effectiveChildElement = {
              ...effectiveChildElement,
              props: { ...effectiveChildElement.props, style: restStyle },
            };
          }
        }

        if (
          effectiveChildElement.tag === "SelectTrigger" ||
          effectiveChildElement.tag === "SelectValue" ||
          effectiveChildElement.tag === "SelectIcon" ||
          effectiveChildElement.tag === "ComboBoxWrapper" ||
          effectiveChildElement.tag === "ComboBoxInput" ||
          effectiveChildElement.tag === "ComboBoxTrigger"
        ) {
          const existingStyle = (effectiveChildElement.props?.style ||
            {}) as Record<string, unknown>;
          const shouldStripTransparentBg =
            existingStyle.backgroundColor === "transparent";
          const shouldStripTransparentColor =
            existingStyle.color === "transparent";

          if (shouldStripTransparentBg || shouldStripTransparentColor) {
            const { backgroundColor, color, ...restStyle } = existingStyle;
            void backgroundColor;
            void color;
            effectiveChildElement = {
              ...effectiveChildElement,
              props: { ...effectiveChildElement.props, style: restStyle },
            };
          }
        }

        const childStyle = effectiveChildElement.props?.style as
          | Record<string, unknown>
          | undefined;
        const isContainerType = isContainerTagForLayout(
          effectiveChildElement.tag,
          childStyle,
        );
        const childElements = isContainerType
          ? (pageChildrenMap.get(effectiveChildElement.id) ?? [])
          : [];

        let effectiveChildElements = childElements;
        if (
          isContainerType &&
          childElements.length === 0 &&
          ["Radio", "Checkbox", "Switch", "Toggle"].includes(
            effectiveChildElement.tag,
          )
        ) {
          const childrenText = (
            effectiveChildElement.props as Record<string, unknown> | undefined
          )?.children;
          if (typeof childrenText === "string" && childrenText.trim()) {
            const isIndicatorTag =
              effectiveChildElement.tag === "Checkbox" ||
              effectiveChildElement.tag === "Radio";
            let indicatorOffset = 0;
            if (isIndicatorTag) {
              const elementProps = effectiveChildElement.props as Record<
                string,
                unknown
              >;
              const indicatorBoxes: Record<string, number> = {
                sm: 16,
                md: 20,
                lg: 24,
              };
              const indicatorGaps: Record<string, number> = {
                sm: 6,
                md: 8,
                lg: 10,
              };
              const size = (elementProps?.size as string) ?? "md";
              const box = indicatorBoxes[size] ?? 20;
              const elementStyle =
                (elementProps?.style as Record<string, unknown>) ?? {};
              const parsedGap = parseFloat(String(elementStyle.gap ?? ""));
              const gap = !Number.isNaN(parsedGap)
                ? parsedGap
                : (indicatorGaps[size] ?? 8);
              indicatorOffset = box + gap;
            }
            const syntheticLabel = {
              id: `${effectiveChildElement.id}__synlabel`,
              tag: "Label",
              props: {
                children: childrenText,
                style: {
                  fontSize: 14,
                  backgroundColor: "transparent",
                  ...(indicatorOffset ? { marginLeft: indicatorOffset } : {}),
                },
              },
              parent_id: effectiveChildElement.id,
              page_id: effectiveChildElement.page_id,
              order_num: 1,
            } as Element;
            effectiveChildElements = [syntheticLabel];
          }
        }

        const hasOverrideChildren = effectiveChildElements !== childElements;

        return (
          <DirectContainer
            key={effectiveChildElement.id}
            elementId={effectiveChildElement.id}
            x={layout.x + cachedPadding.left}
            y={layout.y + cachedPadding.top}
            width={layout.width}
            height={layout.height}
          >
            <ElementSprite
              element={effectiveChildElement}
              childElements={
                isContainerType ? effectiveChildElements : undefined
              }
              renderChildElement={
                isContainerType && effectiveChildElements.length > 0
                  ? createContainerChildRenderer(
                      effectiveChildElement,
                      layout.width,
                      layout.height,
                      hasOverrideChildren ? effectiveChildElements : undefined,
                    )
                  : undefined
              }
            />
            {!isContainerType &&
              renderTree(effectiveChildElement.id, {
                width: layout.width,
                height: layout.height,
              })}
          </DirectContainer>
        );
      };
    }

    function renderWithCustomEngine(
      parentElement: Element,
      children: Element[],
      renderTreeFn: (
        parentId: string | null,
        parentComputedSize?: { width: number; height: number },
      ) => React.ReactNode,
      parentComputedSize?: { width: number; height: number },
    ): React.ReactNode {
      const parentStyle = parentElement.props?.style as
        | Record<string, unknown>
        | undefined;
      const isBodyParent = parentElement === bodyElement;
      const parentContentWidth = parentComputedSize?.width ?? pageWidth;
      const parentPadding = parsePadding(parentStyle, parentContentWidth);
      void isBodyParent;

      const parentHasAutoHeight =
        !parentStyle?.height || parentStyle.height === "auto";
      const parentContentHeight =
        parentComputedSize?.height ??
        (parentHasAutoHeight ? undefined : pageHeight);
      void parentContentHeight;

      const paddingOffsetX =
        isBodyParent || fullTreeLayoutMap ? 0 : parentPadding.left;
      const paddingOffsetY =
        isBodyParent || fullTreeLayoutMap ? 0 : parentPadding.top;

      const layoutMap: Map<string, ComputedLayout> =
        fullTreeLayoutMap ?? new Map();

      return (
        <pixiContainer
          key={`engine-wrapper-${parentElement.id}`}
          x={paddingOffsetX}
          y={paddingOffsetY}
        >
          {children.map((child) => {
            if (!renderIdSet.has(child.id)) {
              return null;
            }
            const layout = layoutMap.get(child.id);
            if (!layout) {
              return null;
            }

            const childStyle = child.props?.style as
              | Record<string, unknown>
              | undefined;
            const isContainerType = isContainerTagForLayout(
              child.tag,
              childStyle,
            );
            let childElements = isContainerType
              ? (pageChildrenMap.get(child.id) ?? [])
              : [];

            let tabsRenderChildren: Element[] | undefined;
            if (child.tag === "Tabs" && isContainerType) {
              let panelChildren = childElements.filter(
                (candidate) => candidate.tag === "Panel",
              );
              if (panelChildren.length === 0) {
                const tabPanelsElement = childElements.find(
                  (candidate) => candidate.tag === "TabPanels",
                );
                if (tabPanelsElement) {
                  panelChildren = (
                    pageChildrenMap.get(tabPanelsElement.id) ?? []
                  ).filter((candidate) => candidate.tag === "Panel");
                }
              }
              const activePanel = panelChildren[0];
              tabsRenderChildren = activePanel ? [activePanel] : [];
              if (
                activePanel &&
                !childElements.some(
                  (candidate) => candidate.id === activePanel.id,
                )
              ) {
                childElements = [...childElements, activePanel];
              }
            }

            const renderChildren = tabsRenderChildren ?? childElements;

            return (
              <DirectContainer
                key={child.id}
                elementId={child.id}
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={layout.height}
              >
                <ElementSprite
                  element={child}
                  childElements={isContainerType ? childElements : undefined}
                  renderChildElement={
                    isContainerType && renderChildren.length > 0
                      ? createContainerChildRenderer(
                          child,
                          layout.width,
                          layout.height,
                          renderChildren,
                        )
                      : undefined
                  }
                />
                {!isContainerType &&
                  renderTreeFn(child.id, {
                    width: layout.width,
                    height: layout.height,
                  })}
              </DirectContainer>
            );
          })}
        </pixiContainer>
      );
    }

    function renderTree(
      parentId: string | null,
      parentComputedSize?: { width: number; height: number },
    ): React.ReactNode {
      const children = pageChildrenMap.get(parentId) ?? [];
      if (children.length === 0) {
        return null;
      }

      const parentElement = parentId ? elementById.get(parentId) : bodyElement;
      if (!parentElement) {
        return null;
      }

      return renderWithCustomEngine(
        parentElement,
        children,
        renderTree,
        parentComputedSize,
      );
    }

    return renderTree(bodyElement?.id ?? null);
  }, [
    bodyElement,
    elementById,
    fullTreeLayoutMap,
    pageChildrenMap,
    pageHeight,
    pageWidth,
    renderIdSet,
  ]);

  const bodyStyle = bodyElement?.props?.style as
    | Record<string, unknown>
    | undefined;
  const bodyBorder = useMemo(() => parseBorder(bodyStyle), [bodyStyle]);
  const bodyPadding = useMemo(
    () => parsePadding(bodyStyle, pageWidth),
    [bodyStyle, pageWidth],
  );

  const contentOffsetX = fullTreeLayoutMap
    ? 0
    : bodyBorder.left + bodyPadding.left;
  const contentOffsetY = fullTreeLayoutMap
    ? 0
    : bodyBorder.top + bodyPadding.top;

  return (
    <pixiContainer
      label="ElementsLayer"
      x={contentOffsetX}
      y={contentOffsetY}
      eventMode="static"
      interactiveChildren={true}
    >
      {renderedTree}
    </pixiContainer>
  );
});
