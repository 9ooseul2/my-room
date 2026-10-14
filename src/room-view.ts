import type { RoomId, RoomPanelObjectId } from './rooms'

export type { RoomObjectId, RoomPanelObjectId } from './rooms'

export interface RoomViewState {
  selectedRoom: RoomId | null
  selectedObject: RoomPanelObjectId | null
}

export class RoomViewController {
  private stateValue: RoomViewState = {
    selectedRoom: null,
    selectedObject: null,
  }
  private readonly page: HTMLElement
  private readonly onStateChange: (state: RoomViewState) => void
  private detailEntryTimer: number | undefined

  constructor(page: HTMLElement, onStateChange: (state: RoomViewState) => void) {
    this.page = page
    this.onStateChange = onStateChange
    this.sync()
  }

  get state() {
    return this.stateValue
  }

  selectRoom(roomId: RoomId) {
    this.stateValue = { selectedRoom: roomId, selectedObject: null }
    this.sync({ animateDetailEntry: true })
  }

  selectObject(objectId: RoomPanelObjectId) {
    const isBaseballPanel = this.stateValue.selectedRoom === 'baseball'
      && (objectId === 'corkboard' || objectId === 'uniform-zone')
    const isSpanishFurniture = this.stateValue.selectedRoom === 'spanish'
      && (objectId === 'bookshelf' || objectId === 'desk' || objectId === 'calendar')

    if (!isBaseballPanel && !isSpanishFurniture) return

    this.stateValue = { ...this.stateValue, selectedObject: objectId }
    this.sync()
  }

  closeObject() {
    if (!this.stateValue.selectedObject) return

    this.stateValue = { ...this.stateValue, selectedObject: null }
    this.sync()
  }

  backToOverview() {
    this.stateValue = { selectedRoom: null, selectedObject: null }
    this.sync()
  }

  private sync({ animateDetailEntry = false }: { animateDetailEntry?: boolean } = {}) {
    const { selectedRoom, selectedObject } = this.stateValue
    const view = selectedObject === 'corkboard'
      ? 'archive'
      : selectedObject
        ? 'furniture'
        : selectedRoom
          ? 'detail'
          : 'overview'

    this.page.dataset.view = view

    if (selectedRoom) {
      this.page.dataset.selectedRoom = selectedRoom
    } else {
      delete this.page.dataset.selectedRoom
    }

    if (selectedObject) {
      this.page.dataset.selectedObject = selectedObject
    } else {
      delete this.page.dataset.selectedObject
    }

    if (animateDetailEntry && view === 'detail') {
      this.startDetailEntryMotion()
    } else {
      this.stopDetailEntryMotion()
    }

    this.onStateChange(this.stateValue)
  }

  private startDetailEntryMotion() {
    this.stopDetailEntryMotion()
    this.page.dataset.detailEntry = 'true'
    this.detailEntryTimer = window.setTimeout(() => {
      delete this.page.dataset.detailEntry
      this.detailEntryTimer = undefined
    }, 300)
  }

  private stopDetailEntryMotion() {
    if (this.detailEntryTimer !== undefined) {
      window.clearTimeout(this.detailEntryTimer)
      this.detailEntryTimer = undefined
    }

    delete this.page.dataset.detailEntry
  }
}
