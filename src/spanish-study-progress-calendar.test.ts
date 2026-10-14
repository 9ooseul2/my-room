import {
  buildSpanishCalendarGrid,
  getCompletedSpanishStudyDatesForMonth,
  getMondayFirstWeekdayIndex,
  shiftSpanishCalendarMonth,
} from './spanish-study-progress-calendar'
import {
  getCompletedSpanishStudyArchiveWeeks,
  getKoreanCalendarDate,
  getSpanishStudyWeekNumber,
  type SpanishStudyRecord,
} from './spanish-study'

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`)
}

const recordFor = (studyDate: string, completed: boolean, completedAt: string | null): SpanishStudyRecord => ({
  studyDate,
  questionIds: ['one', 'two', 'three'],
  answers: {},
  submittedAt: {},
  correctness: {},
  completed,
  completedAt,
  currentQuestionIndex: 0,
})

const october2026 = buildSpanishCalendarGrid(2026, 10, new Set())
assertEqual(october2026.totalDays, 31, 'October has 31 days')
assertEqual(october2026.firstWeekdayMondayIndex, 3, 'October 2026 begins on Thursday in a Monday-first grid')

const february2028 = buildSpanishCalendarGrid(2028, 2, new Set())
assertEqual(february2028.totalDays, 29, 'Leap-year February has 29 days')
assertEqual(february2028.firstWeekdayMondayIndex, 1, 'February 2028 begins on Tuesday in a Monday-first grid')

const completedDates = getCompletedSpanishStudyDatesForMonth([
  recordFor('2026-10-13', true, '2026-10-13T12:00:00.000Z'),
  recordFor('2026-10-14', false, null),
  recordFor('2026-09-30', true, '2026-09-30T12:00:00.000Z'),
  recordFor('2026-10-15', true, null),
], 2026, 10)
assertEqual(completedDates.size, 1, 'Only completed records with a completion time count')
assertEqual(completedDates.has('2026-10-13'), true, 'Completed studyDate is retained as the sticker date')

const previousMonth = shiftSpanishCalendarMonth({ year: 2026, month: 1 }, -1)
assertEqual(previousMonth.year, 2025, 'Previous month crosses into the prior year')
assertEqual(previousMonth.month, 12, 'Previous month becomes December')
assertEqual(getMondayFirstWeekdayIndex(2026, 10), 3, 'Monday-first weekday conversion stays deterministic')

const koreanMidnight = getKoreanCalendarDate(new Date('2026-10-13T15:00:00.000Z'))
assertEqual(koreanMidnight.year, 2026, 'Korea calendar year is derived from Asia/Seoul time')
assertEqual(koreanMidnight.month, 10, 'Korea calendar month is derived from Asia/Seoul time')
assertEqual(koreanMidnight.day, 14, 'Korea calendar day rolls over at midnight, not 08:00')

const archiveWeeks = getCompletedSpanishStudyArchiveWeeks([
  recordFor('2026-10-12', true, '2026-10-12T12:00:00.000Z'),
  recordFor('2026-10-13', true, '2026-10-13T12:00:00.000Z'),
  recordFor('2026-10-19', true, '2026-10-19T12:00:00.000Z'),
  recordFor('2026-10-20', false, null),
])
assertEqual(archiveWeeks.length, 2, 'A completed week creates exactly one archive volume')
assertEqual(archiveWeeks[0].weekStart, '2026-10-19', 'Archive volumes sort from recent to old')
assertEqual(archiveWeeks[1].weekStart, '2026-10-12', 'The Monday date is the stable archive identity')
assertEqual(archiveWeeks[1].records.length, 2, 'Additional completed days accumulate in the same weekly volume')
assertEqual(getSpanishStudyWeekNumber('2026-10-12'), 42, 'Display week number follows ISO Monday-based weeks')

const boundaryArchiveWeek = getCompletedSpanishStudyArchiveWeeks([
  recordFor('2026-12-28', true, '2026-12-28T12:00:00.000Z'),
  recordFor('2027-01-03', true, '2027-01-03T12:00:00.000Z'),
])
assertEqual(boundaryArchiveWeek.length, 1, 'A year-boundary Monday–Sunday range remains one volume')
assertEqual(boundaryArchiveWeek[0].weekEnd, '2027-01-03', 'Archive range preserves the boundary Sunday')
