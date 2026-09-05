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

export type QuestionFormat =
  | 'single-choice'
  | 'free-response'
  | 'ordering'
  | 'find-error'
  | 'worked-example'

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
  format?: QuestionFormat
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

export type JourneyIslandIcon = 'compass' | 'network' | 'bridge' | 'agent' | 'quill' | 'lighthouse'

export type JourneyNodeKind =
  | 'recall'
  | 'distinguish'
  | 'application'
  | 'boss'
  | 'shortcut'
  | 'lighthouse'

export type JourneyNodeStatus =
  | 'locked'
  | 'available'
  | 'in-progress'
  | 'completed'
  | 'cooldown'
  | 'unavailable'

export type JourneyIslandStatus = 'locked' | 'available' | 'in-progress' | 'completed'

export interface JourneyPosition {
  /** Percentage of the full journey canvas, from 0 to 100. */
  x: number
  /** Percentage of the full journey canvas, from 0 to 100. */
  y: number
}

export interface JourneyQuestionQuery {
  chapterId: string
  difficulties: Difficulty[]
  stages?: LearningStage[]
  formats?: QuestionFormat[]
  limit: number
}

export interface JourneyUnlockRule {
  /** Every referenced node must be complete. */
  allOf?: string[]
  /** At least one referenced node must be complete. */
  anyOf?: string[]
}

export interface JourneyCompletionRule {
  /** Normalized 0..1 accuracy threshold. */
  minimumAccuracy: number
  maximumWrong?: number
  requiredQuestionCount?: number
}

export interface JourneyNodeDefinition {
  id: string
  islandId: string
  chapterId?: string
  title: string
  description: string
  kind: JourneyNodeKind
  order: number
  unlock: JourneyUnlockRule
  questionQuery?: JourneyQuestionQuery
  completion: JourneyCompletionRule
  rewardXp: number
  position: JourneyPosition
  /** Shortcut nodes replace this boss as an alternative island gate. */
  replacesNodeId?: string
  /** A shortcut can be attempted at most this many times per local day. */
  dailyAttemptLimit?: number
}

export interface JourneyIslandDefinition {
  id: string
  chapterId?: string
  title: string
  shortTitle: string
  description: string
  accent: string
  icon: JourneyIslandIcon
  order: number
  position: JourneyPosition
  /** Main progression nodes only; a shortcut is tracked separately. */
  nodeIds: string[]
  shortcutNodeId?: string
}

export interface JourneyNodeProgress {
  nodeId: string
  attempts: number
  bestAccuracy: number
  bestCorrect: number
  bestAnswered: number
  stars: 0 | 1 | 2 | 3
  completedAt?: string
  lastPlayedAt?: string
}

export interface JourneySessionResult {
  nodeId: string
  questionIds: string[]
  correct: number
  wrong: number
  answered: number
  /** Normalized 0..1; helpers also tolerate a legacy 0..100 value. */
  accuracy: number
  completedAt: string
}

export interface JourneyApplyResult {
  state: StudyState
  passed: boolean
  stars: 0 | 1 | 2 | 3
  firstCompletion: boolean
}

export interface JourneyNodeSnapshot extends JourneyNodeDefinition {
  status: JourneyNodeStatus
  questionIds: string[]
  progress?: JourneyNodeProgress
  completed: boolean
  hasFragileMastery: boolean
  lockReason?: string
}

export interface JourneyIslandSnapshot extends JourneyIslandDefinition {
  status: JourneyIslandStatus
  nodes: JourneyNodeSnapshot[]
  shortcut?: JourneyNodeSnapshot
  completedNodes: number
  totalNodes: number
  progressPercent: number
}

export interface JourneySnapshot {
  islands: JourneyIslandSnapshot[]
  nodes: JourneyNodeSnapshot[]
  recommendedNode?: JourneyNodeSnapshot
  totalStars: number
  completedNodes: number
  totalNodes: number
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
  version: 4
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
  journeyProgress: Record<string, JourneyNodeProgress>
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
  journeyNodeId?: string
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
