export type BaseballDiaryResult = 'WIN' | 'LOSE' | 'DRAW' | 'NO_GAME'
export type BaseballDiaryWatchingMode = 'STADIUM' | 'HOME'
export type BaseballDiaryCancellationReason = 'RAIN' | 'HEAT' | 'OTHER'

export const baseballDiaryOpponents = [
  'LG', 'NC', 'KT', 'SAMSUNG', 'KIA', 'KIWOOM', 'HANWHA', 'SSG', 'LOTTE',
] as const

export type BaseballDiaryOpponent = (typeof baseballDiaryOpponents)[number]

const baseballDiaryStatisticsOpponents: readonly BaseballDiaryOpponent[] = [
  'LG', 'KIA', 'SSG', 'SAMSUNG', 'HANWHA', 'KT', 'LOTTE', 'NC', 'KIWOOM',
]

const baseballDiaryOpponentLabels: Record<BaseballDiaryOpponent, string> = {
  LG: 'LG',
  KIA: 'KIA',
  SSG: 'SSG',
  SAMSUNG: '삼성',
  HANWHA: '한화',
  KT: 'KT',
  LOTTE: '롯데',
  NC: 'NC',
  KIWOOM: '키움',
}

export interface BaseballDiaryRecord {
  id: string
  date: string
  season: number
  opponent: BaseballDiaryOpponent
  result: BaseballDiaryResult
  watchingMode?: BaseballDiaryWatchingMode
  cancellationReason?: BaseballDiaryCancellationReason
  note: string
  createdAt: string
  updatedAt: string
}

type DiaryEditorState = {
  mode: 'new' | 'edit'
  date: string
  recordId?: string
}

type DiaryIllustrationDefinition = {
  assetPath: string
  label: string
}

type DiaryFrameDefinition = {
  assetPath: string
}

const storageKey = 'baseball-room:diary-records:v1'
const startingSeason = 2026
const weekdayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
const publicAssetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const isOpponent = (value: string): value is BaseballDiaryOpponent =>
  baseballDiaryOpponents.some((opponent) => opponent === value)

const isResult = (value: string): value is BaseballDiaryResult =>
  value === 'WIN' || value === 'LOSE' || value === 'DRAW' || value === 'NO_GAME'

const isWatchingMode = (value: string): value is BaseballDiaryWatchingMode =>
  value === 'STADIUM' || value === 'HOME'

const isCancellationReason = (value: string): value is BaseballDiaryCancellationReason =>
  value === 'RAIN' || value === 'HEAT' || value === 'OTHER'

const optionMarkup = <T extends string>(values: readonly T[], selected: T) =>
  values.map((value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`).join('')

const valueFrom = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

const datePartsInSeoul = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: value('year'), month: value('month'), day: value('day') }
}

const dateKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const displayDate = (date: string) => date.replaceAll('-', '.')

const resultClass = (result: BaseballDiaryResult) => result.toLowerCase().replace('_', '-')

const calendarResultLabel = (result: BaseballDiaryResult) => result === 'NO_GAME' ? 'NG' : result

/** Status/mode artwork is shared by every record and never stored in localStorage. */
const diaryIllustrations: Record<string, DiaryIllustrationDefinition> = {
  'STADIUM:WIN': { label: 'STADIUM WIN', assetPath: publicAssetPath('assets/baseball-cards/baseball_stadium_win.png') },
  'STADIUM:LOSE': { label: 'STADIUM LOSE', assetPath: publicAssetPath('assets/baseball-cards/baseball_stadium_lose.png') },
  'STADIUM:DRAW': { label: 'STADIUM DRAW', assetPath: publicAssetPath('assets/baseball-cards/baseball_stadium_draw.png') },
  'HOME:WIN': { label: 'HOME WIN', assetPath: publicAssetPath('assets/baseball-cards/baseball_home_win.png') },
  'HOME:LOSE': { label: 'HOME LOSE', assetPath: publicAssetPath('assets/baseball-cards/baseball_home_lose.png') },
  'HOME:DRAW': { label: 'HOME DRAW', assetPath: publicAssetPath('assets/baseball-cards/baseball_home_draw.png') },
  'NO_GAME:RAIN': { label: 'RAIN OUT', assetPath: publicAssetPath('assets/baseball-cards/baseball_nogame_rain.png') },
  'NO_GAME:HEAT': { label: 'HEAT OUT', assetPath: publicAssetPath('assets/baseball-cards/baseball_nogame_heat.png') },
  'NO_GAME:OTHER': { label: 'GAME OFF', assetPath: publicAssetPath('assets/baseball-cards/baseball_nogame_other.png') },
}

/** Every frame uses the same 720 × 925 coordinate system as the card content. */
const diaryFrames: Record<BaseballDiaryResult, DiaryFrameDefinition> = {
  WIN: { assetPath: publicAssetPath('assets/baseball-cards/frame_win.png') },
  LOSE: { assetPath: publicAssetPath('assets/baseball-cards/frame_lose.png') },
  DRAW: { assetPath: publicAssetPath('assets/baseball-cards/frame_draw.png') },
  NO_GAME: { assetPath: publicAssetPath('assets/baseball-cards/frame_no_game.png') },
}

const illustrationFor = (record: BaseballDiaryRecord) => {
  const key = record.result === 'NO_GAME'
    ? `NO_GAME:${record.cancellationReason ?? 'OTHER'}`
    : `${record.watchingMode ?? 'HOME'}:${record.result}`
  return diaryIllustrations[key] ?? diaryIllustrations['HOME:DRAW']
}

const cardVisualMarkup = (record: BaseballDiaryRecord) => {
  const illustration = illustrationFor(record)
  const frame = diaryFrames[record.result]
  return `
    <div class="baseball-diary-card__art" data-diary-card-art style="--diary-card-art-image: url('${illustration.assetPath}')">
      <img class="baseball-diary-card__illustration-image" data-diary-card-illustration src="${illustration.assetPath}" alt="${illustration.label} card illustration" />
      <span class="baseball-diary-card__illustration-placeholder" data-diary-card-fallback hidden>ART MISSING</span>
    </div>
    <img class="baseball-diary-card__frame" src="${frame.assetPath}" alt="" aria-hidden="true" />`
}

/** Separate localStorage namespace; Spanish Room storage is never read or written. */
export class BaseballDiaryRepository {
  list() {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return [] as BaseballDiaryRecord[]
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(this.isRecord).sort((first, second) => second.date.localeCompare(first.date)) : []
    } catch {
      throw new Error('야구 기록을 불러오지 못했습니다.')
    }
  }

  save(record: BaseballDiaryRecord) {
    const records = this.list()
    const index = records.findIndex((item) => item.id === record.id || item.date === record.date)
    if (index >= 0) records[index] = record
    else records.push(record)
    this.persist(records)
  }

  delete(id: string) {
    this.persist(this.list().filter((record) => record.id !== id))
  }

  private persist(records: BaseballDiaryRecord[]) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(records))
    } catch {
      throw new Error('야구 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.')
    }
  }

  private isRecord = (value: unknown): value is BaseballDiaryRecord => {
    if (!value || typeof value !== 'object') return false
    const record = value as Partial<BaseballDiaryRecord>
    return typeof record.id === 'string'
      && typeof record.date === 'string'
      && typeof record.season === 'number'
      && typeof record.opponent === 'string'
      && isOpponent(record.opponent)
      && typeof record.result === 'string'
      && isResult(record.result)
      && typeof record.note === 'string'
      && typeof record.createdAt === 'string'
      && typeof record.updatedAt === 'string'
  }
}

export class BaseballDiaryController {
  private readonly root: HTMLElement
  private readonly repository: BaseballDiaryRepository
  private records: BaseballDiaryRecord[] = []
  private readonly today = datePartsInSeoul()
  private selectedYear = Math.max(startingSeason, this.today.year)
  private selectedMonth = this.selectedYear === this.today.year ? this.today.month - 1 : 0
  private editor: DiaryEditorState | null = null
  private detailId: string | null = null
  private deletingId: string | null = null
  private notice = ''
  private isOpen = false
  private inventoryScrollTop = 0
  private onRequestClose: () => void = () => undefined

  constructor(root: HTMLElement, repository = new BaseballDiaryRepository()) {
    this.root = root
    this.repository = repository
    this.root.addEventListener('click', (event) => void this.handleClick(event))
    this.root.addEventListener('submit', (event) => void this.handleSubmit(event))
    this.root.addEventListener('change', (event) => this.handleChange(event))
    this.root.addEventListener('error', (event) => this.handleIllustrationError(event), true)
    window.addEventListener('keydown', (event) => this.handleKeydown(event))
  }

  setCloseHandler(handler: () => void) {
    this.onRequestClose = handler
  }

  setOpen(isOpen: boolean) {
    this.isOpen = isOpen
    if (isOpen) void this.refresh()
  }

  private async refresh() {
    try {
      this.records = this.repository.list()
      this.notice = ''
    } catch (error) {
      this.notice = error instanceof Error ? error.message : '야구 기록을 불러오지 못했습니다.'
    }
    if (this.isOpen) this.render()
  }

  private availableSeasons() {
    const latest = Math.max(this.today.year + 1, this.selectedYear, ...this.records.map((record) => record.season))
    return Array.from({ length: latest - startingSeason + 1 }, (_, index) => startingSeason + index)
  }

  private recordsForSeason() {
    return this.records.filter((record) => record.season === this.selectedYear)
  }

  private recordForDate(date: string) {
    return this.records.find((record) => record.date === date) ?? null
  }

  private recordForId(id: string | null) {
    return this.records.find((record) => record.id === id) ?? null
  }

  private captureInventoryScroll() {
    this.inventoryScrollTop = this.root.querySelector<HTMLElement>('[data-diary-inventory]')?.scrollTop ?? this.inventoryScrollTop
  }

  private restoreInventoryScroll() {
    requestAnimationFrame(() => {
      const inventory = this.root.querySelector<HTMLElement>('[data-diary-inventory]')
      if (inventory) inventory.scrollTop = this.inventoryScrollTop
    })
  }

  private render() {
    this.captureInventoryScroll()
    const monthRecords = this.recordsForSeason()
    this.root.innerHTML = `
      <section class="baseball-diary" aria-live="polite">
        ${this.headerMarkup()}
        <div class="baseball-diary__content">
          <div class="baseball-diary__left-column">
            ${this.calendarMarkup()}
            ${this.inventoryMarkup(monthRecords)}
          </div>
          ${this.statisticsMarkup(monthRecords)}
        </div>
        ${this.notice ? `<p class="baseball-diary__notice" role="status">${escapeHtml(this.notice)}</p>` : ''}
        ${this.editorMarkup()}
        ${this.detailMarkup()}
        ${this.confirmDeleteMarkup()}
      </section>`
    this.restoreInventoryScroll()
  }

  private headerMarkup() {
    const seasons = this.availableSeasons()
    return `
      <header class="baseball-diary__header">
        <div>
          <h2>MY BASEBALL DIARY</h2>
          <p>${this.selectedYear} SEASON · DOOSAN BEARS</p>
        </div>
        <label class="baseball-diary__season-label">SEASON
          <select data-diary-season aria-label="시즌 선택">
            ${seasons.map((season) => `<option value="${season}"${season === this.selectedYear ? ' selected' : ''}>${season}</option>`).join('')}
          </select>
        </label>
      </header>`
  }

  private calendarMarkup() {
    const firstWeekday = new Date(this.selectedYear, this.selectedMonth, 1).getDay()
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate()
    const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7)
    const cells = Array.from({ length: weekCount * 7 }, (_, index) => {
      const day = index - firstWeekday + 1
      if (day < 1 || day > daysInMonth) return '<span class="baseball-diary__day baseball-diary__day--blank" aria-hidden="true"></span>'
      const date = dateKey(this.selectedYear, this.selectedMonth, day)
      const record = this.recordForDate(date)
      return `
        <button class="baseball-diary__day${record ? ` is-${resultClass(record.result)}` : ''}" type="button" data-diary-action="open-date" data-date="${date}" aria-label="${displayDate(date)} ${record ? '기록 보기' : '기록 추가'}">
          <span>${day}</span>
          ${record ? `<span class="baseball-diary__day-result" aria-hidden="true">${calendarResultLabel(record.result)}</span>` : ''}
        </button>`
    }).join('')

    return `
      <section class="baseball-diary__calendar" style="--calendar-weeks: ${weekCount}" aria-label="${this.selectedYear}년 ${this.selectedMonth + 1}월 달력">
        <div class="baseball-diary__calendar-toolbar">
          <button type="button" data-diary-action="previous-month" aria-label="이전 달">◀</button>
          <h3>${this.selectedYear}. ${String(this.selectedMonth + 1).padStart(2, '0')}</h3>
          <button type="button" data-diary-action="next-month" aria-label="다음 달">▶</button>
        </div>
        <div class="baseball-diary__weekdays">${weekdayNames.map((day) => `<span>${day}</span>`).join('')}</div>
        <div class="baseball-diary__days">${cells}</div>
      </section>`
  }

  private statisticsMarkup(records: BaseballDiaryRecord[]) {
    const counts: Record<BaseballDiaryResult, number> = { WIN: 0, LOSE: 0, DRAW: 0, NO_GAME: 0 }
    records.forEach((record) => { counts[record.result] += 1 })
    const totalGames = records.length
    const percentage = (wins: number, losses: number) => {
      const decidedGames = wins + losses
      return decidedGames ? `${Math.round((wins / decidedGames) * 100)}%` : '—'
    }
    const viewingRecord = (watchingMode: BaseballDiaryWatchingMode) => {
      const decided = records.filter((record) => record.watchingMode === watchingMode
        && (record.result === 'WIN' || record.result === 'LOSE'))
      const wins = decided.filter((record) => record.result === 'WIN').length
      const losses = decided.length - wins
      return { wins, losses, rate: percentage(wins, losses) }
    }
    const stadium = viewingRecord('STADIUM')
    const home = viewingRecord('HOME')
    const teams = baseballDiaryStatisticsOpponents.map((opponent) => {
      const decided = records.filter((record) => record.opponent === opponent
        && (record.result === 'WIN' || record.result === 'LOSE'))
      const wins = decided.filter((record) => record.result === 'WIN').length
      const losses = decided.length - wins
      return { opponent, wins, losses }
    })
    const largestTeamRecord = Math.max(0, ...teams.map(({ wins, losses }) => wins + losses))
    const resultCountMarkup = (result: BaseballDiaryResult, label: string) => `
      <span class="baseball-diary__result-count baseball-diary__result-count--${resultClass(result)}">
        <small>${label}</small><strong>${counts[result]}</strong>
      </span>`
    const resultSegmentMarkup = (result: BaseballDiaryResult) => totalGames
      ? `<span class="baseball-diary__result-segment baseball-diary__result-segment--${resultClass(result)}" style="--result-share: ${counts[result] / totalGames}" aria-label="${result}: ${counts[result]}"></span>`
      : ''
    return `
      <aside class="baseball-diary__statistics" aria-label="선택 시즌 통계">
        <h3>THIS SEASON</h3>
        <div class="baseball-diary__season-summary">
          <section class="baseball-diary__summary-card" aria-label="전체 기록 수"><span>TOTAL GAMES</span><strong>${totalGames}</strong></section>
          <section class="baseball-diary__summary-card" aria-label="시즌 승률"><span>WIN RATE</span><strong>${percentage(counts.WIN, counts.LOSE)}</strong></section>
        </div>
        <section class="baseball-diary__result-summary" aria-label="시즌 결과 비율">
          <div class="baseball-diary__result-bar" aria-label="WIN ${counts.WIN}, LOSE ${counts.LOSE}, DRAW ${counts.DRAW}, NO GAME ${counts.NO_GAME}">
            ${resultSegmentMarkup('WIN')}${resultSegmentMarkup('LOSE')}${resultSegmentMarkup('DRAW')}${resultSegmentMarkup('NO_GAME')}
          </div>
          <div class="baseball-diary__result-counts">
            ${resultCountMarkup('WIN', 'WIN')}
            ${resultCountMarkup('LOSE', 'LOSE')}
            ${resultCountMarkup('DRAW', 'DRAW')}
            ${resultCountMarkup('NO_GAME', 'NO GAME')}
          </div>
        </section>
        <div class="baseball-diary__viewing-rates">
          <section class="baseball-diary__viewing-card baseball-diary__viewing-card--stadium" aria-label="직관 승률">
            <div><span class="baseball-diary__viewing-icon baseball-diary__viewing-icon--stadium" aria-hidden="true"></span><span>직관 승률</span></div>
            <strong>${stadium.rate}</strong>
          </section>
          <section class="baseball-diary__viewing-card baseball-diary__viewing-card--home" aria-label="집관 승률">
            <div><span class="baseball-diary__viewing-icon baseball-diary__viewing-icon--home" aria-hidden="true"></span><span>집관 승률</span></div>
            <strong>${home.rate}</strong>
          </section>
        </div>
        <section class="baseball-diary__team-records" aria-label="상대 구단별 승패 기록">
          ${teams.map(({ opponent, wins, losses }) => `
            <div class="baseball-diary__team-row">
              <span>${baseballDiaryOpponentLabels[opponent]}</span>
              <div class="baseball-diary__team-bar" aria-label="${baseballDiaryOpponentLabels[opponent]} ${wins}승 ${losses}패">
                <i class="baseball-diary__team-segment baseball-diary__team-segment--win" style="width: ${largestTeamRecord ? (wins / largestTeamRecord) * 100 : 0}%"></i>
                <i class="baseball-diary__team-segment baseball-diary__team-segment--lose" style="width: ${largestTeamRecord ? (losses / largestTeamRecord) * 100 : 0}%"></i>
              </div>
              <strong>${wins} - ${losses}</strong>
            </div>`).join('')}
        </section>
      </aside>`
  }

  private inventoryMarkup(records: BaseballDiaryRecord[]) {
    const sorted = [...records].sort((first, second) => second.date.localeCompare(first.date))
    return `
      <section class="baseball-diary__inventory">
        <div class="baseball-diary__inventory-heading"><h3>CARD INVENTORY</h3><span>${sorted.length} ${sorted.length === 1 ? 'CARD' : 'CARDS'}</span></div>
        <div class="baseball-diary__inventory-grid" data-diary-inventory>
          ${sorted.length ? sorted.map((record) => `
            <button class="baseball-diary__inventory-card" type="button" data-diary-action="open-detail" data-record-id="${record.id}" aria-label="${displayDate(record.date)} 기록 카드 보기">
              ${this.cardMarkup(record, 'mini')}
            </button>`).join('') : '<p class="baseball-diary__inventory-empty">기록한 경기가 없습니다. 달력의 날짜를 선택해 첫 카드를 만드세요.</p>'}
        </div>
      </section>`
  }

  private cardMarkup(record: BaseballDiaryRecord, size: 'calendar' | 'mini' | 'full') {
    const outcomeDetail = record.result === 'NO_GAME'
      ? record.cancellationReason ?? 'OTHER'
      : record.watchingMode ?? 'HOME'
    return `
      <article class="baseball-diary-card baseball-diary-card--${resultClass(record.result)} baseball-diary-card--${size}">
        ${cardVisualMarkup(record)}
        <div class="baseball-diary-card__header"><span>${record.season} SEASON</span><strong>DOOSAN vs ${record.opponent}</strong></div>
        <div class="baseball-diary-card__info"><time datetime="${record.date}">${displayDate(record.date)}</time><span>${outcomeDetail}</span></div>
        <p class="baseball-diary-card__note">${escapeHtml(record.note || 'NO NOTE')}</p>
      </article>`
  }

  private editorMarkup() {
    if (!this.editor) return ''
    const record = this.editor.mode === 'edit' ? this.recordForId(this.editor.recordId ?? null) : null
    const result = record?.result ?? 'WIN'
    const isNoGame = result === 'NO_GAME'
    const watching = record?.watchingMode ?? 'STADIUM'
    const cancellation = record?.cancellationReason ?? 'RAIN'
    return `
      <div class="baseball-diary__overlay baseball-diary__editor-overlay" role="presentation">
        <form class="baseball-diary__editor" data-diary-form aria-label="${this.editor.mode === 'edit' ? '경기 기록 수정' : '새 경기 기록'}">
          <header><p>${this.editor.mode === 'edit' ? 'EDIT GAME RECORD' : 'NEW GAME RECORD'}</p><h3>${displayDate(this.editor.date)}</h3><button type="button" data-diary-action="close-editor" aria-label="입력창 닫기">×</button></header>
          <div class="baseball-diary__form-fields">
            <label>DATE<input value="${displayDate(this.editor.date)}" readonly aria-readonly="true" /></label>
            <label>OPPONENT<select name="opponent" required>${optionMarkup(baseballDiaryOpponents, record?.opponent ?? 'LG')}</select></label>
            <label>GAME RESULT<select name="result" required data-diary-result>${optionMarkup(['WIN', 'LOSE', 'DRAW', 'NO_GAME'] as const, result)}</select></label>
            <label data-diary-watching${isNoGame ? ' hidden' : ''}>WATCHING MODE<select name="watchingMode"${isNoGame ? ' disabled' : ' required'}>${optionMarkup(['STADIUM', 'HOME'] as const, watching)}</select></label>
            <label data-diary-cancellation${isNoGame ? '' : ' hidden'}>CANCELLATION REASON<select name="cancellationReason"${isNoGame ? ' required' : ' disabled'}>${optionMarkup(['RAIN', 'HEAT', 'OTHER'] as const, cancellation)}</select></label>
            <label class="baseball-diary__note-field">TODAY'S NOTE<textarea name="note" maxlength="160" placeholder="오늘 경기의 한 줄 기록을 남겨주세요.">${escapeHtml(record?.note ?? '')}</textarea></label>
          </div>
          <footer><button type="button" data-diary-action="close-editor">CANCEL</button><button type="submit">SAVE RECORD</button></footer>
        </form>
      </div>`
  }

  private detailMarkup() {
    const record = this.recordForId(this.detailId)
    if (!record) return ''
    return `
      <div class="baseball-diary__overlay baseball-diary__detail-overlay" role="presentation">
        <section class="baseball-diary__detail" role="dialog" aria-modal="true" aria-label="${displayDate(record.date)} 야구 카드">
          <button class="baseball-diary__detail-close" type="button" data-diary-action="close-detail" aria-label="카드 닫기">×</button>
          ${this.cardMarkup(record, 'full')}
          <div class="baseball-diary__detail-actions"><button type="button" data-diary-action="open-editor" data-record-id="${record.id}">EDIT</button><button type="button" data-diary-action="ask-delete" data-record-id="${record.id}">DELETE</button></div>
        </section>
      </div>`
  }

  private confirmDeleteMarkup() {
    const record = this.recordForId(this.deletingId)
    if (!record) return ''
    return `
      <div class="baseball-diary__overlay baseball-diary__confirm-overlay" role="presentation">
        <section class="baseball-diary__confirm" role="alertdialog" aria-modal="true" aria-labelledby="diary-delete-title">
          <h3 id="diary-delete-title">DELETE RECORD?</h3>
          <p>${displayDate(record.date)} 기록과 카드를 삭제합니다.</p>
          <div><button type="button" data-diary-action="cancel-delete">CANCEL</button><button type="button" data-diary-action="confirm-delete" data-record-id="${record.id}">DELETE</button></div>
        </section>
      </div>`
  }

  private changeMonth(delta: number) {
    const next = new Date(this.selectedYear, this.selectedMonth + delta, 1)
    this.selectedYear = next.getFullYear()
    this.selectedMonth = next.getMonth()
    this.render()
  }

  private openEditorForDate(date: string) {
    const record = this.recordForDate(date)
    this.editor = record ? { mode: 'edit', date, recordId: record.id } : { mode: 'new', date }
    this.detailId = null
    this.deletingId = null
    this.render()
  }

  private async handleClick(event: Event) {
    const target = event.target as HTMLElement
    const actionElement = target.closest<HTMLElement>('[data-diary-action]')
    if (!actionElement) return
    const action = actionElement.dataset.diaryAction
    const recordId = actionElement.dataset.recordId

    if (action === 'previous-month') return this.changeMonth(-1)
    if (action === 'next-month') return this.changeMonth(1)
    if (action === 'open-date' && actionElement.dataset.date) {
      const record = this.recordForDate(actionElement.dataset.date)
      if (record) {
        this.detailId = record.id
        this.editor = null
        this.deletingId = null
        this.render()
      } else {
        this.openEditorForDate(actionElement.dataset.date)
      }
      return
    }
    if (action === 'open-detail' && recordId) {
      this.detailId = recordId
      this.editor = null
      this.deletingId = null
      this.render()
      return
    }
    if (action === 'close-detail') {
      this.detailId = null
      this.render()
      return
    }
    if (action === 'open-editor' && recordId) {
      const record = this.recordForId(recordId)
      if (record) this.openEditorForDate(record.date)
      return
    }
    if (action === 'close-editor') {
      this.editor = null
      this.render()
      return
    }
    if (action === 'ask-delete' && recordId) {
      this.deletingId = recordId
      this.render()
      return
    }
    if (action === 'cancel-delete') {
      this.deletingId = null
      this.render()
      return
    }
    if (action === 'confirm-delete' && recordId) {
      try {
        this.repository.delete(recordId)
        this.records = this.repository.list()
        this.detailId = null
        this.deletingId = null
        this.notice = '기록을 삭제했습니다.'
      } catch (error) {
        this.notice = error instanceof Error ? error.message : '기록을 삭제하지 못했습니다.'
      }
      this.render()
    }
  }

  private handleChange(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLSelectElement)) return

    if (target.matches('[data-diary-season]')) {
      const year = Number(target.value)
      if (Number.isInteger(year) && year >= startingSeason) {
        this.selectedYear = year
        this.selectedMonth = 0
        this.render()
      }
      return
    }

    if (!target.matches('[data-diary-result]')) return
    const form = target.closest<HTMLFormElement>('[data-diary-form]')
    const watching = form?.querySelector<HTMLElement>('[data-diary-watching]')
    const cancellation = form?.querySelector<HTMLElement>('[data-diary-cancellation]')
    const watchingSelect = watching?.querySelector<HTMLSelectElement>('select')
    const cancellationSelect = cancellation?.querySelector<HTMLSelectElement>('select')
    const isNoGame = target.value === 'NO_GAME'
    if (watching) watching.hidden = isNoGame
    if (cancellation) cancellation.hidden = !isNoGame
    if (watchingSelect) {
      watchingSelect.disabled = isNoGame
      watchingSelect.required = !isNoGame
    }
    if (cancellationSelect) {
      cancellationSelect.disabled = !isNoGame
      cancellationSelect.required = isNoGame
    }
  }

  private handleIllustrationError(event: Event) {
    const image = event.target
    if (!(image instanceof HTMLImageElement) || !image.matches('[data-diary-card-illustration]')) return
    image.hidden = true
    image.parentElement?.querySelector<HTMLElement>('[data-diary-card-fallback]')?.removeAttribute('hidden')
  }

  private async handleSubmit(event: Event) {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-diary-form]') || !this.editor) return
    event.preventDefault()
    if (!form.reportValidity()) return

    const data = new FormData(form)
    const opponent = valueFrom(data, 'opponent')
    const result = valueFrom(data, 'result')
    const watchingMode = valueFrom(data, 'watchingMode')
    const cancellationReason = valueFrom(data, 'cancellationReason')
    if (!isOpponent(opponent) || !isResult(result)) return
    if (result !== 'NO_GAME' && !isWatchingMode(watchingMode)) return
    if (result === 'NO_GAME' && !isCancellationReason(cancellationReason)) return

    const existing = this.editor.mode === 'edit' ? this.recordForId(this.editor.recordId ?? null) : null
    const now = new Date().toISOString()
    const record: BaseballDiaryRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      date: this.editor.date,
      season: Number(this.editor.date.slice(0, 4)),
      opponent,
      result,
      note: valueFrom(data, 'note'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(result === 'NO_GAME'
        ? { cancellationReason: cancellationReason as BaseballDiaryCancellationReason }
        : { watchingMode: watchingMode as BaseballDiaryWatchingMode }),
    }

    try {
      this.repository.save(record)
      this.records = this.repository.list()
      this.selectedYear = record.season
      this.selectedMonth = Number(record.date.slice(5, 7)) - 1
      this.editor = null
      // The inventory and statistics immediately reflect a successful save;
      // keep the diary clear of a persistent success toast.
      this.notice = ''
    } catch (error) {
      this.notice = error instanceof Error ? error.message : '기록을 저장하지 못했습니다.'
    }
    this.render()
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.isOpen || event.key !== 'Escape') return
    if (this.deletingId) {
      event.preventDefault()
      this.deletingId = null
      this.render()
      return
    }
    if (this.editor) {
      event.preventDefault()
      this.editor = null
      this.render()
      return
    }
    if (this.detailId) {
      event.preventDefault()
      this.detailId = null
      this.render()
      return
    }
    event.preventDefault()
    this.onRequestClose()
  }
}
