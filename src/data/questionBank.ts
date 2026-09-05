import type { Question } from '../types'
import { applyPlainLanguageOverride } from './plainLanguageQuestions'
import { questions as coreQuestions } from './questions'
import { supplementalQuestions } from './supplementalQuestions'

/**
 * Keep authored candidates separate from the learner-facing inventory so future
 * Feishu imports can be reviewed before they affect scores or mastery data.
 */
export const questionCandidates: Question[] = [
  ...coreQuestions,
  ...supplementalQuestions,
].map(applyPlainLanguageOverride)

export const questions: Question[] = questionCandidates.filter(
  (question) => question.status === 'published',
)
