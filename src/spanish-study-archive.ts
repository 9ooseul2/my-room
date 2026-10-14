import {
  getCompletedSpanishStudyArchiveWeeks,
  getSpanishStudyWeekNumber,
  type SpanishStudyArchiveWeek,
  type SpanishStudyRecord,
  SpanishStudyRepository,
} from './spanish-study'
import { createModalHeaderActions } from './modal-header-actions'
import { renderSpanishStudyReviewDetails } from './spanish-study-ui'

type ArchiveView = 'weeks' | 'days' | 'review'

const englishMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const spanishWeekdays = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

const dateParts = (studyDate: string) => {
  const [year, month, day] = studyDate.split('-').map(Number)
  return { year, month, day }
}

const formatArchiveDateRange = (weekStart: string, weekEnd: string) => {
  const start = dateParts(weekStart)
  const end = dateParts(weekEnd)
  const startMonth = englishMonths[start.month - 1]
  const endMonth = englishMonths[end.month - 1]

  if (start.year === end.year && start.month === end.month) {
    return `${startMonth} ${start.day}–${end.day}, ${start.year}`
  }

  if (start.year === end.year) return `${startMonth} ${start.day}–${endMonth} ${end.day}, ${start.year}`
  return `${startMonth} ${start.day}, ${start.year}–${endMonth} ${end.day}, ${end.year}`
}

const formatSpanishStudyDate = (studyDate: string) => {
  const date = new Date(`${studyDate}T00:00:00Z`)
  const { day, month } = dateParts(studyDate)
  return `${spanishWeekdays[date.getUTCDay()]} ${String(day).padStart(2, '0')} ${englishMonths[month - 1]}`
}

const questionCount = (records: readonly SpanishStudyRecord[]) =>
  records.reduce((total, record) => total + record.questionIds.length, 0)

/** Read-only bookshelf archive driven entirely by existing completed records. */
export class SpanishStudyArchiveController {
  private readonly root: HTMLElement
  private readonly repository: SpanishStudyRepository
  private readonly modalActionsRoot: HTMLElement
  private isOpen = false
  private view: ArchiveView = 'weeks'
  private selectedWeekStart: string | null = null
  private selectedStudyDate: string | null = null

  constructor(root: HTMLElement, repository: SpanishStudyRepository, modalActionsRoot: HTMLElement) {
    this.root = root
    this.repository = repository
    this.modalActionsRoot = modalActionsRoot
    this.root.addEventListener('click', (event) => this.handleClick(event))
    this.modalActionsRoot.addEventListener('click', (event) => this.handleClick(event))
  }

  setOpen(isOpen: boolean) {
    const isOpening = isOpen && !this.isOpen
    this.isOpen = isOpen

    if (!isOpen) {
      this.resetNavigation()
      this.modalActionsRoot.innerHTML = ''
      return
    }

    if (isOpening) this.resetNavigation()
    this.render()
  }

  refresh() {
    if (this.isOpen) this.render()
  }

  private resetNavigation() {
    this.view = 'weeks'
    this.selectedWeekStart = null
    this.selectedStudyDate = null
  }

  private getWeeks() {
    return getCompletedSpanishStudyArchiveWeeks(this.repository.getRecords())
  }

  private render() {
    if (!this.isOpen) return

    this.renderModalActions()
    const weeks = this.getWeeks()
    if (this.view === 'days') {
      const week = weeks.find((candidate) => candidate.weekStart === this.selectedWeekStart)
      if (week) {
        this.root.innerHTML = this.renderWeekDays(week)
        return
      }
      this.resetNavigation()
      this.renderModalActions()
    }

    if (this.view === 'review') {
      const week = weeks.find((candidate) => candidate.weekStart === this.selectedWeekStart)
      const record = week?.records.find((candidate) => candidate.studyDate === this.selectedStudyDate)
      if (week && record) {
        this.root.innerHTML = this.renderReview(week, record)
        return
      }
      this.resetNavigation()
      this.renderModalActions()
    }

    this.root.innerHTML = this.renderWeekList(weeks)
  }

  private renderModalActions() {
    const back = this.view === 'days'
      ? { attribute: 'data-spanish-archive-action', action: 'back-to-weeks' }
      : this.view === 'review'
        ? { attribute: 'data-spanish-archive-action', action: 'back-to-days' }
        : undefined

    this.modalActionsRoot.innerHTML = createModalHeaderActions({
      close: { attribute: 'data-room-action', action: 'close-furniture-panel' },
      back,
    })
  }

  private renderHeader(title: string, subtitle: string) {
    return `
      <header class="spanish-study-archive__header">
        <p class="spanish-study-archive__eyebrow">SPANISH ROOM · BOOKSHELF</p>
        <h2 id="bookshelf-panel-title">${title}</h2>
        <p>${subtitle}</p>
      </header>`
  }

  private renderWeekList(weeks: readonly SpanishStudyArchiveWeek[]) {
    if (!weeks.length) {
      return `
        ${this.renderHeader('MY STUDY ARCHIVE', 'Weekly Spanish study records')}
        <section class="spanish-study-archive__empty">
          <p>Your bookshelf is waiting for its first story.</p>
        </section>`
    }

    return `
      ${this.renderHeader('MY STUDY ARCHIVE', 'Select a weekly volume to revisit your study.')}
      <section class="spanish-study-archive__book-grid" aria-label="주차별 학습 기록">
        ${weeks.map((week) => `
          <button class="spanish-study-archive__book" type="button" data-spanish-archive-action="open-week" data-week-start="${week.weekStart}">
            <span class="spanish-study-archive__book-spine" aria-hidden="true"></span>
            <span class="spanish-study-archive__book-copy">
              <b>W${String(getSpanishStudyWeekNumber(week.weekStart)).padStart(2, '0')}</b>
              <span>${formatArchiveDateRange(week.weekStart, week.weekEnd)}</span>
              <em>${week.records.length} ${week.records.length === 1 ? 'DAY' : 'DAYS'} STUDIED</em>
            </span>
          </button>`).join('')}
      </section>`
  }

  private renderWeekDays(week: SpanishStudyArchiveWeek) {
    return `
      ${this.renderHeader(
        `W${String(getSpanishStudyWeekNumber(week.weekStart)).padStart(2, '0')}`,
        formatArchiveDateRange(week.weekStart, week.weekEnd),
      )}
      <section class="spanish-study-archive__week-summary" aria-label="선택한 주의 학습 요약">
        <strong>${week.records.length} DAYS STUDIED</strong>
        <span>${questionCount(week.records)} QUESTIONS</span>
      </section>
      <section class="spanish-study-archive__day-list" aria-label="학습한 날짜">
        ${week.records.map((record) => `
          <button class="spanish-study-archive__day" type="button" data-spanish-archive-action="open-date" data-study-date="${record.studyDate}">
            <span>${formatSpanishStudyDate(record.studyDate)}</span>
            <small>${record.questionIds.length} QUESTIONS</small>
          </button>`).join('')}
      </section>`
  }

  private renderReview(week: SpanishStudyArchiveWeek, record: SpanishStudyRecord) {
    const session = this.repository.getArchivedSession(record.studyDate)
    const questions = session
      ? session.record.questionIds
        .map((questionId) => session.studySet.questions.find((question) => question.id === questionId))
        .filter((question): question is NonNullable<typeof question> => question !== undefined)
      : []
    const hasCompleteReview = session && questions.length === session.record.questionIds.length

    return `
      ${this.renderHeader(
        formatSpanishStudyDate(record.studyDate),
        `W${String(getSpanishStudyWeekNumber(week.weekStart)).padStart(2, '0')} · ${formatArchiveDateRange(week.weekStart, week.weekEnd)}`,
      )}
      ${hasCompleteReview && session
        ? `<section class="spanish-study-archive__review-list" aria-label="${formatSpanishStudyDate(record.studyDate)}의 복습 기록">
            ${questions.map((question, index) => {
              const hasSavedResponse = Boolean(session.record.submittedAt[question.id])
                && Boolean(session.record.answers[question.id]?.trim())
              return `
                <article class="spanish-study-archive__review-question">
                  <p class="spanish-study-archive__question-index">QUESTION ${index + 1} / ${questions.length}</p>
                  ${hasSavedResponse
                    ? renderSpanishStudyReviewDetails(session.record, question)
                    : `<p class="daily-study__type">ARCHIVE ENTRY INCOMPLETE</p>
                       <p class="spanish-study-archive__missing-answer">이 문제의 제출 답변이 저장되어 있지 않아 결과를 표시할 수 없어요.</p>`}
                </article>`
            }).join('')}
          </section>`
        : `<section class="spanish-study-archive__unavailable">
            <p class="daily-study__type">REVIEW UNAVAILABLE</p>
            <h3>저장된 복습 기록을 불러올 수 없어요.</h3>
            <p>이 날짜의 문제 ID 또는 제출 답변 일부가 누락되어 있어요. 기존 기록은 변경하지 않았습니다.</p>
          </section>`}`
  }

  private handleClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element)) return

    const action = target.closest<HTMLElement>('[data-spanish-archive-action]')?.dataset.spanishArchiveAction
    if (!action) return

    if (action === 'open-week') {
      const weekStart = target.closest<HTMLElement>('[data-week-start]')?.dataset.weekStart
      if (!weekStart) return
      this.view = 'days'
      this.selectedWeekStart = weekStart
      this.selectedStudyDate = null
      this.render()
      return
    }

    if (action === 'open-date') {
      const studyDate = target.closest<HTMLElement>('[data-study-date]')?.dataset.studyDate
      if (!studyDate) return
      this.view = 'review'
      this.selectedStudyDate = studyDate
      this.render()
      return
    }

    if (action === 'back-to-weeks') {
      this.view = 'weeks'
      this.selectedWeekStart = null
      this.selectedStudyDate = null
      this.render()
      return
    }

    if (action === 'back-to-days') {
      this.view = 'days'
      this.selectedStudyDate = null
      this.render()
    }
  }
}
