import './style.css'
import baseballRoom from './assets/baseball-room-solid-bg.png'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="room-page">
    <header class="topbar">
      <div class="brand" aria-label="Baseball Room">
        <span class="baseball-mark" aria-hidden="true"></span>
        <div class="brand-copy">
          <span class="eyebrow">BASEBALL ROOM</span>
        </div>
      </div>

      <div class="season-status" aria-label="시즌 기록 현황">
        <span class="status-light" aria-hidden="true"></span>
        <span>SEASON 01</span>
        <span class="status-divider" aria-hidden="true"></span>
        <span>0 GAMES</span>
      </div>
    </header>

    <section class="room-stage" aria-label="시즌 기록이 쌓이는 야구방">
      <figure class="room-canvas">
        <img
          class="room-image"
          src="${baseballRoom}"
          alt="야구 중계가 나오는 TV, 펼쳐진 일기장, 코르크 보드, 정수빈 31 유니폼, 침대와 HOMErun 발매트가 있는 픽셀 아트 야구 기록방"
        />
        <figcaption class="room-caption">
          <span class="caption-index">ROOM 01</span>
          <span class="caption-line" aria-hidden="true"></span>
          <span>아직은 조용한, 시즌의 첫날</span>
        </figcaption>
      </figure>
    </section>

    <footer class="room-footer">
      <p><span class="footer-diamond" aria-hidden="true"></span> 한 경기씩, 방 안에 추억이 쌓입니다.</p>
      <span class="footer-meta">MY SEASON ARCHIVE</span>
    </footer>
  </main>

  <div class="pixel-cursor" aria-hidden="true">
    <svg
      class="pixel-cursor__hand"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="crispEdges"
    >
      <g transform="rotate(-45 8 8)">
        <polygon
          fill="#411d13"
          points="5,0 9,0 9,6 10,6 10,5 12,5 12,6 13,6 13,7 14,7 14,8 15,8 15,13 14,13 14,16 5,16 5,15 4,15 4,14 3,14 3,13 2,13 2,12 1,12 1,9 2,9 2,8 5,8"
        />
        <polygon
          fill="#f3bd8f"
          points="6,1 8,1 8,8 9,8 9,7 10,7 10,6 11,6 11,8 12,8 12,7 13,7 13,9 14,9 14,13 13,13 13,14 6,14 6,13 5,13 5,12 4,12 4,11 3,11 3,10 2,10 2,9 3,9 3,10 6,10"
        />
        <rect x="6" y="1" width="2" height="2" fill="#ffe0bd" />
        <rect x="5" y="14" width="9" height="2" fill="#24375c" />
        <rect x="6" y="14" width="7" height="1" fill="#b53032" />
      </g>
    </svg>
  </div>
`

const pixelCursor = document.querySelector<HTMLDivElement>('.pixel-cursor')
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
let cursorX = 0
let cursorY = 0
let cursorFrame = 0

const renderCursor = () => {
  pixelCursor?.style.setProperty('--cursor-x', `${cursorX}px`)
  pixelCursor?.style.setProperty('--cursor-y', `${cursorY}px`)
  cursorFrame = 0
}

window.addEventListener('pointermove', (event) => {
  if (!finePointer.matches || !pixelCursor) return

  cursorX = event.clientX
  cursorY = event.clientY
  pixelCursor.dataset.visible = 'true'

  if (!cursorFrame) {
    cursorFrame = window.requestAnimationFrame(renderCursor)
  }
})

window.addEventListener('mouseout', (event) => {
  if (!event.relatedTarget && pixelCursor) {
    pixelCursor.dataset.visible = 'false'
  }
})

window.addEventListener('blur', () => {
  if (pixelCursor) pixelCursor.dataset.visible = 'false'
})
