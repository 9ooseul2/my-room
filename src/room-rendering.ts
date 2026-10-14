/**
 * Shared authoring measurements for full-canvas room PNGs.
 *
 * CSS remains the visual-layout source of truth. This module supplies the
 * authored asset coordinate system and detail-only furniture hit paths without
 * changing PNG placement, Overview sizing, or Detail sizing.
 */

export interface LogicalPoint {
  x: number
  y: number
}

export interface LogicalBounds extends LogicalPoint {
  width: number
  height: number
}

export interface LogicalHitAreaGuide {
  /** Interactive-furniture identifier within its room. */
  id: string
  /** Alpha-derived visual bounds in the room's logical canvas coordinates. */
  bounds: LogicalBounds
  /** Compound SVG path in the same logical canvas coordinate system. */
  path: string
  /** Brief visual affordance shown while this furniture is hovered. */
  hint: string
}

export const roomRenderingStandard = {
  /**
   * The dimensions of the Spanish PNG files currently loaded by the browser.
   * Every new runtime PNG layer for a room must share these dimensions.
   */
  logicalCanvas: {
    width: 1052,
    height: 1052,
    origin: 'top-left' as const,
    xAxis: 'right' as const,
    yAxis: 'down' as const,
    units: 'logical-px' as const,
  },

  /**
   * Historical source information only. The approved Spanish source artwork was
   * authored at 1254 × 1254, then its common transparent margin was cropped
   * losslessly to the current 1052 × 1052 runtime canvas. Do not mix these
   * coordinate systems inside one room.
   */
  spanishSourceArchive: {
    originalCanvas: { width: 1254, height: 1254 },
    runtimeCrop: { x: 101, y: 90, width: 1052, height: 1052 },
  },

  /**
   * Measured from the visible alpha bounds of the current Spanish background.
   * It is the reference visible room envelope for newly authored PNG rooms.
   */
  referenceShellBounds: {
    x: 17,
    y: 1,
    width: 1018,
    height: 1051,
  },
  /** The shared visual-stage centre, in logical canvas pixels. */
  roomAnchor: { x: 526, y: 526 },

  /** CSS values currently governing Overview; kept as metadata, not overrides. */
  overview: {
    desktopMapSize: 'min(480px, calc(35vw - 28px))',
    mobileMapSize: 'min(100%, 480px)',
    roomContainerWidthRatio: 0.42,
    roomContainerAspectRatio: 1,
    anchors: {
      baseball: { top: 0.04, left: 0.29 },
      spanish: { top: 0.49, left: 0.01 },
      knitting: { top: 0.49, right: 0.01 },
    },
  },

  /** CSS values currently governing Detail; the result remains viewport-sized. */
  detail: {
    panelWidthRatio: 0.65,
    desktopCanvasSize: 'min(100%, 860px, calc(100svh - 178px))',
    mobileCanvasSize: 'min(100%, 560px, calc(100svh - 246px))',
    canvasAspectRatio: 1,
  },

  /** Back-to-front stage ordering for PNG-room implementations. */
  layerOrder: ['background', 'interactive-furniture', 'interaction-hit-areas', 'ui'] as const,

  /**
   * Paths are limited to the visible furniture silhouette. They are rendered in
   * the detail-only UI layer, never on the transparent PNG canvas itself.
   */
  furnitureHitAreas: {
    baseball: [
      {
        // The left-wall interior only. It follows the Baseball Room PNG's
        // existing wall plane and intentionally excludes wood trim, floor,
        // central seam, and the right-wall corkboard.
        id: 'uniform-zone',
        bounds: { x: 71, y: 68, width: 452, height: 619 },
        path: 'M 71 327 L 523 68 L 523 427 L 71 687 Z',
        hint: 'MY UNIFORMS',
      },
    ] satisfies readonly LogicalHitAreaGuide[],
    spanish: [
      {
        id: 'bookshelf',
        bounds: { x: 169, y: 109, width: 319, height: 559 },
        path: 'M 460 109 L 487 484 L 209 667 L 169 637 L 169 285 Z',
        hint: 'MY STUDY ARCHIVE',
      },
      {
        id: 'desk',
        bounds: { x: 520, y: 478, width: 326, height: 303 },
        path: 'M 633 478 L 805 490 L 845 596 L 740 669 L 537 554 Z M 704 613 L 836 596 L 836 733 L 786 751 L 786 666 L 739 686 Z',
        hint: 'DAILY STUDY',
      },
      {
        // Alpha-measured outline for public/rooms/spanish-calendar-layer.png.
        // The art remains in the shared 1052 × 1052 coordinate system; only
        // this wall-plane silhouette receives pointer events once the PNG loads.
        id: 'calendar',
        bounds: { x: 686, y: 292, width: 106, height: 155 },
        path: 'M 688 292 L 792 350 L 791 445 L 780 447 L 688 400 Z',
        hint: 'STUDY PROGRESS',
      },
    ] satisfies readonly LogicalHitAreaGuide[],
  },
} as const
