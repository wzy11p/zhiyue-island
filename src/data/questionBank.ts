import type { Question } from '../types'
import { questions as coreQuestions } from './questions'
import { supplementalQuestions } from './supplementalQuestions'

/**
 * Keep authored candidates separate from the learner-facing inventory so future
 * Feishu imports can be reviewed before they affect scores or mastery data.
 */
export const questionCandidates: Question[] = [
  ...coreQuestions,
  ...supplementalQuestions,
]

export const questions: Question[] = questionCandidates.filter(
  (question) => question.status === 'published',
)
