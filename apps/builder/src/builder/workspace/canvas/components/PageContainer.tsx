import { memo, useCallback, useMemo } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import { Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import { BodyLayer } from "../layers";
import { CanvasBounds } from "./CanvasBounds";

export interface PageContainerProps {
  appReady: boolean;
  bodyElement: Element | null;
  children?: React.ReactNode;
  isVisible: boolean;
  onTitleDragStart: (pageId: string, clientX: number, clientY: number) => void;
  pageHeight: number;
  pageId: string;
  pageWidth: number;
  posX: number;
  posY: number;
  wasmLayoutReady: boolean;
  zoom: number;
}

const PAGE_TITLE_HIT_HEIGHT = 24;

const titleHitDraw = (pageWidth: number) => (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.rect(0, -PAGE_TITLE_HIT_HEIGHT, pageWidth, PAGE_TITLE_HIT_HEIGHT);
  graphics.fill({ color: 0xffffff, alpha: 0.001 });
};

export const PageContainer = memo(function PageContainer({
  pageId,
  posX,
  posY,
  pageWidth,
  pageHeight,
  zoom,
  wasmLayoutReady,
  isVisible,
  appReady,
  bodyElement,
  onTitleDragStart,
  children,
}: PageContainerProps) {
  const draw = useMemo(() => titleHitDraw(pageWidth), [pageWidth]);

  const handleTitlePointerDown = useCallback(
    (event: FederatedPointerEvent) => {
      event.stopPropagation();
      onTitleDragStart(pageId, event.clientX, event.clientY);
    },
    [onTitleDragStart, pageId],
  );

  return (
    <pixiContainer
      label={`Page-${pageId}`}
      x={posX}
      y={posY}
      eventMode="static"
      interactiveChildren={true}
    >
      <pixiGraphics
        draw={draw}
        eventMode="static"
        cursor="grab"
        onPointerDown={handleTitlePointerDown}
      />
      <BodyLayer
        pageId={pageId}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
      />
      <CanvasBounds width={pageWidth} height={pageHeight} zoom={zoom} />
      {isVisible && appReady && wasmLayoutReady && bodyElement ? children : null}
    </pixiContainer>
  );
});
