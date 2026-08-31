import type { ConceptMasteryRecord, CustomFlashcard, FlashcardReviewRecord, StudyState } from '../types'

const STORAGE_KEY = 'zhiyue-ai-pm-study-state-v1'

const migrateStoredState = (value: unknown): Partial<StudyState> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const stored = value as Partial<StudyState> & { version?: number }

  if (stored.version === 3) return stored

  // v1/v2 did not track concept-level mastery. Keep every compatible field
  // and add the new collection explicitly instead of relying on a shallow
  // spread to make an old payload look current.
  return {
    ...stored,
    conceptMastery: {},
  }
}

export const createInitialState = (): StudyState => ({
  version: 3,
  xp: 0,
  hearts: 5,
  maxHearts: 5,
  streakDays: 0,
  longestStreak: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  dailyGoal: 10,
  completedQuestionIds: [],
  wrongAnswers: {},
  weeklyActivity: {},
  achievements: [],
  imports: [],
  customFlashcards: [],
  flashcardReviews: {},
  conceptMastery: {},
})

const isCustomFlashcard = (value: unknown): value is CustomFlashcard => {
  if (!value || typeof value !== 'object') return false
  const card = value as Partial<CustomFlashcard>
  return typeof card.id === 'string'
    && typeof card.question === 'string'
    && typeof card.answer === 'string'
    && Array.isArray(card.tags)
    && typeof card.createdAt === 'string'
    && typeof card.updatedAt === 'string'
}

const sanitizeReviewRecords = (value: unknown): Record<string, FlashcardReviewRecord> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, FlashcardReviewRecord] => {
      const [key, record] = entry
      if (!record || typeof record !== 'object') return false
      const candidate = record as Partial<FlashcardReviewRecord>
      return typeof key === 'string'
        && candidate.cardId === key
        && typeof candidate.successfulSteps === 'number'
        && typeof candidate.totalReviews === 'number'
        && typeof candidate.rememberedCount === 'number'
        && typeof candidate.lastReviewedAt === 'string'
        && typeof candidate.nextReviewAt === 'string'
    }),
  )
}

const sanitizeConceptMastery = (value: unknown): Record<string, ConceptMasteryRecord> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, ConceptMasteryRecord] => {
      const [key, record] = entry
      if (!record || typeof record !== 'object') return false
      const candidate = record as Partial<ConceptMasteryRecord>
      return candidate.conceptId === key
        && typeof candidate.status === 'string'
        && Array.isArray(candidate.attempts)
        && Boolean(candidate.misconceptionCounts)
        && typeof candidate.misconceptionCounts === 'object'
    }),
  )
}

export function loadStudyState(): StudyState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = migrateStoredState(JSON.parse(raw))
    const fallback = createInitialState()

    return {
      ...fallback,
      ...parsed,
      version: 3,
      completedQuestionIds: Array.isArray(parsed.completedQuestionIds)
        ? parsed.completedQuestionIds
        : [],
      wrongAnswers: parsed.wrongAnswers ?? {},
      weeklyActivity: parsed.weeklyActivity ?? {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      customFlashcards: Array.isArray(parsed.customFlashcards)
        ? parsed.customFlashcards.filter(isCustomFlashcard)
        : [],
      flashcardReviews: sanitizeReviewRecords(parsed.flashcardReviews),
      conceptMastery: sanitizeConceptMastery(parsed.conceptMastery),
    }
  } catch {
    return createInitialState()
  }
}

export function saveStudyState(state: StudyState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in privacy modes. The in-memory session keeps
    // working even when the browser refuses persistence.
  }
}

export function clearStudyState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The caller still resets the in-memory state.
  }
}
