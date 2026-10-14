import {
  spanishDailyStudySets,
  type SpanishDailyStudySet,
  type SpanishStudyQuestion,
} from './spanish-study-data'

export type { SpanishDailyStudySet, SpanishStudyQuestion, SpanishStudyQuestionType } from './spanish-study-data'

export const spanishStudyStorageKey = 'my-rooms/spanish-study/v1'
export const spanishStudyStorageVersion = 1
export const spanishStudyRecordsChangedEvent = 'spanish-study-records-changed'
export const koreanStudyTimeZone = 'Asia/Seoul'
export const koreanStudyResetHour = 8

export interface SpanishStudyRecord {
  studyDate: string
  questionIds: string[]
  answers: Record<string, string>
  submittedAt: Record<string, string>
  /** null means a sentence-writing response was saved without automatic grading. */
  correctness: Record<string, boolean | null>
  completed: boolean
  completedAt: string | null
  currentQuestionIndex: number
}

export interface SpanishStudyStore {
  version: number
  records: Record<string, SpanishStudyRecord>
}

export interface SpanishStudySetProvider {
  getStudySet(studyDate: string, recordedQuestionIds?: readonly string[]): SpanishDailyStudySet
}

const dayInMilliseconds = 24 * 60 * 60 * 1000
const studySetAnchorDate = '2026-10-12'

const isoDateExpression = /^\d{4}-\d{2}-\d{2}$/

const toUtcDay = (studyDate: string) => {
  const [year, month, day] = studyDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

const isStudyDate = (value: unknown): value is string =>
  typeof value === 'string' && isoDateExpression.test(value) && Number.isFinite(toUtcDay(value))

const emptyStore = (): SpanishStudyStore => ({
  version: spanishStudyStorageVersion,
  records: {},
})

const cloneRecord = (record: SpanishStudyRecord): SpanishStudyRecord => ({
  ...record,
  questionIds: [...record.questionIds],
  answers: { ...record.answers },
  submittedAt: { ...record.submittedAt },
  correctness: { ...record.correctness },
})

const toStringRecord = (value: unknown) => {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

const toCorrectnessRecord = (value: unknown) => {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean | null] => typeof entry[1] === 'boolean' || entry[1] === null,
    ),
  )
}

const normalizeRecord = (value: unknown): SpanishStudyRecord | null => {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<SpanishStudyRecord>
  if (!isStudyDate(candidate.studyDate) || !Array.isArray(candidate.questionIds)) return null

  const questionIds = candidate.questionIds.filter((id): id is string => typeof id === 'string')
  if (questionIds.length !== 3) return null

  return {
    studyDate: candidate.studyDate,
    questionIds,
    answers: toStringRecord(candidate.answers),
    submittedAt: toStringRecord(candidate.submittedAt),
    correctness: toCorrectnessRecord(candidate.correctness),
    completed: candidate.completed === true,
    completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : null,
    currentQuestionIndex: typeof candidate.currentQuestionIndex === 'number'
      ? Math.min(2, Math.max(0, Math.floor(candidate.currentQuestionIndex)))
      : 0,
  }
}

/** Reads defensively: invalid/corrupt storage is treated as a fresh study log. */
export const loadSpanishStudyStore = (): SpanishStudyStore => {
  try {
    const raw = window.localStorage.getItem(spanishStudyStorageKey)
    if (!raw) return emptyStore()

    const parsed = JSON.parse(raw) as Partial<SpanishStudyStore>
    if (!parsed || typeof parsed !== 'object' || !parsed.records || typeof parsed.records !== 'object') {
      return emptyStore()
    }

    const records = Object.fromEntries(
      Object.entries(parsed.records)
        .map(([studyDate, record]) => [studyDate, normalizeRecord(record)] as const)
        .filter((entry): entry is [string, SpanishStudyRecord] => entry[1] !== null),
    )

    return { version: spanishStudyStorageVersion, records }
  } catch {
    return emptyStore()
  }
}

/** Storage may be unavailable in a private/sandboxed browser; learning still works for this session. */
export const saveSpanishStudyStore = (store: SpanishStudyStore) => {
  try {
    window.localStorage.setItem(spanishStudyStorageKey, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

const orderedQuestionCatalog = spanishDailyStudySets.flatMap((set) => set.questions)
const questionsById = new Map(orderedQuestionCatalog.map((question) => [question.id, question]))

const isStudySet = (questions: readonly (SpanishStudyQuestion | undefined)[]): questions is readonly [SpanishStudyQuestion, SpanishStudyQuestion, SpanishStudyQuestion] =>
  questions.length === 3 && questions.every((question) => question !== undefined)

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor

const daysBetween = (from: string, to: string) => Math.round((toUtcDay(to) - toUtcDay(from)) / dayInMilliseconds)

/**
 * Uses a fixed anchor and a fourteen-day cycle. A saved record always asks for
 * its saved IDs first, so a learner's existing date never receives another set.
 */
export class LocalSpanishStudyProvider implements SpanishStudySetProvider {
  getStudySet(studyDate: string, recordedQuestionIds?: readonly string[]) {
    const savedQuestions = recordedQuestionIds?.map((id) => questionsById.get(id)) ?? []
    if (isStudySet(savedQuestions)) {
      return { id: `saved-${studyDate}`, questions: savedQuestions }
    }

    const index = positiveModulo(daysBetween(studySetAnchorDate, studyDate), spanishDailyStudySets.length)
    return spanishDailyStudySets[index]
  }
}

const makeRecord = (studyDate: string, studySet: SpanishDailyStudySet): SpanishStudyRecord => ({
  studyDate,
  questionIds: studySet.questions.map((question) => question.id),
  answers: {},
  submittedAt: {},
  correctness: {},
  completed: false,
  completedAt: null,
  currentQuestionIndex: 0,
})

export interface SpanishStudySession {
  record: SpanishStudyRecord
  studySet: SpanishDailyStudySet
}

/** Small repository boundary for replacing the local set provider with an API later. */
export class SpanishStudyRepository {
  private store: SpanishStudyStore
  private readonly provider: SpanishStudySetProvider

  constructor(provider: SpanishStudySetProvider = new LocalSpanishStudyProvider()) {
    this.provider = provider
    this.store = loadSpanishStudyStore()
  }

  getSession(studyDate: string): SpanishStudySession {
    const existing = this.store.records[studyDate]
    const studySet = this.provider.getStudySet(studyDate, existing?.questionIds)
    const record = existing && existing.questionIds.every((id) => studySet.questions.some((question) => question.id === id))
      ? existing
      : makeRecord(studyDate, studySet)

    if (!existing || record !== existing) {
      this.store.records[studyDate] = record
      this.persist()
    }

    return { record: cloneRecord(record), studySet }
  }

  submitAnswer(studyDate: string, question: SpanishStudyQuestion, answer: string, submittedAt = new Date().toISOString()) {
    const session = this.getSession(studyDate)
    const record = this.store.records[studyDate]

    record.answers[question.id] = answer
    record.submittedAt[question.id] = submittedAt
    record.correctness[question.id] = question.type === 'sentence-writing'
      ? null
      : isAutomaticallyCorrect(question, answer)
    this.persist()

    return { record: cloneRecord(record), studySet: session.studySet }
  }

  setCurrentQuestion(studyDate: string, currentQuestionIndex: number) {
    const session = this.getSession(studyDate)
    const record = this.store.records[studyDate]
    record.currentQuestionIndex = Math.min(2, Math.max(0, Math.floor(currentQuestionIndex)))
    this.persist()
    return { record: cloneRecord(record), studySet: session.studySet }
  }

  completeStudy(studyDate: string, completedAt = new Date().toISOString()) {
    const session = this.getSession(studyDate)
    const record = this.store.records[studyDate]
    const allSubmitted = session.studySet.questions.every((question) => Boolean(record.submittedAt[question.id]))
    if (!allSubmitted) return { record: cloneRecord(record), studySet: session.studySet, completed: false }

    if (!record.completed) {
      record.completed = true
      record.completedAt = completedAt
      this.persist()
    }

    return { record: cloneRecord(record), studySet: session.studySet, completed: true }
  }

  getRecords() {
    return Object.values(this.store.records).map(cloneRecord)
  }

  /**
   * Returns a saved session without creating a new record or changing progress.
   * The bookshelf archive uses this read-only path for past study dates.
   */
  getArchivedSession(studyDate: string): SpanishStudySession | null {
    const record = this.store.records[studyDate]
    if (!record) return null

    const studySet = this.provider.getStudySet(studyDate, record.questionIds)
    const hasRecordedQuestions = record.questionIds.every((id) =>
      studySet.questions.some((question) => question.id === id),
    )

    return hasRecordedQuestions ? { record: cloneRecord(record), studySet } : null
  }

  private persist() {
    saveSpanishStudyStore(this.store)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(spanishStudyRecordsChangedEvent))
  }
}

const normalizeAnswer = (answer: string) => answer.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-ES')

/** Accent characters intentionally remain distinct; only casing and extra spaces are ignored. */
export const isAutomaticallyCorrect = (question: SpanishStudyQuestion, answer: string) =>
  question.type !== 'sentence-writing'
    && question.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalizeAnswer(answer))

/** A reference match is informative only; sentence-writing never receives an automatic score. */
export const matchesReferenceSentence = (question: SpanishStudyQuestion, answer: string) =>
  question.type === 'sentence-writing'
    && question.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalizeAnswer(answer))

export const isQuestionSubmitted = (record: SpanishStudyRecord, questionId: string) =>
  Boolean(record.submittedAt[questionId])

export const findResumeQuestionIndex = (record: SpanishStudyRecord, studySet: SpanishDailyStudySet) => {
  // The index is persisted immediately when NEXT is chosen. Keeping a submitted
  // current question here lets a reopened popup show its feedback before moving on.
  return Math.min(studySet.questions.length - 1, Math.max(0, record.currentQuestionIndex))
}

const kstParts = (date: Date) => {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: koreanStudyTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value ?? 0)

  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

/** The real calendar date in Korea, independent from the 08:00 study reset. */
export const getKoreanCalendarDate = (now = new Date()) => {
  const { year, month, day } = kstParts(now)
  return { year, month, day }
}

export const shiftStudyDate = (studyDate: string, days: number) => {
  const shifted = new Date(toUtcDay(studyDate) + days * dayInMilliseconds)
  return shifted.toISOString().slice(0, 10)
}

/** Korea time: before 08:00 the active study set is the preceding calendar day. */
export const getKoreanStudyDate = (now = new Date()) => {
  const { year, month, day, hour } = kstParts(now)
  const today = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return hour < koreanStudyResetHour ? shiftStudyDate(today, -1) : today
}

/** Calculates the next 08:00 Asia/Seoul boundary without relying on the browser's local timezone. */
export const millisecondsUntilNextKoreanStudyReset = (now = new Date()) => {
  const { year, month, day, hour, minute, second } = kstParts(now)
  const currentKoreanClock = Date.UTC(year, month - 1, day, hour, minute, second, now.getMilliseconds())
  const targetKoreanClock = Date.UTC(year, month - 1, day + (hour >= koreanStudyResetHour ? 1 : 0), koreanStudyResetHour)
  return Math.max(100, targetKoreanClock - currentKoreanClock + 100)
}

/** Calculates the next 00:00 Asia/Seoul boundary for calendar refreshes. */
export const millisecondsUntilNextKoreanCalendarDay = (now = new Date()) => {
  const { year, month, day, hour, minute, second } = kstParts(now)
  const currentKoreanClock = Date.UTC(year, month - 1, day, hour, minute, second, now.getMilliseconds())
  const nextKoreanMidnight = Date.UTC(year, month - 1, day + 1)
  return Math.max(100, nextKoreanMidnight - currentKoreanClock + 100)
}

export const formatKoreanStudyDate = (studyDate: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date(`${studyDate}T00:00:00Z`))

export interface StudyWeekRange {
  /** Monday–Sunday; a week is archived under the month containing this Monday. */
  weekStart: string
  weekEnd: string
  studyDates: string[]
}

const mondayForDate = (studyDate: string) => {
  const date = new Date(toUtcDay(studyDate))
  const mondayOffset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return date.toISOString().slice(0, 10)
}

export const getWeekRangeForStudyDate = (studyDate: string): StudyWeekRange => {
  const weekStart = mondayForDate(studyDate)
  return {
    weekStart,
    weekEnd: shiftStudyDate(weekStart, 6),
    studyDates: Array.from({ length: 7 }, (_, index) => shiftStudyDate(weekStart, index)),
  }
}

/**
 * A boundary week belongs to the month containing its Monday. Thus every date
 * belongs to exactly one archive week, even when a Monday–Sunday range spans months.
 */
export const getArchiveWeeksForMonth = (year: number, month: number): StudyWeekRange[] => {
  const firstDay = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
  const firstMonday = mondayForDate(firstDay)
  const firstMondayOfMonth = firstMonday.slice(0, 7) === firstDay.slice(0, 7)
    ? firstMonday
    : shiftStudyDate(firstMonday, 7)
  const result: StudyWeekRange[] = []

  for (let weekStart = firstMondayOfMonth; weekStart.slice(0, 7) === firstDay.slice(0, 7); weekStart = shiftStudyDate(weekStart, 7)) {
    result.push(getWeekRangeForStudyDate(weekStart))
  }

  return result
}

export const getMonthlyStudyRecords = (records: readonly SpanishStudyRecord[], year: number, month: number) => {
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
  return records
    .filter((record) => record.studyDate.startsWith(prefix))
    .sort((first, second) => first.studyDate.localeCompare(second.studyDate))
}

export const getCompletedStudyDatesForWeek = (records: readonly SpanishStudyRecord[], week: StudyWeekRange) => {
  const dates = new Set(week.studyDates)
  return records
    .filter((record) => record.completed && dates.has(record.studyDate))
    .map((record) => record.studyDate)
    .sort()
}

export interface SpanishStudyArchiveWeek extends StudyWeekRange {
  /** Stable storage/display key: a Monday date, not a calendar week number. */
  id: string
  records: SpanishStudyRecord[]
}

/**
 * Builds weekly bookshelf volumes directly from completed records. A week is
 * uniquely identified by its Monday, so month and year boundaries cannot make
 * duplicate books. No archive state is stored separately.
 */
export const getCompletedSpanishStudyArchiveWeeks = (records: readonly SpanishStudyRecord[]) => {
  const weeks = new Map<string, SpanishStudyArchiveWeek>()

  records
    .filter((record) => record.completed)
    .sort((first, second) => first.studyDate.localeCompare(second.studyDate))
    .forEach((record) => {
      const range = getWeekRangeForStudyDate(record.studyDate)
      const existing = weeks.get(range.weekStart)
      if (existing) {
        existing.records.push(cloneRecord(record))
        return
      }

      weeks.set(range.weekStart, {
        ...range,
        id: `week-${range.weekStart}`,
        records: [cloneRecord(record)],
      })
    })

  return [...weeks.values()]
    .map((week) => ({
      ...week,
      records: [...week.records].sort((first, second) => first.studyDate.localeCompare(second.studyDate)),
    }))
    .sort((first, second) => second.weekStart.localeCompare(first.weekStart))
}

/** ISO-8601 week number for display only; archive identity always uses weekStart. */
export const getSpanishStudyWeekNumber = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7))
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * dayInMilliseconds))
}
