import {
  SpanishStudyRepository,
  findResumeQuestionIndex,
  formatKoreanStudyDate,
  getKoreanStudyDate,
  isAutomaticallyCorrect,
  isQuestionSubmitted,
  matchesReferenceSentence,
  millisecondsUntilNextKoreanStudyReset,
  type SpanishDailyStudySet,
  type SpanishStudyQuestion,
  type SpanishStudyRecord,
} from './spanish-study'
import { createModalHeaderActions } from './modal-header-actions'

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const questionTypeLabel: Record<SpanishStudyQuestion['type'], string> = {
  'multiple-choice': 'MULTIPLE CHOICE',
  'fill-blank': 'FILL IN THE BLANK',
  'sentence-writing': 'SENTENCE WRITING',
}

const answerForDisplay = (answer: string | undefined) => answer?.trim() || '—'

const submittedCount = (record: SpanishStudyRecord, studySet: SpanishDailyStudySet) =>
  studySet.questions.filter((question) => isQuestionSubmitted(record, question.id)).length

/**
 * The bookshelf archive deliberately uses the same answer/result/key markup as
 * the live REVIEW screen. It receives a saved record and never writes to it.
 */
export const renderSpanishStudyReviewDetails = (record: SpanishStudyRecord, question: SpanishStudyQuestion) => {
  const answer = answerForDisplay(record.answers[question.id])
  const automaticallyCorrect = question.type === 'sentence-writing'
    ? null
    : record.correctness[question.id] ?? isAutomaticallyCorrect(question, answer)
  const sentenceMatched = question.type === 'sentence-writing' && matchesReferenceSentence(question, answer)

  return `
    <p class="daily-study__type">REVIEW · ${questionTypeLabel[question.type]} · ${question.level} · ${escapeHtml(question.topic)}</p>
    <h3>${escapeHtml(question.question)}</h3>
    <p class="daily-study__your-answer"><span>YOUR ANSWER</span>${escapeHtml(answer)}</p>
    ${question.type === 'sentence-writing'
      ? `<p class="daily-study__result daily-study__result--neutral">${sentenceMatched ? '등록된 예시 표현과 일치해요.' : '문장 답변은 저장되어 있으며 자동 채점하지 않습니다.'}</p>`
      : `<p class="daily-study__result ${automaticallyCorrect ? 'daily-study__result--correct' : 'daily-study__result--incorrect'}">${automaticallyCorrect ? 'CORRECT ✓' : 'INCORRECT ✕'}</p>`}
    <dl class="daily-study__answer-key">
      <div><dt>${question.type === 'sentence-writing' ? 'MODEL ANSWER' : 'CORRECT ANSWER'}</dt><dd>${escapeHtml(question.correctAnswer)}</dd></div>
      ${question.type === 'sentence-writing' ? `<div><dt>ALTERNATIVE</dt><dd>${escapeHtml(question.exampleSentence)}</dd></div>` : ''}
      <div><dt>EXPLANATION</dt><dd>${escapeHtml(question.explanation)}</dd></div>
    </dl>`
}

/**
 * Owns only the desk popup contents. Room navigation continues to decide when
 * the panel is visible, leaving the existing backdrop and close behavior intact.
 */
export class DailySpanishStudyController {
  private readonly root: HTMLElement
  private readonly repository: SpanishStudyRepository
  private readonly modalActionsRoot: HTMLElement
  private isOpen = false
  private activeStudyDate: string | null = null
  private pendingStudyDate: string | null = null
  private mode: 'study' | 'review' = 'study'
  private reviewIndex = 0
  private resetTimer: number | undefined

  constructor(root: HTMLElement, repository: SpanishStudyRepository, modalActionsRoot: HTMLElement) {
    this.root = root
    this.repository = repository
    this.modalActionsRoot = modalActionsRoot
    this.root.addEventListener('submit', (event) => this.handleSubmit(event))
    this.root.addEventListener('click', (event) => this.handleClick(event))
    this.modalActionsRoot.addEventListener('click', (event) => this.handleClick(event))
    this.scheduleKoreanStudyResetCheck()
  }

  setOpen(isOpen: boolean) {
    if (this.isOpen === isOpen) return

    this.isOpen = isOpen
    if (!isOpen) {
      this.modalActionsRoot.innerHTML = ''
      return
    }

    this.activeStudyDate = getKoreanStudyDate()
    this.pendingStudyDate = null
    this.mode = 'study'
    this.reviewIndex = 0
    this.render()
  }

  private getSession() {
    if (!this.activeStudyDate) throw new Error('A study date is required before rendering the daily study.')
    return this.repository.getSession(this.activeStudyDate)
  }

  private render() {
    if (!this.isOpen || !this.activeStudyDate) return

    const session = this.getSession()
    this.reviewIndex = Math.min(
      session.studySet.questions.length - 1,
      Math.max(0, this.reviewIndex),
    )
    this.renderModalActions()
    this.root.innerHTML = this.renderHeader(session.record, session.studySet)

    // A completed record remains the source of review data. Check review mode
    // first; otherwise REVIEW would immediately render the complete screen again.
    if (this.mode === 'review') {
      this.root.insertAdjacentHTML('beforeend', this.renderReview(session.record, session.studySet))
    } else if (session.record.completed) {
      this.root.insertAdjacentHTML('beforeend', this.renderComplete(session.record, session.studySet))
    } else {
      this.root.insertAdjacentHTML('beforeend', this.renderStudyQuestion(session.record, session.studySet))
    }

    if (this.pendingStudyDate) this.insertRolloverNotice()
  }

  private renderModalActions() {
    this.modalActionsRoot.innerHTML = createModalHeaderActions({
      close: { attribute: 'data-room-action', action: 'close-furniture-panel' },
      back: this.mode === 'review'
        ? { attribute: 'data-daily-action', action: 'review-finish' }
        : undefined,
    })
  }

  private renderHeader(record: SpanishStudyRecord, studySet: SpanishDailyStudySet) {
    const currentQuestion = Math.min(2, Math.max(0, record.currentQuestionIndex)) + 1
    const progress = submittedCount(record, studySet)
    const progressPercent = Math.round((progress / studySet.questions.length) * 100)

    return `
      <header class="daily-study__header">
        <p class="daily-study__eyebrow">SPANISH ROOM · DAILY SET</p>
        <h2 id="desk-panel-title">DAILY SPANISH STUDY</h2>
        <p class="daily-study__date">${formatKoreanStudyDate(record.studyDate)}</p>
        <div class="daily-study__progress-copy">
          <span>${this.mode === 'review' ? `REVIEW ${this.reviewIndex + 1} / 3` : `QUESTION ${currentQuestion} / 3`}</span>
          <span>${progress} / 3 SUBMITTED</span>
        </div>
        <div class="daily-study__progress-track" aria-label="학습 진행 ${progress} / 3">
          <span style="width: ${progressPercent}%"></span>
        </div>
      </header>`
  }

  private renderStudyQuestion(record: SpanishStudyRecord, studySet: SpanishDailyStudySet) {
    const index = findResumeQuestionIndex(record, studySet)
    const question = studySet.questions[index]
    const submitted = isQuestionSubmitted(record, question.id)

    if (submitted) return this.renderFeedback(record, studySet, question, index)

    return `
      <section class="daily-study__question" aria-labelledby="daily-question-title">
        <p class="daily-study__type">${questionTypeLabel[question.type]} · ${question.level} · ${escapeHtml(question.topic)}</p>
        <h3 id="daily-question-title">${escapeHtml(question.question)}</h3>
        <form class="daily-study__form" data-daily-study-form data-question-id="${question.id}">
          ${this.renderAnswerInput(question)}
          <button class="daily-study__button" type="submit">SUBMIT</button>
        </form>
      </section>`
  }

  private renderAnswerInput(question: SpanishStudyQuestion) {
    if (question.type === 'multiple-choice') {
      return `
        <fieldset class="daily-study__choices">
          <legend>정답 하나를 선택하세요.</legend>
          ${question.options.map((option) => `
            <label class="daily-study__choice">
              <input type="radio" name="answer" value="${escapeHtml(option.text)}" required />
              <span><b>${option.id}.</b> ${escapeHtml(option.text)}</span>
            </label>`).join('')}
        </fieldset>`
    }

    if (question.type === 'fill-blank') {
      return `
        <label class="daily-study__input-label" for="daily-answer-${question.id}">빈칸에 들어갈 단어를 입력하세요.</label>
        <input class="daily-study__text-input" id="daily-answer-${question.id}" name="answer" type="text" maxlength="120" autocomplete="off" required />`
    }

    return `
      <label class="daily-study__input-label" for="daily-answer-${question.id}">스페인어 문장을 작성하세요.</label>
      <textarea class="daily-study__text-input daily-study__text-input--sentence" id="daily-answer-${question.id}" name="answer" maxlength="360" rows="4" required></textarea>
      <p class="daily-study__writing-note">문장 작성 답변은 저장되며, 자동으로 정오답 처리하지 않습니다.</p>`
  }

  private renderFeedback(record: SpanishStudyRecord, studySet: SpanishDailyStudySet, question: SpanishStudyQuestion, index: number) {
    const answer = answerForDisplay(record.answers[question.id])
    const automaticallyCorrect = question.type === 'sentence-writing'
      ? null
      : record.correctness[question.id] ?? isAutomaticallyCorrect(question, answer)
    const sentenceMatched = question.type === 'sentence-writing' && matchesReferenceSentence(question, answer)
    const isLastQuestion = index === studySet.questions.length - 1

    return `
      <section class="daily-study__feedback" aria-live="polite">
        <p class="daily-study__type">${questionTypeLabel[question.type]} · ${question.level} · ${escapeHtml(question.topic)}</p>
        <h3>${escapeHtml(question.question)}</h3>
        <p class="daily-study__your-answer"><span>YOUR ANSWER</span>${escapeHtml(answer)}</p>
        ${question.type === 'sentence-writing'
          ? `<p class="daily-study__result daily-study__result--neutral">${sentenceMatched ? '등록된 예시 표현과 일치해요.' : '문장 답변을 저장했어요. 자동 채점은 하지 않습니다.'}</p>`
          : `<p class="daily-study__result ${automaticallyCorrect ? 'daily-study__result--correct' : 'daily-study__result--incorrect'}">${automaticallyCorrect ? 'CORRECT ✓' : 'NOT QUITE — 정답을 확인해 보세요.'}</p>`}
        <dl class="daily-study__answer-key">
          <div><dt>${question.type === 'sentence-writing' ? 'MODEL ANSWER' : 'CORRECT ANSWER'}</dt><dd>${escapeHtml(question.correctAnswer)}</dd></div>
          ${question.type === 'sentence-writing' ? `<div><dt>ALTERNATIVE</dt><dd>${escapeHtml(question.exampleSentence)}</dd></div>` : ''}
          <div><dt>EXPLANATION</dt><dd>${escapeHtml(question.explanation)}</dd></div>
        </dl>
        <button class="daily-study__button" type="button" data-daily-action="${isLastQuestion ? 'complete' : 'next'}">
          ${isLastQuestion ? 'COMPLETE TODAY\'S STUDY' : 'NEXT'}
        </button>
      </section>`
  }

  private renderComplete(record: SpanishStudyRecord, studySet: SpanishDailyStudySet) {
    return `
      <section class="daily-study__complete" aria-live="polite">
        <p class="daily-study__type">DAILY RECORD SAVED</p>
        <h3>TODAY'S STUDY COMPLETE</h3>
        <p>오늘 ${submittedCount(record, studySet)}개의 문제를 모두 제출했어요.</p>
        <p class="daily-study__complete-note">답변과 해설은 언제든 REVIEW에서 다시 볼 수 있어요.</p>
        <button class="daily-study__button" type="button" data-daily-action="review">REVIEW</button>
      </section>`
  }

  private renderReview(record: SpanishStudyRecord, studySet: SpanishDailyStudySet) {
    const reviewQuestions = studySet.questions.filter((question) =>
      record.questionIds.includes(question.id)
      && isQuestionSubmitted(record, question.id)
      && Boolean(record.answers[question.id]?.trim()),
    )

    if (reviewQuestions.length !== studySet.questions.length) {
      return `
        <section class="daily-study__feedback daily-study__review" aria-live="polite">
          <p class="daily-study__type">REVIEW UNAVAILABLE</p>
          <h3>저장된 복습 기록을 불러올 수 없어요.</h3>
          <p class="daily-study__complete-note">이 날짜의 문제 ID 또는 제출 답변이 누락되었거나 손상되었습니다. 새 학습 기록이 있으면 다시 제출한 뒤 복습할 수 있어요.</p>
        </section>`
    }

    const question = reviewQuestions[this.reviewIndex]
    const canGoBack = this.reviewIndex > 0
    const canGoNext = this.reviewIndex < reviewQuestions.length - 1

    return `
      <section class="daily-study__feedback daily-study__review" aria-live="polite">
        ${renderSpanishStudyReviewDetails(record, question)}
        <div class="daily-study__actions">
          <button class="daily-study__button daily-study__button--secondary" type="button" data-daily-action="review-previous" ${canGoBack ? '' : 'disabled'}>PREV</button>
          <button class="daily-study__button" type="button" data-daily-action="review-next" ${canGoNext ? '' : 'disabled'}>NEXT</button>
        </div>
      </section>`
  }

  private handleSubmit(event: SubmitEvent) {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-daily-study-form]')) return

    event.preventDefault()
    if (!form.reportValidity() || !this.activeStudyDate) return

    const session = this.getSession()
    const questionId = form.dataset.questionId
    const question = session.studySet.questions.find((candidate) => candidate.id === questionId)
    if (!question || isQuestionSubmitted(session.record, question.id)) return

    const answer = String(new FormData(form).get('answer') ?? '').trim()
    if (!answer) return

    this.repository.submitAnswer(this.activeStudyDate, question, answer)
    this.render()
  }

  private handleClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element)) return

    const action = target.closest<HTMLElement>('[data-daily-action]')?.dataset.dailyAction
    if (!action || !this.activeStudyDate) return

    if (action === 'next') {
      const session = this.getSession()
      const nextIndex = Math.min(2, findResumeQuestionIndex(session.record, session.studySet) + 1)
      this.repository.setCurrentQuestion(this.activeStudyDate, nextIndex)
      this.render()
      return
    }

    if (action === 'complete') {
      this.repository.completeStudy(this.activeStudyDate)
      this.mode = 'study'
      this.render()
      return
    }

    if (action === 'review') {
      this.mode = 'review'
      this.reviewIndex = 0
      this.render()
      return
    }

    if (action === 'review-previous') {
      this.reviewIndex = Math.max(0, this.reviewIndex - 1)
      this.render()
      return
    }

    if (action === 'review-next') {
      const session = this.getSession()
      this.reviewIndex = Math.min(session.studySet.questions.length - 1, this.reviewIndex + 1)
      this.render()
      return
    }

    if (action === 'review-finish') {
      this.mode = 'study'
      this.render()
      return
    }

    if (action === 'switch-study-date' && this.pendingStudyDate) {
      this.activeStudyDate = this.pendingStudyDate
      this.pendingStudyDate = null
      this.mode = 'study'
      this.reviewIndex = 0
      this.render()
    }
  }

  private scheduleKoreanStudyResetCheck() {
    if (this.resetTimer !== undefined) window.clearTimeout(this.resetTimer)
    this.resetTimer = window.setTimeout(() => {
      this.resetTimer = undefined
      this.handleKoreanStudyReset()
      this.scheduleKoreanStudyResetCheck()
    }, millisecondsUntilNextKoreanStudyReset())
  }

  private handleKoreanStudyReset() {
    const nextStudyDate = getKoreanStudyDate()
    if (!this.isOpen || !this.activeStudyDate || nextStudyDate === this.activeStudyDate) return

    this.pendingStudyDate = nextStudyDate
    this.insertRolloverNotice()
  }

  private insertRolloverNotice() {
    if (!this.pendingStudyDate || this.root.querySelector('[data-daily-rollover-notice]')) return

    const notice = document.createElement('aside')
    notice.className = 'daily-study__rollover-notice'
    notice.dataset.dailyRolloverNotice = 'true'
    notice.innerHTML = `
      <p>새 학습 날짜가 준비되었습니다.</p>
      <button class="daily-study__button daily-study__button--secondary" type="button" data-daily-action="switch-study-date">NEW DAILY SET</button>`
    this.root.prepend(notice)
  }
}
