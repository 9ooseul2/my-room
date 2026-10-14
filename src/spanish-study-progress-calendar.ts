import {
  getKoreanCalendarDate,
  loadSpanishStudyStore,
  millisecondsUntilNextKoreanCalendarDay,
  spanishStudyStorageKey,
  type SpanishStudyRecord,
} from './spanish-study'

export const spanishCalendarWeekdays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const

const spanishCalendarMonths = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const

export interface SpanishCalendarMonth {
  year: number
  month: number
}

export interface SpanishCalendarGrid {
  year: number
  month: number
  totalDays: number
  firstWeekdayMondayIndex: number
  completedStudyDates: ReadonlySet<string>
}

const studyDateFor = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const getSpanishCalendarMonthName = (month: number) => spanishCalendarMonths[month - 1] ?? ''

export const getDaysInSpanishCalendarMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Converts JavaScript Sunday-first weekdays to a Monday-first grid index. */
export const getMondayFirstWeekdayIndex = (year: number, month: number) =>
  (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7

export const shiftSpanishCalendarMonth = ({ year, month }: SpanishCalendarMonth, offset: number): SpanishCalendarMonth => {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

/** Completed dates are keyed by the existing studyDate, never by completion time. */
export const getCompletedSpanishStudyDatesForMonth = (
  records: readonly SpanishStudyRecord[],
  year: number,
  month: number,
) => {
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-`
  return new Set(
    records
      .filter((record) => record.studyDate.startsWith(prefix) && record.completed && typeof record.completedAt === 'string')
      .map((record) => record.studyDate),
  )
}

export const buildSpanishCalendarGrid = (
  year: number,
  month: number,
  completedStudyDates: ReadonlySet<string>,
): SpanishCalendarGrid => ({
  year,
  month,
  totalDays: getDaysInSpanishCalendarMonth(year, month),
  firstWeekdayMondayIndex: getMondayFirstWeekdayIndex(year, month),
  completedStudyDates,
})

const isSameCalendarMonth = (first: SpanishCalendarMonth, second: SpanishCalendarMonth) =>
  first.year === second.year && first.month === second.month

/** Owns only the progress popup; it reads the existing study store afresh on each render. */
export class SpanishStudyProgressCalendarController {
  private readonly root: HTMLElement
  private isOpen = false
  private displayedMonth: SpanishCalendarMonth | null = null
  private midnightTimer: number | undefined

  constructor(root: HTMLElement) {
    this.root = root
    this.root.addEventListener('click', (event) => this.handleClick(event))
    window.addEventListener('storage', (event) => {
      if (this.isOpen && event.key === spanishStudyStorageKey) this.render()
    })
  }

  setOpen(isOpen: boolean) {
    if (this.isOpen === isOpen) return

    this.isOpen = isOpen
    if (!isOpen) {
      this.stopCalendarRefresh()
      return
    }

    this.displayedMonth = getKoreanCalendarDate()
    this.render()
    this.scheduleCalendarRefresh()
  }

  private render() {
    if (!this.isOpen || !this.displayedMonth) return

    const { year, month } = this.displayedMonth
    const records = Object.values(loadSpanishStudyStore().records)
    const completedStudyDates = getCompletedSpanishStudyDatesForMonth(records, year, month)
    const grid = buildSpanishCalendarGrid(year, month, completedStudyDates)
    const blankCells = Array.from(
      { length: grid.firstWeekdayMondayIndex },
      () => '<span class="spanish-study-calendar__blank" aria-hidden="true"></span>',
    ).join('')
    const dayCells = Array.from({ length: grid.totalDays }, (_, index) => {
      const day = index + 1
      const studyDate = studyDateFor(year, month, day)
      const isCompleted = grid.completedStudyDates.has(studyDate)
      return `
        <span class="spanish-study-calendar__day${isCompleted ? ' is-completed' : ''}" aria-label="${day}일${isCompleted ? ', 학습 완료' : ''}">
          <span>${day}</span>
          ${isCompleted ? '<i class="spanish-study-calendar__sticker" aria-hidden="true"></i>' : ''}
        </span>`
    }).join('')

    this.root.innerHTML = `
      <header class="spanish-study-calendar__header">
        <p class="room-furniture-panel__eyebrow">SPANISH ROOM · LEARNING LOG</p>
        <h2 id="calendar-panel-title">SPANISH STUDY PROGRESS</h2>
        <nav class="spanish-study-calendar__navigation" aria-label="학습 달력 월 이동">
          <button class="spanish-study-calendar__month-button" type="button" data-calendar-action="previous" aria-label="이전 달 보기">←</button>
          <p aria-live="polite">${getSpanishCalendarMonthName(month)} ${year}</p>
          <button class="spanish-study-calendar__month-button" type="button" data-calendar-action="next" aria-label="다음 달 보기">→</button>
        </nav>
      </header>
      <section class="spanish-study-calendar__summary" aria-label="월별 학습 현황">
        <span>MONTHLY PROGRESS</span>
        <strong>${completedStudyDates.size} / ${grid.totalDays} DAYS STUDIED</strong>
      </section>
      <div class="spanish-study-calendar__weekdays" aria-hidden="true">
        ${spanishCalendarWeekdays.map((day) => `<span>${day}</span>`).join('')}
      </div>
      <div class="spanish-study-calendar__grid" aria-label="${getSpanishCalendarMonthName(month)} ${year} 학습 달력">
        ${blankCells}${dayCells}
      </div>`
  }

  private handleClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element) || !this.displayedMonth) return

    const action = target.closest<HTMLElement>('[data-calendar-action]')?.dataset.calendarAction
    if (action === 'previous') {
      this.displayedMonth = shiftSpanishCalendarMonth(this.displayedMonth, -1)
      this.render()
    }

    if (action === 'next') {
      this.displayedMonth = shiftSpanishCalendarMonth(this.displayedMonth, 1)
      this.render()
    }
  }

  private scheduleCalendarRefresh() {
    this.stopCalendarRefresh()
    const currentMonthAtSchedule = getKoreanCalendarDate()
    this.midnightTimer = window.setTimeout(() => {
      this.midnightTimer = undefined
      if (!this.isOpen) return

      const currentMonth = getKoreanCalendarDate()
      if (isSameCalendarMonth(this.displayedMonth ?? currentMonth, currentMonthAtSchedule)) {
        this.displayedMonth = currentMonth
      }

      this.render()
      this.scheduleCalendarRefresh()
    }, millisecondsUntilNextKoreanCalendarDay())
  }

  private stopCalendarRefresh() {
    if (this.midnightTimer === undefined) return
    window.clearTimeout(this.midnightTimer)
    this.midnightTimer = undefined
  }
}
