import type { RoomId } from './rooms'

const walkSprites = ['walk-01', 'walk-02', 'walk-03', 'walk-04'] as const

export type CharacterSprite =
  | 'idle'
  | 'idle-baseball'
  | 'idle-spanish'
  | 'idle-knitting'
  | (typeof walkSprites)[number]

export class CharacterMovementController {
  private previousPoint: { x: number; y: number } | null = null
  private sparkleOrigin: { x: number; y: number } | null = null
  private isWalking = false
  private animationFrame = 0
  private lastAnimationTime = 0
  private idleTimeout = 0
  private sparkleInterval = 0
  private lastWalkSparkleTime = 0
  private trailDirection = 1
  private roomIcon: RoomId | null = null
  private readonly character: HTMLElement
  private readonly sparkleLayer: HTMLElement

  constructor(character: HTMLElement, sparkleLayer: HTMLElement) {
    this.character = character
    this.sparkleLayer = sparkleLayer
  }

  moveTo(clientX: number, clientY: number) {
    this.character.style.setProperty('--character-x', `${clientX}px`)
    this.character.style.setProperty('--character-y', `${clientY}px`)
    this.character.dataset.visible = 'true'
    this.sparkleOrigin = { x: clientX, y: clientY }
    this.startSparkles()

    const previousPoint = this.previousPoint
    this.previousPoint = { x: clientX, y: clientY }

    this.syncRoomIcon()

    // A room-number hover is a deliberate “look here” moment: keep the
    // character front-facing beneath its room icon instead of restarting walk.
    if (this.roomIcon) {
      this.stopWalking()
      return
    }

    if (!previousPoint) return

    const deltaX = clientX - previousPoint.x
    const deltaY = clientY - previousPoint.y
    if (Math.hypot(deltaX, deltaY) < 1) return

    if (Math.abs(deltaX) > 0.25) {
      this.trailDirection = deltaX < 0 ? -1 : 1
      this.character.style.setProperty('--character-direction', `${this.trailDirection}`)
    }

    this.emitWalkSparkles()
    this.startWalking()
  }

  hide() {
    this.character.dataset.visible = 'false'
    this.roomIcon = null
    delete this.character.dataset.roomIcon
    this.previousPoint = null
    this.sparkleOrigin = null
    this.stopWalking()
    this.stopSparkles()
  }

  setRoomIcon(roomId: RoomId | null) {
    this.roomIcon = roomId
    this.syncRoomIcon()

    if (roomId) this.stopWalking()
  }

  private startWalking() {
    window.clearTimeout(this.idleTimeout)
    this.idleTimeout = window.setTimeout(() => this.stopWalking(), 170)

    if (this.isWalking) return

    this.isWalking = true
    this.animationFrame = 0
    this.lastAnimationTime = 0
    this.animateWalk(performance.now())
  }

  private animateWalk(timestamp: number) {
    if (!this.isWalking) return

    if (timestamp - this.lastAnimationTime >= 92) {
      this.setSprite(walkSprites[this.animationFrame])
      this.animationFrame = (this.animationFrame + 1) % walkSprites.length
      this.lastAnimationTime = timestamp
    }

    window.requestAnimationFrame((nextTimestamp) => this.animateWalk(nextTimestamp))
  }

  private stopWalking() {
    window.clearTimeout(this.idleTimeout)
    this.isWalking = false
    this.setSprite('idle')
  }

  private startSparkles() {
    if (this.sparkleInterval) return

    this.sparkleInterval = window.setInterval(() => this.emitSparkles(1), 150)
  }

  private stopSparkles() {
    window.clearInterval(this.sparkleInterval)
    this.sparkleInterval = 0
    this.sparkleLayer.replaceChildren()
  }

  private emitWalkSparkles() {
    const now = performance.now()
    if (now - this.lastWalkSparkleTime < 72) return

    this.lastWalkSparkleTime = now
    this.emitSparkles(2)
  }

  private emitSparkles(count: number) {
    if (!this.sparkleOrigin) return

    for (let index = 0; index < count; index += 1) {
      const sparkle = document.createElement('span')
      const scatter = Math.random() * 12 - 6
      const trailDistance = 9 + Math.random() * 8
      const driftDistance = 14 + Math.random() * 18
      const isSmall = Math.random() > 0.35
      const color = Math.random() > 0.55 ? '#fff8b8' : '#dff6ff'

      sparkle.className = 'cursor-sparkle'
      if (isSmall) sparkle.dataset.size = 'small'
      sparkle.style.setProperty('--sparkle-x', `${this.sparkleOrigin.x - this.trailDirection * trailDistance + scatter}px`)
      sparkle.style.setProperty('--sparkle-y', `${this.sparkleOrigin.y - 3 + Math.random() * 8}px`)
      sparkle.style.setProperty('--sparkle-drift-x', `${-this.trailDirection * driftDistance + scatter}px`)
      sparkle.style.setProperty('--sparkle-drift-y', `${-10 - Math.random() * 16}px`)
      sparkle.style.setProperty('--sparkle-color', color)
      sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true })
      this.sparkleLayer.append(sparkle)
    }
  }

  private setSprite(sprite: CharacterSprite) {
    this.character.dataset.sprite = sprite
  }

  private syncRoomIcon() {
    if (this.roomIcon) {
      this.character.dataset.roomIcon = this.roomIcon
    } else {
      delete this.character.dataset.roomIcon
    }
  }
}
