import './style.css'
import characterSprites from './assets/room-character-sprites.png'
import spanishArchiveBookAsset from './assets/spanish-archive-book.png'
import { BaseballCollectionController } from './baseball-collection'
import { BaseballDiaryController } from './baseball-diary'
import { CharacterMovementController } from './character'
import { createModalHeaderActions } from './modal-header-actions'
import { roomRenderingStandard } from './room-rendering'
import { SpanishStudyArchiveController } from './spanish-study-archive'
import { SpanishStudyProgressCalendarController } from './spanish-study-progress-calendar'
import { SpanishStudyRepository, getCompletedSpanishStudyArchiveWeeks, spanishStudyRecordsChangedEvent } from './spanish-study'
import { DailySpanishStudyController } from './spanish-study-ui'
import {
  roomDefinitions,
  RoomSelectionController,
  type RoomDefinition,
  type BaseballFurnitureId,
  type RoomInteractiveObjectDefinition,
  type SpanishFurnitureId,
  type RoomVisualLayerDefinition,
} from './rooms'
import { RoomViewController } from './room-view'

type RoomMarkupVariant = 'overview' | 'detail'

const baseballBackgroundPlaceholder = `
  <div class="baseball-field" aria-hidden="true">
    <div class="baseball-infield">
      <span class="baseball-mound"></span>
      <span class="baseball-base baseball-base--second"></span>
      <span class="baseball-base baseball-base--third"></span>
      <span class="baseball-base baseball-base--first"></span>
      <span class="baseball-base baseball-base--home"></span>
    </div>
  </div>`

const roomObjectMarkup = (object: RoomInteractiveObjectDefinition, variant: RoomMarkupVariant) => {
  const isExistingAction = variant === 'detail' && object.id === 'corkboard'
  const interactionAttributes = isExistingAction
    ? 'data-room-object="corkboard" role="button" tabindex="0"'
    : 'role="img" tabindex="-1"'

  return `
    <img
      class="room-interactive-object room-interactive-object--${object.id}"
      data-room-object-id="${object.id}"
      data-room-asset
      ${interactionAttributes}
      src="${object.assetPath}"
      alt=""
      aria-label="${object.label}"
      style="--object-top: ${object.placement.top}; --object-left: ${object.placement.left}; --object-width: ${object.placement.width};"
    />`
}

const roomVisualLayerMarkup = (layer: RoomVisualLayerDefinition) => {
  const adjustmentStyle = layer.adjustment
    ? `style="--visual-layer-translate-x: ${layer.adjustment.translateX}; --visual-layer-translate-y: ${layer.adjustment.translateY}; --visual-layer-scale: ${layer.adjustment.scale}; --visual-layer-transform-origin: ${layer.adjustment.transformOrigin};"`
    : ''

  return `
    <img
      class="room-visual-layer room-visual-layer--${layer.id}"
      data-room-visual-layer="${layer.id}"
      data-room-asset
      src="${layer.assetPath}"
      alt=""
      aria-label="${layer.label}"
      ${adjustmentStyle}
    />`
}

const spanishBookshelfBookLayerMarkup = (room: RoomDefinition) => room.id === 'spanish'
  ? '<div class="spanish-bookshelf-book-layer" data-spanish-bookshelf-books aria-hidden="true"></div>'
  : ''

type RoomFurnitureId = BaseballFurnitureId | SpanishFurnitureId

const baseballFurnitureIds = ['uniform-zone'] as const
const spanishFurnitureIds = ['bookshelf', 'desk', 'calendar'] as const

const isSpanishFurnitureId = (value: string | undefined): value is SpanishFurnitureId =>
  spanishFurnitureIds.some((id) => id === value)

const isBaseballFurnitureId = (value: string | undefined): value is BaseballFurnitureId =>
  baseballFurnitureIds.some((id) => id === value)

const isRoomFurnitureId = (value: string | undefined): value is RoomFurnitureId =>
  isBaseballFurnitureId(value) || isSpanishFurnitureId(value)

const roomFurnitureHitAreaMarkup = (room: RoomDefinition, variant: RoomMarkupVariant) => {
  if (variant !== 'detail' || (room.id !== 'baseball' && room.id !== 'spanish')) return ''

  const { width, height } = roomRenderingStandard.logicalCanvas
  const hitAreaDefinitions = room.id === 'baseball'
    ? roomRenderingStandard.furnitureHitAreas.baseball
    : roomRenderingStandard.furnitureHitAreas.spanish
  const hitAreas = hitAreaDefinitions
    .map(
      (area) => {
        const isCalendar = room.id === 'spanish' && area.id === 'calendar'
        return `
        <path
          class="room-furniture-hit-area room-furniture-hit-area--${area.id}"
          data-room-furniture="${area.id}"
          ${isCalendar ? 'data-asset-state="missing" aria-hidden="true"' : ''}
          d="${area.path}"
          role="button"
          tabindex="${isCalendar ? '-1' : '0'}"
          aria-label="${area.hint} 열기"
        ></path>`
      },
    )
    .join('')
  const corkboardHitArea = room.id === 'baseball'
    ? `
        <path
          class="room-furniture-hit-area room-furniture-hit-area--corkboard"
          data-room-object="corkboard"
          d="M 592 223 L 918 405 L 918 604 L 592 412 Z"
          role="button"
          tabindex="0"
          aria-label="MY BASEBALL DIARY 열기"
        ></path>`
    : ''
  const hints = hitAreaDefinitions.length
    ? hitAreaDefinitions
      .map(
        (area) => `
          <span class="room-furniture-hint room-furniture-hint--${area.id}" data-room-furniture-hint="${area.id}" aria-hidden="true">
            ${area.hint}
          </span>`,
      )
      .join('')
    : ''

  return `
    <svg
      class="room-furniture-hit-area-layer"
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
      aria-label="${room.label} 가구 선택"
    >
      ${hitAreas}
      ${corkboardHitArea}
    </svg>
    ${hints}`
}

const roomMarkup = (room: RoomDefinition, variant: RoomMarkupVariant) => {
  const placeholderDecor = room.id === 'baseball' ? baseballBackgroundPlaceholder : ''
  const visualLayers = room.visualLayers
    .map((layer) => roomVisualLayerMarkup(layer))
    .join('')
  const bookshelfBooks = spanishBookshelfBookLayerMarkup(room)
  const objects = room.interactiveObjects
    .map((object) => roomObjectMarkup(object, variant))
    .join('')
  const furnitureHitAreas = roomFurnitureHitAreaMarkup(room, variant)

  return `
    <article class="isometric-room room-container isometric-room--${room.id}${variant === 'detail' ? ' isometric-room--detail' : ''}" data-room-id="${room.id}" aria-label="${room.label}">
      <div class="room-background-layer" data-room-background-state="fallback">
        <div class="room-background__placeholder" aria-hidden="true">
          <div class="room-wall room-wall--left"></div>
          <div class="room-wall room-wall--right"></div>
          <div class="room-floor"></div>
          ${placeholderDecor}
        </div>
        <img class="room-background__image" data-room-asset src="${room.backgroundAssetPath}" alt="" />
      </div>
      <div class="room-object-layer">
        ${visualLayers}
        ${bookshelfBooks}
        ${objects}
      </div>
      <div class="room-ui-layer">
        ${furnitureHitAreas}
      </div>
    </article>`
}

const roomElements = roomDefinitions
  .map((room) => roomMarkup(room, 'overview'))
  .join('')

const roomDetailElements = roomDefinitions
  .map(
    (room) => `
      <div class="room-detail__canvas" data-room-detail="${room.id}">
        ${roomMarkup(room, 'detail')}
      </div>`,
  )
  .join('')

const roomSelectorMarkup = roomDefinitions
  .map(
    (room) => `
      <button class="room-selector room-selector--${room.id}" type="button" data-room-selector="${room.id}" aria-label="${room.label} 선택">
        <span class="room-selector__number">${room.number}</span>
        <span class="room-selector__label">${room.label.toUpperCase()}</span>
      </button>`,
  )
  .join('')

const spanishFurniturePanelMarkup = (id: SpanishFurnitureId, title: string, description: string) => {
  if (id === 'bookshelf') {
    return `
      <section class="room-furniture-panel" data-room-furniture-panel="${id}" aria-labelledby="bookshelf-panel-title">
        <div class="room-furniture-panel__content room-furniture-panel__content--archive">
          <div class="modal-header-actions" data-archive-modal-actions></div>
          <div class="spanish-study-archive" data-spanish-study-archive aria-live="polite"></div>
        </div>
      </section>`
  }

  if (id === 'desk') {
    return `
      <section class="room-furniture-panel" data-room-furniture-panel="${id}" aria-labelledby="${id}-panel-title">
        <div class="room-furniture-panel__content room-furniture-panel__content--daily">
          <div class="modal-header-actions" data-daily-modal-actions></div>
          <div class="daily-study" data-daily-study aria-live="polite"></div>
        </div>
      </section>`
  }

  if (id === 'calendar') {
    return `
      <section class="room-furniture-panel" data-room-furniture-panel="${id}" aria-labelledby="calendar-panel-title">
        <div class="room-furniture-panel__content room-furniture-panel__content--calendar">
          <div class="modal-header-actions">
            ${createModalHeaderActions({ close: { attribute: 'data-room-action', action: 'close-furniture-panel' } })}
          </div>
          <div class="spanish-study-calendar" data-spanish-study-calendar aria-live="polite"></div>
        </div>
      </section>`
  }

  return `
    <section class="room-furniture-panel" data-room-furniture-panel="${id}" aria-labelledby="${id}-panel-title">
      <div class="room-furniture-panel__content">
        <div class="modal-header-actions">
          ${createModalHeaderActions({ close: { attribute: 'data-room-action', action: 'close-furniture-panel' } })}
        </div>
        <p class="room-furniture-panel__eyebrow">SPANISH ROOM</p>
        <h2 id="${id}-panel-title">${title}</h2>
        <p>${description}</p>
      </div>
    </section>`
}

const baseballUniformZonePanelMarkup = () => `
  <section class="room-furniture-panel" data-room-furniture-panel="uniform-zone" aria-labelledby="uniform-zone-panel-title">
    <div class="room-furniture-panel__content room-furniture-panel__content--collection">
      <div class="modal-header-actions">
        ${createModalHeaderActions({ close: { attribute: 'data-room-action', action: 'close-furniture-panel' } })}
      </div>
      <h2 id="uniform-zone-panel-title" class="visually-hidden">MY COLLECTION · DOOSAN BEARS</h2>
      <div data-baseball-collection></div>
    </div>
  </section>`

const baseballDiaryPanelMarkup = () => `
  <div class="corkboard-archive" aria-label="MY BASEBALL DIARY">
    <section class="baseball-diary-panel" aria-labelledby="baseball-diary-panel-title">
      <div class="modal-header-actions modal-header-actions--diary">
        ${createModalHeaderActions({ close: { attribute: 'data-room-action', action: 'close-corkboard' } })}
      </div>
      <h2 id="baseball-diary-panel-title" class="visually-hidden">MY BASEBALL DIARY</h2>
      <div data-baseball-diary></div>
    </section>
  </div>`

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="room-page">
    <header class="topbar">
      <div class="brand" aria-label="My Rooms">
        <span class="room-mark" aria-hidden="true"></span>
        <div class="brand-copy">
          <span class="eyebrow">MY ROOMS</span>
        </div>
      </div>

      <div class="season-status" aria-label="방 준비 현황">
        <span class="status-light" aria-hidden="true"></span>
        <span>HOME 01</span>
        <span class="status-divider" aria-hidden="true"></span>
        <span>3 ROOMS</span>
      </div>
    </header>

    <section class="room-stage" aria-label="선택 가능한 세 개의 방">
      <div class="overview-panel">
        <div class="room-map">
          ${roomElements}
          <nav class="room-selector-list" aria-label="방 선택">
            ${roomSelectorMarkup}
          </nav>
        </div>
        <p class="room-selection-status" aria-live="polite">ROOM NUMBER를 선택하세요.</p>
      </div>

      <section class="room-detail" aria-label="선택한 방 상세 보기">
        <button class="room-detail__back" type="button" data-room-action="back-to-overview">BACK TO OVERVIEW</button>
        ${roomDetailElements}

        ${spanishFurniturePanelMarkup('bookshelf', 'MY STUDY ARCHIVE', '주차별 스페인어 학습 기록을 확인합니다.')}
        ${spanishFurniturePanelMarkup('desk', 'DAILY SPANISH STUDY', '오늘의 스페인어 학습 기능이 이곳에 표시됩니다.')}
        ${spanishFurniturePanelMarkup('calendar', 'SPANISH STUDY PROGRESS', '월별 스페인어 학습 현황을 확인합니다.')}
        ${baseballUniformZonePanelMarkup()}
        ${baseballDiaryPanelMarkup()}
      </section>
    </section>

    <footer class="room-footer">
      <p><span class="footer-diamond" aria-hidden="true"></span> 공간마다 새로운 기록이 쌓입니다.</p>
      <span class="footer-meta">MY ROOM ARCHIVE</span>
    </footer>
  </main>

  <div class="cursor-sparkle-layer" aria-hidden="true"></div>
  <div class="room-character" data-sprite="idle" aria-hidden="true">
    <div class="room-character__room-icon">
      <span class="room-icon room-icon--baseball">⚾️</span>
      <span class="room-icon room-icon--spanish">🇪🇸</span>
      <span class="room-icon room-icon--knitting">🧶</span>
    </div>
    <div class="room-character__sprite"></div>
  </div>
`

const roomMap = document.querySelector<HTMLDivElement>('.room-map')!
const roomPage = document.querySelector<HTMLElement>('.room-page')!
const selectionStatus = document.querySelector<HTMLParagraphElement>('.room-selection-status')!
const detailPanel = document.querySelector<HTMLElement>('.room-detail')!
const archivePanel = document.querySelector<HTMLElement>('.corkboard-archive')!
const furniturePanels = document.querySelectorAll<HTMLElement>('[data-room-furniture-panel]')
const dailyStudyRoot = document.querySelector<HTMLElement>('[data-daily-study]')!
const spanishStudyCalendarRoot = document.querySelector<HTMLElement>('[data-spanish-study-calendar]')!
const spanishStudyArchiveRoot = document.querySelector<HTMLElement>('[data-spanish-study-archive]')!
const baseballCollectionRoot = document.querySelector<HTMLElement>('[data-baseball-collection]')!
const baseballDiaryRoot = document.querySelector<HTMLElement>('[data-baseball-diary]')!
const dailyModalActionsRoot = document.querySelector<HTMLElement>('[data-daily-modal-actions]')!
const archiveModalActionsRoot = document.querySelector<HTMLElement>('[data-archive-modal-actions]')!
const calendarFurnitureHitAreas = document.querySelectorAll<SVGPathElement>('[data-room-furniture="calendar"]')
const roomSelectorButtons = document.querySelectorAll<HTMLButtonElement>('[data-room-selector]')
const character = document.querySelector<HTMLDivElement>('.room-character')!
const characterSprite = document.querySelector<HTMLDivElement>('.room-character__sprite')!
const sparkleLayer = document.querySelector<HTMLDivElement>('.cursor-sparkle-layer')!
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

characterSprite.style.backgroundImage = `url(${characterSprites})`

let roomSelection: RoomSelectionController | null = null
const spanishStudyRepository = new SpanishStudyRepository()
const dailySpanishStudy = new DailySpanishStudyController(dailyStudyRoot, spanishStudyRepository, dailyModalActionsRoot)
const spanishStudyProgressCalendar = new SpanishStudyProgressCalendarController(spanishStudyCalendarRoot)
const spanishStudyArchive = new SpanishStudyArchiveController(spanishStudyArchiveRoot, spanishStudyRepository, archiveModalActionsRoot)
const baseballCollection = new BaseballCollectionController(baseballCollectionRoot)
const baseballDiary = new BaseballDiaryController(baseballDiaryRoot)

/**
 * Slots are logical full-room coordinates. Newer weeks remain visible when the
 * shelf is full; edit this array to alter capacity or the book placement.
 */
const spanishBookshelfBookSlots = [
  { left: '21.0%', top: '52.4%' }, { left: '24.4%', top: '50.7%' }, { left: '27.8%', top: '49.0%' }, { left: '31.2%', top: '47.3%' },
  { left: '20.6%', top: '46.3%' }, { left: '24.0%', top: '44.6%' }, { left: '27.4%', top: '42.9%' }, { left: '30.8%', top: '41.2%' },
  { left: '20.2%', top: '40.2%' }, { left: '23.6%', top: '38.5%' }, { left: '27.0%', top: '36.8%' }, { left: '30.4%', top: '35.1%' },
  { left: '19.8%', top: '34.1%' }, { left: '23.2%', top: '32.4%' }, { left: '26.6%', top: '30.7%' }, { left: '30.0%', top: '29.0%' },
] as const
const maximumVisibleSpanishBookshelfBooks = spanishBookshelfBookSlots.length
const spanishBookshelfBookColors = ['terracotta', 'olive', 'brown', 'cream'] as const

const renderSpanishBookshelfBooks = () => {
  const visibleWeeks = getCompletedSpanishStudyArchiveWeeks(spanishStudyRepository.getRecords())
    .slice(0, maximumVisibleSpanishBookshelfBooks)
    .reverse()

  document.querySelectorAll<HTMLElement>('[data-spanish-bookshelf-books]').forEach((layer) => {
    layer.innerHTML = visibleWeeks.map((week, index) => {
      const slot = spanishBookshelfBookSlots[index]
      const color = spanishBookshelfBookColors[index % spanishBookshelfBookColors.length]
      return `<img class="spanish-bookshelf-book spanish-bookshelf-book--${color}" src="${spanishArchiveBookAsset}" alt="" style="--book-left: ${slot.left}; --book-top: ${slot.top};" data-week-start="${week.weekStart}" />`
    }).join('')
  })
}

renderSpanishBookshelfBooks()
window.addEventListener(spanishStudyRecordsChangedEvent, () => {
  renderSpanishBookshelfBooks()
  spanishStudyArchive.refresh()
})

const roomView = new RoomViewController(roomPage, (state) => {
  const selectedRoom = roomDefinitions.find((room) => room.id === state.selectedRoom) ?? null
  const showDetail = Boolean(selectedRoom)
  const showArchive = state.selectedObject === 'corkboard'
  const selectedFurniture = isRoomFurnitureId(state.selectedObject ?? undefined)

  detailPanel.inert = !showDetail
  detailPanel.setAttribute('aria-hidden', String(!showDetail))
  detailPanel.setAttribute('aria-label', selectedRoom ? `${selectedRoom.label} 상세 보기` : '선택한 방 상세 보기')
  archivePanel.inert = !showArchive
  archivePanel.setAttribute('aria-hidden', String(!showArchive))
  furniturePanels.forEach((panel) => {
    const isActive = selectedFurniture && panel.dataset.roomFurniturePanel === state.selectedObject
    panel.inert = !isActive
    panel.setAttribute('aria-hidden', String(!isActive))
  })
  dailySpanishStudy.setOpen(state.selectedObject === 'desk')
  spanishStudyProgressCalendar.setOpen(state.selectedObject === 'calendar')
  spanishStudyArchive.setOpen(state.selectedObject === 'bookshelf')
  baseballCollection.setOpen(state.selectedObject === 'uniform-zone')
  baseballDiary.setOpen(showArchive)

  if (showArchive) {
    selectionStatus.textContent = '01 · BASEBALL ROOM · MY BASEBALL DIARY'
  } else if (state.selectedObject === 'uniform-zone') {
    selectionStatus.textContent = '01 · BASEBALL ROOM · MY COLLECTION'
  } else if (selectedFurniture) {
    const spanishPanelLabel = state.selectedObject === 'desk'
      ? 'DAILY STUDY'
      : state.selectedObject === 'calendar'
        ? 'STUDY PROGRESS'
        : 'MY STUDY ARCHIVE'
    selectionStatus.textContent = `02 · SPANISH ROOM · ${spanishPanelLabel}`
  } else if (selectedRoom) {
    selectionStatus.textContent = `${selectedRoom.number} · ${selectedRoom.label.toUpperCase()} 선택됨`
  } else {
    roomSelection?.clearSelection()
    selectionStatus.textContent = 'ROOM NUMBER를 선택하세요.'
  }
})

baseballDiary.setCloseHandler(() => roomView.closeObject())

roomSelection = new RoomSelectionController(roomMap, (room) => roomView.selectRoom(room.id))
const characterMovement = new CharacterMovementController(character, sparkleLayer)

document.querySelectorAll<HTMLImageElement>('[data-room-asset]').forEach((image) => {
  const setAssetState = (state: 'ready' | 'missing') => {
    image.dataset.assetState = state

    if (image.classList.contains('room-background__image')) {
      image.parentElement?.setAttribute('data-room-background-state', state)
    }

    if (image.dataset.roomVisualLayer === 'calendar') {
      const hasCalendarAsset = Array.from(document.querySelectorAll<HTMLImageElement>('[data-room-visual-layer="calendar"]'))
        .some((calendarImage) => calendarImage.dataset.assetState === 'ready')
      calendarFurnitureHitAreas.forEach((hitArea) => {
        hitArea.dataset.assetState = hasCalendarAsset ? 'ready' : 'missing'
        hitArea.tabIndex = hasCalendarAsset ? 0 : -1
        hitArea.setAttribute('aria-hidden', String(!hasCalendarAsset))
      })
    }
  }

  image.addEventListener('load', () => setAssetState('ready'))
  image.addEventListener('error', () => setAssetState('missing'))

  if (image.complete) {
    setAssetState(image.naturalWidth > 0 ? 'ready' : 'missing')
  }
})

roomSelectorButtons.forEach((button) => {
  const roomForButton = () => {
    const roomId = button.dataset.roomSelector
    return roomDefinitions.find((room) => room.id === roomId) ?? null
  }

  const setRoomNumberHover = (isHovered: boolean) => {
    const room = isHovered ? roomForButton() : null
    roomSelection?.setHovered(room)
    characterMovement.setRoomIcon(room?.id ?? null)
  }

  button.addEventListener('pointerenter', () => setRoomNumberHover(true))
  button.addEventListener('pointerleave', () => setRoomNumberHover(false))
  button.addEventListener('focus', () => setRoomNumberHover(true))
  button.addEventListener('blur', () => setRoomNumberHover(false))
  button.addEventListener('click', () => {
    const roomId = button.dataset.roomSelector
    if (!roomId || !roomDefinitions.some((room) => room.id === roomId)) return

    roomSelection?.select(roomId as RoomDefinition['id'])
  })
})

window.addEventListener('pointermove', (event) => {
  if (!finePointer.matches) return
  characterMovement.moveTo(event.clientX, event.clientY)
})

const furnitureHitAreaFromTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null

  const hitArea = target.closest<SVGPathElement>('[data-room-furniture]')
  const furnitureId = hitArea?.dataset.roomFurniture

  const isUnavailableCalendar = furnitureId === 'calendar' && hitArea?.dataset.assetState !== 'ready'
  return hitArea && isRoomFurnitureId(furnitureId) && !isUnavailableCalendar ? { hitArea, furnitureId } : null
}

const setFurnitureHover = (hitArea: SVGPathElement, furnitureId: RoomFurnitureId | null) => {
  const room = hitArea.closest<HTMLElement>('.isometric-room--detail')
  const objectLayer = room?.querySelector<HTMLElement>('.room-object-layer')
  const uiLayer = room?.querySelector<HTMLElement>('.room-ui-layer')

  if (!objectLayer || !uiLayer) return

  if (furnitureId) {
    objectLayer.dataset.hoveredFurniture = furnitureId
    uiLayer.dataset.hoveredFurniture = furnitureId
  } else {
    delete objectLayer.dataset.hoveredFurniture
    delete uiLayer.dataset.hoveredFurniture
  }
}

detailPanel.addEventListener('pointerover', (event) => {
  const furniture = furnitureHitAreaFromTarget(event.target)
  if (furniture) setFurnitureHover(furniture.hitArea, furniture.furnitureId)
})

detailPanel.addEventListener('pointerout', (event) => {
  const furniture = furnitureHitAreaFromTarget(event.target)
  if (!furniture) return

  const nextFurniture = furnitureHitAreaFromTarget(event.relatedTarget)
  if (nextFurniture?.furnitureId === furniture.furnitureId) return

  setFurnitureHover(furniture.hitArea, null)
})

detailPanel.addEventListener('focusin', (event) => {
  const furniture = furnitureHitAreaFromTarget(event.target)
  if (furniture) setFurnitureHover(furniture.hitArea, furniture.furnitureId)
})

detailPanel.addEventListener('focusout', (event) => {
  const furniture = furnitureHitAreaFromTarget(event.target)
  if (!furniture) return

  const nextFurniture = furnitureHitAreaFromTarget(event.relatedTarget)
  if (nextFurniture?.furnitureId === furniture.furnitureId) return

  setFurnitureHover(furniture.hitArea, null)
})

detailPanel.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const action = target.closest<HTMLElement>('[data-room-action]')?.dataset.roomAction

  if (action === 'close-corkboard') {
    roomView.closeObject()
    return
  }

  if (action === 'close-furniture-panel') {
    roomView.closeObject()
    return
  }

  if (action === 'back-to-overview') {
    roomView.backToOverview()
    return
  }

  const furniturePanel = target.closest<HTMLElement>('[data-room-furniture-panel]')
  if (furniturePanel && !target.closest<HTMLElement>('.room-furniture-panel__content')) {
    roomView.closeObject()
    return
  }

  const furniture = furnitureHitAreaFromTarget(target)
  if (furniture) {
    roomView.selectObject(furniture.furnitureId)
    return
  }

  if (target.closest<HTMLElement>('[data-room-object="corkboard"]')) {
    roomView.selectObject('corkboard')
  }
})

detailPanel.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return

  const target = event.target as HTMLElement
  const furniture = furnitureHitAreaFromTarget(target)
  if (furniture) {
    event.preventDefault()
    roomView.selectObject(furniture.furnitureId)
    return
  }

  if (!target.closest<HTMLElement>('[data-room-object="corkboard"]')) return

  event.preventDefault()
  roomView.selectObject('corkboard')
})

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || roomPage.dataset.view !== 'furniture') return

  event.preventDefault()
  roomView.closeObject()
})

window.addEventListener('mouseout', (event) => {
  if (!event.relatedTarget) characterMovement.hide()
})

window.addEventListener('blur', () => characterMovement.hide())
