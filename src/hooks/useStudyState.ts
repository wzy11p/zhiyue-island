import { useCallback, useEffect, useRef, useState } from 'react'
import { achievementDefinitions } from '../data/achievements'
import { difficultyMeta } from '../data/chapters'
import { addDays, isYesterday, toLocalDateKey } from '../services/dates'
import { applyJourneyResult } from '../services/journey'
import { clearStudyState, createInitialState, loadStudyState, saveStudyState } from '../services/storage'
import type {
  AnswerOutcome,
  ConceptMasteryRecord,
  FlashcardDraft,
  FlashcardReviewRecord,
  JourneySessionResult,
  KnowledgeImportRecord,
  Question,
  StudyState,
  TutorAttempt,
  WrongAnswerRecord,
} from '../types'

const reviewIntervals = [1, 3, 7, 14]

const getMasteryStatus = (
  attempts: TutorAttempt[],
  misconceptionCounts: Record<string, number>,
): ConceptMasteryRecord['status'] => {
  if (!attempts.length) return 'unseen'

  const latest = attempts.at(-1)
  const repeatedMisconception = Object.values(misconceptionCounts).some((count) => count >= 2)
  if (repeatedMisconception && latest?.verdict !== 'correct') return 'fragile'

  const recent = attempts.slice(-5)
  const lastTwo = attempts.slice(-2)
  const evidenceTimes = attempts
    .map((attempt) => new Date(attempt.answeredAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const spansDay = evidenceTimes.length > 1
    && evidenceTimes[evidenceTimes.length - 1] - evidenceTimes[0] >= 24 * 60 * 60 * 1000
  const hasDistinction = attempts.some((attempt) => attempt.stage === 'distinguish' && attempt.verdict === 'correct')
  const hasTransfer = attempts.some((attempt) => attempt.stage === 'transfer' && attempt.verdict === 'correct')
  const canRetain = attempts.length >= 6
    && recent.filter((attempt) => attempt.verdict === 'correct').length >= 4
    && hasDistinction
    && hasTransfer
    && lastTwo.length === 2
    && lastTwo.every((attempt) => attempt.verdict === 'correct' && !attempt.usedHint)
    && spansDay

  if (canRetain) return 'retained'
  if (attempts.some((attempt) => ['independent', 'transfer'].includes(attempt.stage) && attempt.verdict === 'correct')) {
    return 'independent'
  }
  if (attempts.some((attempt) => ['distinguish', 'guided'].includes(attempt.stage) && attempt.verdict === 'correct')) {
    return 'guided'
  }
  return 'acquiring'
}

const withConceptAttempt = (
  current: StudyState,
  conceptId: string,
  attempt: TutorAttempt,
  now: Date,
): StudyState => {
  const existing = current.conceptMastery[conceptId]
  if (existing?.attempts.some((item) => item.id === attempt.id)) return current

  const attempts = [...(existing?.attempts ?? []), attempt].slice(-60)
  const misconceptionCounts = { ...(existing?.misconceptionCounts ?? {}) }
  if (attempt.misconceptionId) {
    misconceptionCounts[attempt.misconceptionId] = (misconceptionCounts[attempt.misconceptionId] ?? 0) + 1
  }
  const status = getMasteryStatus(attempts, misconceptionCounts)
  const record: ConceptMasteryRecord = {
    conceptId,
    status,
    attempts,
    misconceptionCounts,
    lastPracticedAt: attempt.answeredAt,
    nextReviewAt: addDays(now, status === 'retained' ? 14 : status === 'independent' ? 3 : 1).toISOString(),
  }

  return {
    ...current,
    conceptMastery: { ...current.conceptMastery, [conceptId]: record },
  }
}

const createFlashcardId = () => {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `custom:${randomPart}`
}

const withStudyDay = (state: StudyState, now: Date): StudyState => {
  const today = toLocalDateKey(now)
  if (state.lastStudyDate === today) return state

  const streakDays = state.lastStudyDate && isYesterday(state.lastStudyDate, now)
    ? state.streakDays + 1
    : 1

  return {
    ...state,
    lastStudyDate: today,
    streakDays,
    longestStreak: Math.max(state.longestStreak, streakDays),
  }
}

const unlockAchievements = (state: StudyState, unlockedAt: string) => {
  const existing = new Set(state.achievements.map((item) => item.id))
  const unlocked = achievementDefinitions
    .filter((definition) => !existing.has(definition.id) && definition.check(state))
    .map((definition) => ({ id: definition.id, unlockedAt }))

  return {
    state: unlocked.length ? { ...state, achievements: [...state.achievements, ...unlocked] } : state,
    ids: unlocked.map((item) => item.id),
  }
}

const applyAnswerToState = (
  current: StudyState,
  question: Question,
  selectedIndex: number,
  mode: 'learn' | 'review',
  now: Date,
): { state: StudyState; outcome: AnswerOutcome } => {
  const nowIso = now.toISOString()
  const today = toLocalDateKey(now)
  const correct = selectedIndex === question.correctIndex
  const xpEarned = correct ? (mode === 'review' ? 5 : difficultyMeta[question.difficulty].xp) : 0
  let next = withStudyDay(current, now)
  let masteredMistake = false

  next = {
    ...next,
    xp: next.xp + xpEarned,
    hearts: correct || mode === 'review' ? next.hearts : Math.max(0, next.hearts - 1),
    totalAnswered: next.totalAnswered + 1,
    totalCorrect: next.totalCorrect + (correct ? 1 : 0),
    weeklyActivity: {
      ...next.weeklyActivity,
      [today]: (next.weeklyActivity[today] ?? 0) + 1,
    },
    completedQuestionIds: correct
      ? Array.from(new Set([...next.completedQuestionIds, question.id]))
      : next.completedQuestionIds,
  }

  const existing = next.wrongAnswers[question.id]

  if (!correct) {
    const attempts = (existing?.attempts ?? 0) + 1
    const interval = reviewIntervals[Math.min(attempts - 1, reviewIntervals.length - 1)]
    const wrongRecord: WrongAnswerRecord = {
      questionId: question.id,
      attempts,
      lastSelectedIndex: selectedIndex,
      lastSelectedAnswer: question.options[selectedIndex],
      firstAttemptAt: existing?.firstAttemptAt ?? nowIso,
      lastAttemptAt: nowIso,
      nextReviewAt: addDays(now, interval).toISOString(),
      correctReviews: 0,
      status: 'active',
    }
    next = { ...next, wrongAnswers: { ...next.wrongAnswers, [question.id]: wrongRecord } }
  } else if (mode === 'review' && existing) {
    const correctReviews = existing.correctReviews + 1
    masteredMistake = correctReviews >= 2
    next = {
      ...next,
      wrongAnswers: {
        ...next.wrongAnswers,
        [question.id]: {
          ...existing,
          correctReviews,
          status: masteredMistake ? 'mastered' : 'active',
          nextReviewAt: addDays(now, correctReviews === 1 ? 3 : 14).toISOString(),
        },
      },
    }
  }

  if (question.conceptId && question.stage) {
    next = withConceptAttempt(next, question.conceptId, {
      id: `quiz:${question.id}:${mode}:${nowIso}`,
      activityId: question.id,
      stage: question.stage,
      answer: question.options[selectedIndex] ?? '',
      verdict: correct ? 'correct' : 'incorrect',
      usedHint: false,
      confidence: 'fair',
      misconceptionId: correct ? undefined : `${question.id}:option-${selectedIndex}`,
      answeredAt: nowIso,
    }, now)
  }

  const achievementResult = unlockAchievements(next, nowIso)
  next = achievementResult.state

  return {
    state: next,
    outcome: {
      correct,
      xpEarned,
      heartsLeft: next.hearts,
      masteredMistake,
      unlockedAchievementIds: achievementResult.ids,
    },
  }
}

export function useStudyState() {
  const [state, setState] = useState<StudyState>(() => loadStudyState())
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    saveStudyState(state)
  }, [state])

  const answerQuestion = useCallback(
    (question: Question, selectedIndex: number, mode: 'learn' | 'review'): AnswerOutcome => {
      const now = new Date()
      const preview = applyAnswerToState(stateRef.current, question, selectedIndex, mode, now)

      setState((current) => {
        const result = applyAnswerToState(current, question, selectedIndex, mode, now)
        stateRef.current = result.state
        return result.state
      })

      return preview.outcome
    },
    [],
  )

  const refillHearts = useCallback(() => {
    setState((current) => ({ ...current, hearts: current.maxHearts }))
  }, [])

  const addImport = useCallback((record: KnowledgeImportRecord) => {
    setState((current) => ({ ...current, imports: [record, ...current.imports].slice(0, 20) }))
  }, [])

  const addCustomFlashcard = useCallback((draft: FlashcardDraft) => {
    const now = new Date().toISOString()
    const id = createFlashcardId()
    setState((current) => ({
      ...current,
      customFlashcards: [
        {
          id,
          question: draft.question.trim(),
          answer: draft.answer.trim(),
          tags: Array.from(new Set((draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
          createdAt: now,
          updatedAt: now,
        },
        ...current.customFlashcards,
      ],
    }))
    return id
  }, [])

  const updateCustomFlashcard = useCallback((id: string, draft: FlashcardDraft) => {
    const now = new Date().toISOString()
    setState((current) => ({
      ...current,
      customFlashcards: current.customFlashcards.map((card) => card.id === id
        ? {
            ...card,
            question: draft.question.trim(),
            answer: draft.answer.trim(),
            tags: Array.from(new Set((draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
            updatedAt: now,
          }
        : card),
    }))
  }, [])

  const deleteCustomFlashcard = useCallback((id: string) => {
    setState((current) => {
      const flashcardReviews = { ...current.flashcardReviews }
      delete flashcardReviews[id]
      return {
        ...current,
        customFlashcards: current.customFlashcards.filter((card) => card.id !== id),
        flashcardReviews,
      }
    })
  }, [])

  const reviewFlashcard = useCallback((cardId: string, remembered: boolean) => {
    setState((current) => {
      const now = new Date()
      const existing = current.flashcardReviews[cardId]
      const successfulSteps = remembered
        ? Math.min((existing?.successfulSteps ?? 0) + 1, reviewIntervals.length)
        : 0
      const intervalIndex = remembered ? Math.max(0, successfulSteps - 1) : 0
      const record: FlashcardReviewRecord = {
        cardId,
        successfulSteps,
        totalReviews: (existing?.totalReviews ?? 0) + 1,
        rememberedCount: (existing?.rememberedCount ?? 0) + (remembered ? 1 : 0),
        lastReviewedAt: now.toISOString(),
        nextReviewAt: addDays(now, reviewIntervals[intervalIndex]).toISOString(),
      }

      return {
        ...current,
        flashcardReviews: { ...current.flashcardReviews, [cardId]: record },
      }
    })
  }, [])

  const recordTutorAttempt = useCallback((conceptId: string, attempt: TutorAttempt) => {
    setState((current) => {
      const now = new Date(attempt.answeredAt)
      const today = toLocalDateKey(now)
      const existing = current.conceptMastery[conceptId]
      if (existing?.attempts.some((item) => item.id === attempt.id)) return current
      const correct = attempt.verdict === 'correct'
      const countsForScore = attempt.stage !== 'diagnostic'
      const xpEarned = !countsForScore ? 0 : correct ? (attempt.stage === 'transfer' ? 18 : 10) : attempt.verdict === 'partial' ? 3 : 0
      let next = withStudyDay(current, now)
      next = {
        ...next,
        xp: next.xp + xpEarned,
        totalAnswered: next.totalAnswered + (countsForScore ? 1 : 0),
        totalCorrect: next.totalCorrect + (countsForScore && correct ? 1 : 0),
        weeklyActivity: {
          ...next.weeklyActivity,
          [today]: (next.weeklyActivity[today] ?? 0) + (countsForScore ? 1 : 0),
        },
      }
      next = withConceptAttempt(next, conceptId, attempt, now)
      const achievementResult = unlockAchievements(next, attempt.answeredAt)
      stateRef.current = achievementResult.state
      return achievementResult.state
    })
  }, [])

  const recordJourneyResult = useCallback((result: JourneySessionResult) => {
    const preview = applyJourneyResult(stateRef.current, result)
    setState((current) => {
      const applied = applyJourneyResult(current, result)
      stateRef.current = applied.state
      return applied.state
    })
    return {
      passed: preview.passed,
      stars: preview.stars,
      firstCompletion: preview.firstCompletion,
    }
  }, [])

  const resetProgress = useCallback(() => {
    clearStudyState()
    setState((current) => {
      const reset = {
        ...createInitialState(),
        customFlashcards: current.customFlashcards,
      }
      stateRef.current = reset
      return reset
    })
  }, [])

  return {
    state,
    answerQuestion,
    refillHearts,
    addImport,
    addCustomFlashcard,
    updateCustomFlashcard,
    deleteCustomFlashcard,
    reviewFlashcard,
    recordTutorAttempt,
    recordJourneyResult,
    resetProgress,
  }
}
