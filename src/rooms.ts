import spanishRoomBackgroundAsset from './assets/spanish-room-bg.png'
import spanishBookshelfLayerAsset from './assets/spanish-bookshelf-layer.png'
import spanishDeskLayerAsset from './assets/spanish-desk-layer.png'
import baseballCorkboardLayerAsset from './assets/baseball-corkboard-layer.png'

export const roomIds = ['baseball', 'spanish', 'knitting'] as const

export type RoomId = (typeof roomIds)[number]
export type RoomObjectId = 'corkboard'
export type BaseballFurnitureId = 'uniform-zone'
export type SpanishFurnitureId = 'desk' | 'bookshelf' | 'calendar'
export type RoomInteractiveObjectId = RoomObjectId | 'uniform-archive' | SpanishFurnitureId
export type RoomPanelObjectId = RoomObjectId | BaseballFurnitureId | SpanishFurnitureId

export interface RoomObjectPlacement {
  top: string
  left: string
  width: string
}

export interface RoomInteractiveObjectDefinition {
  id: RoomInteractiveObjectId
  label: string
  assetPath: string
  placement: RoomObjectPlacement
}

/**
 * A full-canvas visual asset. Every layer shares the background's coordinate
 * system so it may be stacked at (0, 0). An optional adjustment gives authored
 * layers a small, explicit placement control without changing room geometry.
 */
export interface RoomVisualLayerAdjustment {
  translateX: string
  translateY: string
  scale: number
  transformOrigin: string
}

export interface RoomVisualLayerDefinition {
  id: 'bookshelf' | 'desk' | 'calendar' | 'corkboard'
  label: string
  assetPath: string
  adjustment?: RoomVisualLayerAdjustment
}

export interface RoomDefinition {
  id: RoomId
  label: string
  number: string
  backgroundAssetPath: string
  visualLayers: readonly RoomVisualLayerDefinition[]
  interactiveObjects: readonly RoomInteractiveObjectDefinition[]
}

/**
 * The corkboard art itself is authored on the shared 1052 × 1052 canvas.
 * Keep any future visual nudge here so Overview and Detail always agree.
 */
export const baseballCorkboardLayerAdjustment = {
  translateX: '0px',
  translateY: '0px',
  scale: 1,
  transformOrigin: '72% 40%',
} as const

export const roomDefinitions: readonly RoomDefinition[] = [
  {
    id: 'baseball',
    label: 'Baseball Room',
    number: '01',
    backgroundAssetPath: '/rooms/baseball-room-bg.png',
    visualLayers: [
      {
        id: 'corkboard',
        label: '빈 야구 기록 코르크보드',
        assetPath: baseballCorkboardLayerAsset,
        adjustment: baseballCorkboardLayerAdjustment,
      },
    ],
    // The corkboard is visual-only in this phase. The left wall intentionally
    // stays open for the later uniform layer.
    interactiveObjects: [],
  },
  {
    id: 'spanish',
    label: 'Spanish Room',
    number: '02',
    backgroundAssetPath: spanishRoomBackgroundAsset,
    visualLayers: [
      {
        id: 'bookshelf',
        label: '스페인어 학습 아카이브 책장',
        assetPath: spanishBookshelfLayerAsset,
      },
      {
        // Reserve this full-canvas layer for the authored transparent PNG. The
        // image is intentionally optional until the calendar art is supplied.
        id: 'calendar',
        label: '스페인어 학습 진행 달력',
        assetPath: '/rooms/spanish-calendar-layer.png',
      },
      {
        id: 'desk',
        label: '오늘의 스페인어 공부 책상',
        assetPath: spanishDeskLayerAsset,
      },
    ],
    interactiveObjects: [],
  },
  {
    id: 'knitting',
    label: 'Knitting Room',
    number: '03',
    backgroundAssetPath: '/rooms/knitting-room-bg.png',
    visualLayers: [],
    interactiveObjects: [],
  },
]

export class RoomSelectionController {
  private activeRoomValue: RoomId | null = null
  private hoveredRoomValue: RoomId | null = null
  private readonly roomMap: HTMLElement
  private readonly onRoomSelected: (room: RoomDefinition) => void

  constructor(roomMap: HTMLElement, onRoomSelected: (room: RoomDefinition) => void) {
    this.roomMap = roomMap
    this.onRoomSelected = onRoomSelected
  }

  get activeRoom() {
    return this.activeRoomValue
  }

  setHovered(room: RoomDefinition | null) {
    if (room?.id === this.hoveredRoomValue) return

    this.hoveredRoomValue = room?.id ?? null
    this.roomMap.querySelectorAll<HTMLElement>('[data-room-id]').forEach((roomElement) => {
      roomElement.classList.toggle('is-active', roomElement.dataset.roomId === this.hoveredRoomValue)
    })
  }

  select(roomId: RoomId) {
    const room = roomDefinitions.find((definition) => definition.id === roomId)
    if (!room) return null

    this.activeRoomValue = room.id
    this.roomMap.dataset.activeRoom = room.id
    this.roomMap.querySelectorAll<HTMLElement>('[data-room-id]').forEach((roomElement) => {
      roomElement.classList.toggle('is-selected', roomElement.dataset.roomId === roomId)
    })
    this.onRoomSelected(room)

    return room
  }

  clearSelection() {
    this.activeRoomValue = null
    this.roomMap.dataset.activeRoom = ''
    this.roomMap.querySelectorAll<HTMLElement>('[data-room-id]').forEach((roomElement) => {
      roomElement.classList.remove('is-selected')
    })
  }
}
