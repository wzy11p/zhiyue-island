export type Difficulty = 'easy' | 'medium' | 'hard'

export type NavigationView = 'home' | 'coach' | 'path' | 'knowledge' | 'flashcards' | 'mistakes' | 'progress' | 'import'

export type LearningStage =
  | 'diagnostic'
  | 'recall'
  | 'distinguish'
  | 'guided'
  | 'independent'
  | 'transfer'
  | 'review'

export type MasteryStatus = 'unseen' | 'acquiring' | 'guided' | 'independent' | 'retained' | 'fragile'

export type ConceptKind = 'concept' | 'rule' | 'skill' | 'boundary'

export interface ConceptMisconception {
  id: string
  label: string
  explanation: string
  triggers?: string[]
}

export interface LearningConcept {
  id: string
  chapterId: string
  title: string
  kind: ConceptKind
  objective: string
  plainDefinition: string
  whyItMatters: string
  prerequisiteIds: string[]
  keyPoints: string[]
  answerSignals: string[]
  misconceptions: ConceptMisconception[]
  example: string
  counterexample: string
  sourceRefs: KnowledgeSource[]
  recommendedStages: LearningStage[]
}

export interface Question {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  errorGuidance: string
  knowledgePoint: string
  chapterId: string
  difficulty: Difficulty
  sourceDay?: number
  tags?: string[]
  misconception?: string
  criticalNote?: string
  conceptId?: string
  stage?: LearningStage
  format?: 'single-choice' | 'free-response' | 'ordering' | 'find-error' | 'worked-example'
  objectiveId?: string
  misconceptionMap?: Record<number, string>
  sourceRefs?: KnowledgeSource[]
  version?: number
  status?: 'draft' | 'published'
}

export interface Chapter {
  id: string
  day: number
  eyebrow: string
  title: string
  description: string
  accent: string
}

export interface KnowledgeSource {
  label: string
  url: string
}

export interface KnowledgeCluster {
  title: string
  points: string[]
}

export interface KnowledgeDay {
  chapterId: string
  day: number
  summary: string
  clusters: KnowledgeCluster[]
  takeaway: string
  sources: KnowledgeSource[]
}

export type AuditStatus = 'needs-correction' | 'needs-context' | 'time-sensitive'

export interface KnowledgeAuditItem {
  id: string
  day: number
  title: string
  classroomClaim: string
  rigorousUnderstanding: string
  action: string
  status: AuditStatus
  confidence: 'high' | 'medium'
  sources: KnowledgeSource[]
}

export interface CustomFlashcard {
  id: string
  question: string
  answer: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface FlashcardReviewRecord {
  cardId: string
  successfulSteps: number
  totalReviews: number
  rememberedCount: number
  lastReviewedAt: string
  nextReviewAt: string
}

export interface FlashcardDraft {
  question: string
  answer: string
  tags?: string[]
}

export interface TutorAttempt {
  id: string
  activityId: string
  stage: LearningStage
  answer: string
  verdict: TutorVerdict
  usedHint: boolean
  confidence: 'unsure' | 'fair' | 'confident'
  misconceptionId?: string
  answeredAt: string
}

export interface ConceptMasteryRecord {
  conceptId: string
  status: MasteryStatus
  attempts: TutorAttempt[]
  misconceptionCounts: Record<string, number>
  lastPracticedAt?: string
  nextReviewAt?: string
}

export type TutorVerdict = 'correct' | 'partial' | 'misconception' | 'incorrect'

export interface TutorActivity {
  id: string
  conceptId: string
  stage: LearningStage
  prompt: string
  context?: string
  expectedAnswer: string
  acceptedSignals: string[]
  hint: string
  misconceptionId?: string
}

export interface TutorEvaluationRequest {
  sessionId: string
  activity: TutorActivity
  concept: LearningConcept
  answer: string
  confidence: TutorAttempt['confidence']
  usedHint: boolean
  recentAttempts: TutorAttempt[]
}

export interface TutorEvaluation {
  verdict: TutorVerdict
  briefFeedback: string
  explanation: string
  answerComparison: string
  nextStep: string
  misconceptionId?: string
  nextAction: 'advance' | 'probe' | 'remediate'
  nextActivity?: {
    id: string
    conceptId: string
    stage: LearningStage
    prompt: string
    context?: string
    hint: string
  }
}

export interface TutorAdapter {
  mode: 'local' | 'connected'
  evaluate(request: TutorEvaluationRequest): Promise<TutorEvaluation>
}

export interface WrongAnswerRecord {
  questionId: string
  attempts: number
  lastSelectedIndex: number
  lastSelectedAnswer?: string
  firstAttemptAt: string
  lastAttemptAt: string
  nextReviewAt: string
  correctReviews: number
  status: 'active' | 'mastered'
}

export interface Achievement {
  id: string
  unlockedAt: string
}

export type ImportStatus = 'queued' | 'ready' | 'failed'

export interface KnowledgeImportRecord {
  id: string
  title: string
  sourceUrl?: string
  sourceType: 'feishu' | 'pasted' | 'mixed'
  excerpt: string
  knowledgePointCount: number
  suggestedQuestionCount: number
  status: ImportStatus
  createdAt: string
  message?: string
}

export interface StudyState {
  version: 3
  xp: number
  hearts: number
  maxHearts: number
  streakDays: number
  longestStreak: number
  lastStudyDate?: string
  totalAnswered: number
  totalCorrect: number
  dailyGoal: number
  completedQuestionIds: string[]
  wrongAnswers: Record<string, WrongAnswerRecord>
  weeklyActivity: Record<string, number>
  achievements: Achievement[]
  imports: KnowledgeImportRecord[]
  customFlashcards: CustomFlashcard[]
  flashcardReviews: Record<string, FlashcardReviewRecord>
  conceptMastery: Record<string, ConceptMasteryRecord>
}

export interface AnswerOutcome {
  correct: boolean
  xpEarned: number
  heartsLeft: number
  masteredMistake: boolean
  unlockedAchievementIds: string[]
}

export interface QuizSessionConfig {
  key: number
  mode: 'learn' | 'review'
  chapterId?: string
  difficulty?: Difficulty
  hellCoachEnabled?: boolean
  questionIds?: string[]
}

export interface KnowledgeIngestionRequest {
  title: string
  sourceUrl?: string
  pastedContent?: string
  requestedQuestionCount?: number
}

export interface KnowledgeIngestionResult {
  importRecord: KnowledgeImportRecord
  questions?: Question[]
}

export interface KnowledgeIngestionAdapter {
  ingest(request: KnowledgeIngestionRequest): Promise<KnowledgeIngestionResult>
}
