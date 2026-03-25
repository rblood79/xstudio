import React from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Panel,
  Card,
  Button,
  Link,
  Badge,
  Tooltip,
  ProgressBar,
  Meter,
  Separator,
  Breadcrumbs,
  Breadcrumb,
  Group,
  Skeleton,
  RangeCalendar,
} from "../components/list";
import { Slot } from "../components/Slot";
import { getIconData } from "@xstudio/specs";
import type {
  PreviewElement,
  RenderContext,
  DataBinding,
  ColumnMapping,
  BadgeVariant,
} from "../types";

/** Button 내부 아이콘 SVG 렌더링 (Preview용) */
const BUTTON_ICON_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

function renderButtonIcon(
  iconName: string,
  size?: string,
  strokeWidth?: number,
  overrideFontSize?: number,
): React.ReactNode | null {
  const data = getIconData(iconName);
  if (!data) return null;
  // fontSize 오버라이드 시 iconSize = fontSize
  const s =
    overrideFontSize != null
      ? overrideFontSize
      : (BUTTON_ICON_SIZE_MAP[size || "md"] ?? 16);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {data.paths.map((d: string, i: number) => (
        <path key={i} d={d} />
      ))}
      {data.circles?.map(
        (c: { cx: number; cy: number; r: number }, i: number) => (
          <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} />
        ),
      )}
    </svg>
  );
}

/**
 * Layout 관련 컴포넌트 렌더러
 * - Tabs, TabList, Tab, TabPanel
 * - Panel
 * - Card
 * - Button
 * - Text
 * - Tooltip, ProgressBar, Meter
 */

/**
 * Tabs 렌더링
 */
export const renderTabs = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, updateElementProps, renderElement } = context;

  // PropertyDataBinding 형식 감지
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding =
    dataBinding &&
    typeof dataBinding === "object" &&
    "source" in (dataBinding as object) &&
    "name" in (dataBinding as object) &&
    !("type" in (dataBinding as object));

  // 1단계: 직속 자식에서 Tab 검색 (기존 구조 호환)
  let tabChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Tab")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 2단계: TabList 아래에서 Tab 검색 (새 구조)
  if (tabChildren.length === 0) {
    const tabListElement = elements.find(
      (child) => child.parent_id === element.id && child.tag === "TabList",
    );
    if (tabListElement) {
      tabChildren = elements
        .filter(
          (child) =>
            child.parent_id === tabListElement.id && child.tag === "Tab",
        )
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }
  }

  // 1단계: 직속 자식에서 Panel 검색 (기존 구조 호환)
  let panelChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Panel")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 2단계: TabPanels 아래에서 Panel 검색 (새 구조)
  if (panelChildren.length === 0) {
    const tabPanelsElement = elements.find(
      (child) => child.parent_id === element.id && child.tag === "TabPanels",
    );
    if (tabPanelsElement) {
      panelChildren = elements
        .filter(
          (child) =>
            child.parent_id === tabPanelsElement.id && child.tag === "Panel",
        )
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }
  }

  return (
    <Tabs
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      defaultSelectedKey={String(element.props.defaultSelectedKey || "")}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      isDisabled={Boolean(element.props.isDisabled)}
      dataBinding={
        (isPropertyBinding ? dataBinding : element.dataBinding) as
          | DataBinding
          | undefined
      }
      columnMapping={element.props.columnMapping as ColumnMapping | undefined}
      onSelectionChange={(key) => {
        const updatedProps = {
          ...element.props,
          selectedKey: key,
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      <TabList showIndicator={Boolean(element.props.showIndicator)}>
        {tabChildren.map((tab) => {
          // tabId prop을 React Aria key로 사용 (defaultSelectedKey와 매칭)
          const tabKey = (tab.props.tabId as string) || tab.id;
          return (
            <Tab key={tab.id} id={tabKey}>
              {typeof tab.props.title === "string"
                ? tab.props.title
                : String(tab.props.title || "")}
            </Tab>
          );
        })}
      </TabList>

      {tabChildren.map((tab) => {
        const correspondingPanel = panelChildren.find((panel) => {
          if (panel.props.tabId && tab.props.tabId) {
            return panel.props.tabId === tab.props.tabId;
          }
          return (panel.order_num || 0) === (tab.order_num || 0) + 1;
        });

        if (!correspondingPanel) {
          console.warn(`No corresponding panel found for tab ${tab.id}`);
          return null;
        }

        // tabId prop을 React Aria key로 사용 (Tab id와 매칭)
        const tabKey = (tab.props.tabId as string) || tab.id;
        return (
          <TabPanel key={correspondingPanel.id} id={tabKey}>
            <Panel
              key={correspondingPanel.id}
              data-element-id={correspondingPanel.id}
              variant={
                (correspondingPanel.props.variant as
                  | "default"
                  | "tab"
                  | "sidebar"
                  | "card"
                  | "modal") || "tab"
              }
              title={
                typeof correspondingPanel.props.title === "string"
                  ? correspondingPanel.props.title
                  : undefined
              }
              style={correspondingPanel.props.style}
              className={correspondingPanel.props.className}
            >
              {elements
                .filter((child) => child.parent_id === correspondingPanel.id)
                .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                .map((child) => renderElement(child))}
            </Panel>
          </TabPanel>
        );
      })}
    </Tabs>
  );
};

/**
 * TabList 렌더링
 * TabList는 부모 Tabs 렌더러가 직접 처리하므로 null 반환
 */
export const renderTabList = (
  _element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return null;
};

/**
 * TabPanels 렌더링
 * TabPanels는 부모 Tabs 렌더러가 직접 처리하므로 null 반환
 */
export const renderTabPanels = (
  _element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return null;
};

/**
 * Panel 렌더링
 */
export const renderPanel = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Panel
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      variant={
        (element.props.variant as
          | "default"
          | "tab"
          | "sidebar"
          | "card"
          | "modal") || "default"
      }
      title={
        typeof element.props.title === "string"
          ? element.props.title
          : undefined
      }
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Panel>
  );
};

/**
 * Card 렌더링
 */
export const renderCard = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const allChildren = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 새 구조 감지: CardHeader/CardContent/CardPreview/CardFooter 자식이 있는지 확인
  const hasStructuralChildren = allChildren.some(
    (c) =>
      c.tag === "CardHeader" ||
      c.tag === "CardContent" ||
      c.tag === "CardPreview" ||
      c.tag === "CardFooter",
  );

  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  if (hasStructuralChildren) {
    // 새 구조: title/description은 children(CardHeader/CardContent)에서 처리
    return (
      <Card
        key={element.id}
        id={element.customId}
        data-element-id={element.id}
        data-accent={
          element.props.accentColor
            ? String(element.props.accentColor)
            : undefined
        }
        variant={(element.props.variant as string) || "primary"}
        cardType={
          (element.props.cardType as
            | "default"
            | "asset"
            | "user"
            | "product") || undefined
        }
        size={(element.props.size as "sm" | "md" | "lg" | undefined) || "md"}
        isQuiet={Boolean(element.props.isQuiet)}
        isSelected={Boolean(element.props.isSelected)}
        isDisabled={Boolean(element.props.isDisabled)}
        isFocused={Boolean(element.props.isFocused)}
        structuralChildren={true}
        style={element.props.style}
        className={element.props.className}
        onClick={eventHandlers.onClick as unknown as () => void}
      >
        {allChildren.map((child) => renderElement(child, child.id))}
      </Card>
    );
  }

  // 이전 구조: Heading/Description은 title/description props로 처리
  const children = allChildren.filter(
    (child) => child.tag !== "Heading" && child.tag !== "Description",
  );

  return (
    <Card
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      heading={
        typeof element.props.heading === "string"
          ? element.props.heading
          : undefined
      }
      subheading={
        typeof element.props.subheading === "string"
          ? element.props.subheading
          : undefined
      }
      title={
        typeof element.props.title === "string"
          ? element.props.title
          : undefined
      }
      description={
        element.props.description
          ? String(element.props.description)
          : undefined
      }
      footer={
        typeof element.props.footer === "string"
          ? element.props.footer
          : undefined
      }
      variant={(element.props.variant as string) || "primary"}
      cardType={
        (element.props.cardType as "default" | "asset" | "user" | "product") ||
        undefined
      }
      size={(element.props.size as "sm" | "md" | "lg" | undefined) || "md"}
      isQuiet={Boolean(element.props.isQuiet)}
      isSelected={Boolean(element.props.isSelected)}
      isDisabled={Boolean(element.props.isDisabled)}
      isFocused={Boolean(element.props.isFocused)}
      style={element.props.style}
      className={element.props.className}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Card>
  );
};

/**
 * CardHeader 렌더링
 * Card 새 구조에서 header 영역을 담당하는 투명 컨테이너
 */
export const renderCardHeader = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((c) => c.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      className="card-header"
      style={element.props?.style as React.CSSProperties}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * CardContent 렌더링
 * Card 새 구조에서 content 영역을 담당하는 투명 컨테이너
 *
 * Description 자식은 React Aria slot="description" 컨텍스트가 없으므로
 * plain <div class="card-description"> 으로 직접 렌더링
 */
export const renderCardContent = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((c) => c.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      className="card-content"
      style={element.props?.style as React.CSSProperties}
    >
      {children.map((child) => {
        // Description: React Aria slot 컨텍스트 없이 직접 렌더링
        if (child.tag === "Description") {
          const text =
            typeof child.props?.children === "string"
              ? child.props.children
              : typeof child.props?.text === "string"
                ? child.props.text
                : null;
          return (
            <div
              key={child.id}
              data-element-id={child.id}
              className="card-description"
              style={child.props?.style as React.CSSProperties}
            >
              {text}
            </div>
          );
        }
        return renderElement(child, child.id);
      })}
    </div>
  );
};

/**
 * CardPreview 렌더링
 * Card 구조에서 이미지/미디어 미리보기 영역을 담당하는 컨테이너
 */
export const renderCardPreview = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((c) => c.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      className="card-preview"
      style={element.props?.style as React.CSSProperties}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * CardFooter 렌더링
 * Card 구조에서 하단 액션/상태 영역을 담당하는 컨테이너
 */
export const renderCardFooter = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((c) => c.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      className="card-footer"
      style={element.props?.style as React.CSSProperties}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * Button 렌더링
 */
export const renderButton = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  // React Aria Button은 onPress를 사용하므로 onClick과 onPress 모두 확인
  const handlePress = eventHandlers.onPress || eventHandlers.onClick;

  return (
    <Button
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      variant={
        (element.props.variant as
          | "accent"
          | "primary"
          | "secondary"
          | "negative"
          | "premium"
          | "genai") || "primary"
      }
      fillStyle={(element.props.fillStyle as "fill" | "outline") || "fill"}
      size={element.props.size as "xs" | "sm" | "md" | "lg" | "xl"}
      type={(element.props.type as "button" | "submit" | "reset") || "button"}
      isDisabled={Boolean(element.props.isDisabled as boolean)}
      isPending={Boolean(element.props.isPending)}
      name={element.props.name ? String(element.props.name) : undefined}
      style={element.props.style}
      className={element.props.className}
      onPress={handlePress as unknown as () => void}
      onHoverStart={
        eventHandlers.onMouseEnter as unknown as (e: unknown) => void
      }
      onHoverEnd={eventHandlers.onMouseLeave as unknown as (e: unknown) => void}
      onFocus={eventHandlers.onFocus as unknown as (e: unknown) => void}
      onBlur={eventHandlers.onBlur as unknown as (e: unknown) => void}
      onKeyDown={eventHandlers.onKeyDown as unknown as (e: unknown) => void}
      onKeyUp={eventHandlers.onKeyUp as unknown as (e: unknown) => void}
      {...(element.props.iconName && !element.props.children
        ? { "data-icon-only": true }
        : {})}
    >
      {(() => {
        const iconName = element.props.iconName as string | undefined;
        const iconPos = (element.props.iconPosition as string) || "start";
        const styleFontSize =
          element.props.style?.fontSize != null
            ? typeof element.props.style.fontSize === "number"
              ? element.props.style.fontSize
              : parseFloat(String(element.props.style.fontSize)) || undefined
            : undefined;
        const iconSvg = iconName
          ? renderButtonIcon(
              iconName,
              element.props.size as string,
              element.props.iconStrokeWidth as number | undefined,
              styleFontSize,
            )
          : null;
        const textContent =
          typeof element.props.children === "string"
            ? element.props.children
            : children.length === 0 && !iconName
              ? "Button"
              : null;

        return (
          <>
            {iconSvg && iconPos === "start" && iconSvg}
            {textContent}
            {iconSvg && iconPos === "end" && iconSvg}
          </>
        );
      })()}
      {children.map((child) => renderElement(child, child.id))}
    </Button>
  );
};

/**
 * Text 렌더링
 */
export const renderText = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const TextTag = (element.props.as || "p") as string;

  return React.createElement(
    TextTag,
    {
      key: element.id,
      "data-element-id": element.id,
      style: element.props.style,
      className: element.props.className,
    },
    element.props.children,
    ...children.map((child) => renderElement(child, child.id)),
  );
};

/**
 * Tooltip 렌더링
 */
export const renderTooltip = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Tooltip
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Tooltip>
  );
};

/**
 * ProgressBar 렌더링
 */
export const renderProgressBar = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements } = context;

  // Child element에서 label 읽기 (compositional 패턴)
  const labelEl = elements.find(
    (c) => c.parent_id === element.id && c.tag === "Label",
  );
  const label = labelEl
    ? String(labelEl.props?.children || "")
    : String(element.props.label || "");

  return (
    <ProgressBar
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={label}
      value={Number(element.props.value || 0)}
      minValue={
        element.props.minValue !== undefined
          ? Number(element.props.minValue)
          : 0
      }
      maxValue={
        element.props.maxValue !== undefined
          ? Number(element.props.maxValue)
          : 100
      }
      isIndeterminate={Boolean(element.props.isIndeterminate || false)}
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      showValue={element.props.showValue !== false}
      valueFormat={
        (element.props.valueFormat as "number" | "percent" | "custom") ||
        undefined
      }
      locale={(element.props.locale as string) || undefined}
    />
  );
};

/**
 * Meter 렌더링
 */
export const renderMeter = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements } = context;

  // Child element에서 label 읽기 (compositional 패턴)
  const meterLabelEl = elements.find(
    (c) => c.parent_id === element.id && c.tag === "Label",
  );
  const meterLabel = meterLabelEl
    ? String(meterLabelEl.props?.children || "")
    : String(element.props.label || "");

  return (
    <Meter
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={meterLabel}
      value={Number(element.props.value || 0)}
      minValue={
        element.props.minValue !== undefined
          ? Number(element.props.minValue)
          : 0
      }
      maxValue={
        element.props.maxValue !== undefined
          ? Number(element.props.maxValue)
          : 100
      }
      variant={
        (element.props.variant as
          | "informative"
          | "positive"
          | "notice"
          | "negative") || "informative"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      showValue={element.props.showValue !== false}
      valueFormat={
        (element.props.valueFormat as "number" | "percent" | "custom") ||
        undefined
      }
      locale={(element.props.locale as string) || undefined}
    />
  );
};

/**
 * Separator 렌더링
 */
export const renderSeparator = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return (
    <Separator
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      variant={
        (element.props.variant as "default" | "dashed" | "dotted") || "default"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      style={element.props.style}
      className={element.props.className}
    />
  );
};

/**
 * Group 렌더링
 */
export const renderGroup = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Group
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      label={element.props.label as string | undefined}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      role={
        (element.props.role as "group" | "region" | "presentation") || "group"
      }
      aria-label={element.props["aria-label"] as string | undefined}
      aria-labelledby={element.props["aria-labelledby"] as string | undefined}
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Group>
  );
};

/**
 * Modal 렌더링
 */
export const renderModal = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const resolvedId = element.customId || element.id;
  const mergedStyle = {
    ...(element.props.style || {}),
    display:
      element.props.isOpen === false
        ? "none"
        : (element.props.style as React.CSSProperties | undefined)?.display,
  };

  return (
    <div
      key={element.id}
      id={resolvedId}
      data-element-id={element.id}
      data-custom-id={element.customId}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      role="dialog"
      aria-modal="true"
      className={element.props.className}
      style={mergedStyle}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {children.length === 0 && typeof element.props.children === "string"
        ? element.props.children
        : children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * Breadcrumbs 렌더링
 */
export const renderBreadcrumbs = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  // PropertyDataBinding 형식 감지
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding =
    dataBinding &&
    typeof dataBinding === "object" &&
    "source" in (dataBinding as object) &&
    "name" in (dataBinding as object) &&
    !("type" in (dataBinding as object));

  const breadcrumbChildren = elements
    .filter(
      (child) => child.parent_id === element.id && child.tag === "Breadcrumb",
    )
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Breadcrumbs
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      aria-label={
        typeof element.props["aria-label"] === "string"
          ? element.props["aria-label"]
          : undefined
      }
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      dataBinding={
        (isPropertyBinding ? dataBinding : element.dataBinding) as
          | DataBinding
          | undefined
      }
      columnMapping={element.props.columnMapping as ColumnMapping | undefined}
      {...eventHandlers}
    >
      {breadcrumbChildren.map((child) => renderElement(child))}
    </Breadcrumbs>
  );
};

/**
 * Breadcrumb (아이템) 렌더링
 */
export const renderBreadcrumb = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return (
    <Breadcrumb
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      href={String(element.props.href || "")}
    >
      {element.props.children}
    </Breadcrumb>
  );
};

/**
 * Link 렌더링
 */
export const renderLink = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  return (
    <Link
      key={element.id}
      data-custom-id={element.customId || undefined}
      data-element-id={element.id}
      href={String(element.props.href || "")}
      variant={(element.props.variant as "primary" | "secondary") || undefined}
      size={(element.props.size as "sm" | "md" | "lg") || undefined}
      isExternal={Boolean(element.props.isExternal)}
      showExternalIcon={element.props.showExternalIcon !== false}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      onPress={eventHandlers.onPress as unknown as () => void}
      onHoverStart={
        eventHandlers.onMouseEnter as unknown as (e: unknown) => void
      }
      onHoverEnd={eventHandlers.onMouseLeave as unknown as (e: unknown) => void}
      onFocus={eventHandlers.onFocus as unknown as (e: unknown) => void}
      onBlur={eventHandlers.onBlur as unknown as (e: unknown) => void}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : children.length === 0
          ? "Link"
          : null}
      {children.map((child) => renderElement(child, child.id))}
    </Link>
  );
};

/**
 * Badge 렌더링
 */
export const renderBadge = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Badge
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      variant={(element.props.variant as BadgeVariant) || undefined}
      fillStyle={
        (element.props.fillStyle as "bold" | "subtle" | "outline") || undefined
      }
      size={(element.props.size as "sm" | "md" | "lg") || undefined}
      isDot={Boolean(element.props.isDot)}
      isPulsing={Boolean(element.props.isPulsing)}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : children.length === 0
          ? "1"
          : null}
      {children.map((child) => renderElement(child, child.id))}
    </Badge>
  );
};

/**
 * Slot 렌더링
 *
 * Layout 내에서 Page 콘텐츠가 삽입될 위치를 표시하는 컴포넌트.
 * - Layout 편집 모드: 빈 플레이스홀더 표시
 * - Page 렌더링 모드: Page elements로 교체됨 (layoutResolver에서 처리)
 */
export const renderSlot = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement, editMode } = context;

  // Layout 편집 모드인지 확인
  const isLayoutEditMode = editMode === "layout";

  // Slot에 들어갈 자식 요소들 (이미 layoutResolver에서 배치됨)
  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Slot
      key={element.id}
      data-element-id={element.id}
      name={String(element.props.name || "content")}
      required={Boolean(element.props.required)}
      description={String(element.props.description || "")}
      isEditMode={isLayoutEditMode}
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Slot>
  );
};

/**
 * Toast 렌더링
 *
 * Toast(div 컨테이너)
 *   ├─ Heading
 *   └─ Description
 */
export const renderToast = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      role="alert"
      style={element.props.style}
      className={element.props.className}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * Pagination 렌더링
 *
 * Pagination(nav 컨테이너)
 *   ├─ Button (Prev)
 *   ├─ Button (1, 2, 3...)
 *   └─ Button (Next)
 */
export const renderPagination = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <nav
      key={element.id}
      data-element-id={element.id}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      data-custom-id={element.customId}
      aria-label="Pagination"
      style={element.props.style}
      className={element.props.className}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {children.map((child) => renderElement(child, child.id))}
    </nav>
  );
};

/**
 * Skeleton 렌더링
 *
 * 로딩 상태를 나타내는 플레이스홀더 컴포넌트.
 */
export const renderSkeleton = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return (
    <Skeleton
      key={element.id}
      data-element-id={element.id}
      variant={
        (element.props.variant as
          | "text"
          | "circular"
          | "rectangular"
          | "rounded") || "text"
      }
      animation={
        (element.props.animation as "shimmer" | "pulse" | "wave" | "none") ||
        "shimmer"
      }
      width={
        element.props.width !== undefined
          ? (element.props.width as string | number)
          : undefined
      }
      height={
        element.props.height !== undefined
          ? (element.props.height as string | number)
          : undefined
      }
      lines={
        element.props.lines !== undefined
          ? Number(element.props.lines)
          : undefined
      }
      lastLineWidth={
        typeof element.props.lastLineWidth === "string"
          ? element.props.lastLineWidth
          : undefined
      }
      componentVariant={
        element.props.componentVariant as
          | import("../components/Skeleton").ComponentSkeletonVariant
          | undefined
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      style={element.props.style}
      className={element.props.className}
    />
  );
};

// ==================== Phase 1: Display/Feedback ====================

/**
 * Avatar 렌더링
 */
export const renderAvatar = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const size =
    { xs: 24, sm: 28, md: 32, lg: 40, xl: 48 }[
      (element.props.size as string) || "md"
    ] ?? 32;

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-muted)",
        color: "var(--fg)",
        fontSize: size * 0.4,
        fontWeight: 500,
        flexShrink: 0,
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {element.props.src ? (
        <img
          src={element.props.src as string}
          alt={(element.props.alt as string) || "Avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{(element.props.initials as string) || "?"}</span>
      )}
    </div>
  );
};

/**
 * AvatarGroup 렌더링
 */
export const renderAvatarGroup = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * StatusLight 렌더링
 */
export const renderStatusLight = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const dotSize =
    { S: 8, M: 10, L: 12 }[(element.props.size as string) || "M"] ?? 10;

  const variantColorMap: Record<string, string> = {
    neutral: "var(--fg-muted)",
    informative: "var(--color-info-600, #2563eb)",
    positive: "var(--color-green-600, #16a34a)",
    notice: "var(--color-warning-600, #d97706)",
    negative: "var(--negative, #dc2626)",
  };
  const color =
    variantColorMap[(element.props.variant as string) || "neutral"] ||
    "var(--fg-muted)";

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        ...element.props.style,
      }}
      className={element.props.className}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {element.props.children && (
        <span style={{ fontSize: 14 }}>{element.props.children as string}</span>
      )}
    </div>
  );
};

/**
 * InlineAlert 렌더링
 */
export const renderInlineAlert = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      data-variant={(element.props.variant as string) || "informative"}
      data-size={(element.props.size as string) || "md"}
      role="alert"
      className={`react-aria-InlineAlert ${element.props.className || ""}`}
      style={element.props.style}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

// ==================== Phase 2: Action/Group/Accordion (ADR-030) ====================

/**
 * ButtonGroup 렌더링
 * 버튼들을 정렬하는 컨테이너 (form footer 등)
 */
export const renderButtonGroup = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const align = (element.props.align as string) || "end";
  const justifyMap: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
  };

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="group"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: justifyMap[align] ?? "flex-end",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * ActionMenu 렌더링
 * 드롭다운 트리거 버튼만 렌더링 (메뉴 패널은 팝오버로 처리)
 */
export const renderActionMenu = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  return (
    <button
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        ...element.props.style,
      }}
      className={element.props.className}
      disabled={Boolean(element.props.isDisabled)}
      onClick={eventHandlers.onClick as unknown as React.MouseEventHandler}
    >
      {(element.props.children as React.ReactNode) ||
        (element.props.label as string) ||
        "More"}
      <span style={{ fontSize: 10, lineHeight: 1 }}>&#9660;</span>
    </button>
  );
};

/**
 * Accordion 렌더링
 * DisclosureGroup과 동일한 구조 — flex column 컨테이너
 */
export const renderAccordion = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      data-accent={
        element.props.accentColor
          ? String(element.props.accentColor)
          : undefined
      }
      style={{
        display: "flex",
        flexDirection: "column",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

// ─── Phase 3: Extended Controls (ADR-030) ────────────────────────────────────

/**
 * ProgressCircle 렌더링
 * 원형 진행률 표시기 (SVG)
 */
export const renderProgressCircle = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const size =
    element.props.size === "S" ? 24 : element.props.size === "L" ? 64 : 32;
  const strokeWidth = element.props.size === "L" ? 4 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(element.props.value ?? 0)));
  const offset = circumference - (value / 100) * circumference;
  const isIndeterminate = Boolean(element.props.isIndeterminate);

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : value}
      style={{
        width: size,
        height: size,
        ...element.props.style,
      }}
      className={element.props.className}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-muted, #e5e7eb)"
          strokeWidth={strokeWidth}
        />
        {!isIndeterminate && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent, #3b82f6)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
    </div>
  );
};

/**
 * Image 렌더링
 * 반응형 이미지 컴포넌트
 */
export const renderImage = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const src = element.props.src ? String(element.props.src) : "";
  const alt = String(element.props.alt || "Image");
  const objectFit = String(
    element.props.objectFit || "cover",
  ) as React.CSSProperties["objectFit"];

  if (src) {
    return (
      <img
        key={element.id}
        data-element-id={element.id}
        data-custom-id={element.customId}
        src={src}
        alt={alt}
        style={{
          objectFit,
          width: "100%",
          height: "100%",
          display: "block",
          ...element.props.style,
        }}
        className={element.props.className}
      />
    );
  }

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="img"
      aria-label={alt}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-muted, #f3f4f6)",
        color: "var(--fg-muted, #9ca3af)",
        fontSize: "14px",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {alt}
    </div>
  );
};

/**
 * RangeCalendar 렌더링
 * Calendar와 동일 구조 — 날짜 범위 선택
 */
export const renderRangeCalendar = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  const locale = element.props.locale as string | undefined;
  const calendarSystem = element.props.calendarSystem as string | undefined;
  const visibleMonths = Number(element.props.visibleMonths) || 1;
  const size = element.props.size as string | undefined;
  const variant = element.props.variant as string | undefined;
  // locale/calendarSystem/size 변경 시 리마운트
  const remountKey = `${element.id}-${locale || ""}-${calendarSystem || ""}-${size || ""}`;

  return (
    <RangeCalendar
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      variant={(variant as "default" | "accent") || "default"}
      size={(size as "sm" | "md" | "lg") || "md"}
      locale={locale}
      calendarSystem={calendarSystem}
      aria-label={
        typeof element.props["aria-label"] === "string"
          ? element.props["aria-label"]
          : "Range Calendar"
      }
      isDisabled={Boolean(element.props.isDisabled)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      visibleMonths={visibleMonths}
      allowsNonContiguousRanges={Boolean(
        element.props.allowsNonContiguousRanges,
      )}
      minValue={element.props.minValue as string | undefined}
      maxValue={element.props.maxValue as string | undefined}
      onChange={(dateRange) => {
        const updatedProps = {
          ...element.props,
          value: dateRange,
        };
        updateElementProps(element.id, updatedProps);
      }}
      errorMessage={String(element.props.errorMessage || "")}
    />
  );
};

// ==================== Phase 4: Advanced Components (ADR-030) ====================

/**
 * IllustratedMessage 렌더링
 */
export const renderIllustratedMessage = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const heading = (element.props.heading as string) || "No content";
  const description =
    (element.props.description as string) || "There is nothing to display.";

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {/* 일러스트 placeholder */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 12,
          backgroundColor: "var(--bg-muted, #f3f4f6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted, #9ca3af)",
          fontSize: 48,
        }}
      >
        &#9675;
      </div>
      <div
        style={{ fontSize: 18, fontWeight: 600, color: "var(--fg, #1f2937)" }}
      >
        {heading}
      </div>
      <div style={{ fontSize: 14, color: "var(--fg-muted, #6b7280)" }}>
        {description}
      </div>
    </div>
  );
};

/**
 * CardView 렌더링
 */
export const renderCardView = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const gap = (element.props.gap as number) || 16;

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="grid"
      aria-label="Card collection"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap,
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * TableView 렌더링
 */
export const renderTableView = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const isQuiet = element.props.isQuiet === true;

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="grid"
      style={{
        display: "flex",
        flexDirection: "column",
        border: isQuiet ? "none" : "1px solid var(--border, #e5e7eb)",
        borderRadius: 6,
        overflow: "hidden",
        ...element.props.style,
      }}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </div>
  );
};
