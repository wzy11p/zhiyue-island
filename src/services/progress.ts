import type { Difficulty, Question, StudyState } from '../types'

export const getLevel = (xp: number) => Math.floor(xp / 200) + 1

export const getLevelProgress = (xp: number) => xp % 200

export function getQuestionProgress(
  allQuestions: Question[],
  completedQuestionIds: string[],
  chapterId?: string,
  difficulty?: Difficulty,
) {
  const completed = new Set(completedQuestionIds)
  const scoped = allQuestions.filter(
    (question) =>
      (!chapterId || question.chapterId === chapterId) &&
      (!difficulty || question.difficulty === difficulty),
  )
  const complete = scoped.filter((question) => completed.has(question.id)).length

  return {
    complete,
    total: scoped.length,
    percent: scoped.length ? Math.round((complete / scoped.length) * 100) : 0,
  }
}

export const getAccuracy = (state: StudyState) =>
  state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0

export const getActiveMistakes = (state: StudyState) =>
  Object.values(state.wrongAnswers).filter((item) => item.status === 'active')

export const getDueMistakes = (state: StudyState) => {
  const now = Date.now()
  return getActiveMistakes(state).filter((item) => new Date(item.nextReviewAt).getTime() <= now)
}
