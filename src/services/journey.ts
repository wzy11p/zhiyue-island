import { getJourneyNode, journeyIslands, journeyNodes } from '../data/journey'
import type {
  JourneyIslandSnapshot,
  JourneyApplyResult,
  JourneyNodeDefinition,
  JourneyNodeProgress,
  JourneyNodeSnapshot,
  JourneySessionResult,
  JourneySnapshot,
  Question,
  StudyState,
} from '../types'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const normalizeAccuracy = (value: number) =>
  clamp(Number.isFinite(value) ? (value > 1 ? value / 100 : value) : 0, 0, 1)

const stableHash = (value: string) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const localDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isPublishedQuestion = (question: Question) => question.status !== 'draft'

const stableQuestionOrder = (
  nodeId: string,
  completed: Set<string>,
) => (left: Question, right: Question) => {
  const completionDifference = Number(completed.has(left.id)) - Number(completed.has(right.id))
  if (completionDifference !== 0) return completionDifference
  return stableHash(`${nodeId}:${left.id}`) - stableHash(`${nodeId}:${right.id}`)
}

/**
 * Resolve a playable pool in two tiers:
 * 1. strict stage / format / difficulty match;
 * 2. same chapter and same requested difficulty, with stage / format relaxed;
 *
 * Within a tier, unseen questions are preferred but ordering stays stable for
 * the same completion set. Draft questions never enter a journey session. A
 * missing same-chapter/same-difficulty pool stays empty on purpose so the
 * journey validator catches bad content instead of silently mixing difficulty.
 */
export function resolveJourneyQuestionIds(
  node: JourneyNodeDefinition,
  questions: Question[],
  completedIds: string[] = [],
): string[] {
  const query = node.questionQuery
  if (!query) return []

  const completed = new Set(completedIds)
  const inChapter = questions.filter(
    (question) => isPublishedQuestion(question) && question.chapterId === query.chapterId,
  )
  const sameDifficulty = inChapter.filter((question) => query.difficulties.includes(question.difficulty))
  const strict = sameDifficulty.filter((question) => {
    const stageMatches = !query.stages?.length || Boolean(question.stage && query.stages.includes(question.stage))
    const formatMatches = !query.formats?.length || Boolean(question.format && query.formats.includes(question.format))
    return stageMatches && formatMatches
  })

  const orderedTiers = [strict, sameDifficulty]
  const unique = new Map<string, Question>()
  for (const tier of orderedTiers) {
    for (const question of [...tier].sort(stableQuestionOrder(node.id, completed))) {
      if (!unique.has(question.id)) unique.set(question.id, question)
    }
  }

  return [...unique.values()]
    .slice(0, Math.max(1, query.limit))
    .map((question) => question.id)
}

const meetsCompletionRule = (
  node: JourneyNodeDefinition,
  result: Pick<JourneySessionResult, 'questionIds' | 'correct' | 'wrong' | 'answered' | 'accuracy'>,
) => {
  const answered = Math.max(0, Math.floor(result.answered))
  const correct = clamp(Math.floor(result.correct), 0, answered)
  const wrong = clamp(Math.floor(result.wrong), 0, answered)
  const accuracy = answered > 0 ? correct / answered : normalizeAccuracy(result.accuracy)
  const enoughQuestions = !node.completion.requiredQuestionCount
    || answered >= node.completion.requiredQuestionCount
  const enoughUniqueQuestions = !node.completion.requiredQuestionCount
    || new Set(result.questionIds).size >= node.completion.requiredQuestionCount
  const withinWrongLimit = node.completion.maximumWrong === undefined
    || wrong <= node.completion.maximumWrong

  return enoughQuestions
    && enoughUniqueQuestions
    && withinWrongLimit
    && accuracy >= node.completion.minimumAccuracy
}

const starsForResult = (
  node: JourneyNodeDefinition,
  result: Pick<JourneySessionResult, 'questionIds' | 'correct' | 'wrong' | 'answered' | 'accuracy'>,
): 0 | 1 | 2 | 3 => {
  if (!meetsCompletionRule(node, result)) return 0
  if (node.kind === 'shortcut') return 3

  const accuracy = result.answered > 0
    ? clamp(result.correct / result.answered, 0, 1)
    : normalizeAccuracy(result.accuracy)
  if (accuracy >= 0.95 && result.wrong === 0) return 3
  if (accuracy >= Math.max(0.85, node.completion.minimumAccuracy + 0.1)) return 2
  return 1
}

const isSameLocalDay = (left?: string, right?: string) =>
  Boolean(left && right && localDateKey(left) === localDateKey(right))

/**
 * Persist one finished journey session. Replaying the same completion callback
 * is idempotent, and a shortcut silently rejects a second result on the same
 * local day so the UI cannot bypass its one-attempt gate.
 */
export function applyJourneyResult(
  state: StudyState,
  result: JourneySessionResult,
): JourneyApplyResult {
  const node = getJourneyNode(result.nodeId)
  if (!node) return { state, passed: false, stars: 0, firstCompletion: false }

  const progressMap = state.journeyProgress ?? {}
  const existing = progressMap[result.nodeId]
  if (existing?.lastPlayedAt === result.completedAt) {
    return {
      state,
      passed: Boolean(existing.completedAt),
      stars: existing.stars,
      firstCompletion: false,
    }
  }
  if (
    node.dailyAttemptLimit === 1
    && existing?.lastPlayedAt
    && isSameLocalDay(existing.lastPlayedAt, result.completedAt)
  ) {
    return { state, passed: false, stars: 0, firstCompletion: false }
  }

  const answered = Math.max(0, Math.floor(result.answered))
  const correct = clamp(Math.floor(result.correct), 0, answered)
  const wrong = Math.max(
    clamp(Math.floor(result.wrong), 0, answered),
    answered - correct,
  )
  const accuracy = answered > 0
    ? clamp(correct / answered, 0, 1)
    : normalizeAccuracy(result.accuracy)
  const normalizedResult = { ...result, answered, correct, wrong, accuracy }
  const passed = meetsCompletionRule(node, normalizedResult)
  const stars = starsForResult(node, normalizedResult)
  const firstCompletion = passed && !existing?.completedAt
  const nextProgress: JourneyNodeProgress = {
    nodeId: node.id,
    attempts: (existing?.attempts ?? 0) + 1,
    bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, accuracy),
    bestCorrect: Math.max(existing?.bestCorrect ?? 0, correct),
    bestAnswered: Math.max(existing?.bestAnswered ?? 0, answered),
    stars: Math.max(existing?.stars ?? 0, stars) as JourneyNodeProgress['stars'],
    completedAt: existing?.completedAt ?? (passed ? result.completedAt : undefined),
    lastPlayedAt: result.completedAt,
  }

  const nextState: StudyState = {
    ...state,
    xp: state.xp + (firstCompletion ? node.rewardXp : 0),
    journeyProgress: {
      ...progressMap,
      [node.id]: nextProgress,
    },
  }

  return { state: nextState, passed, stars, firstCompletion }
}

const nodeTitle = (nodeId: string) => getJourneyNode(nodeId)?.title ?? nodeId

const unlockSatisfied = (node: JourneyNodeDefinition, completedNodeIds: Set<string>) => {
  const allOf = node.unlock.allOf ?? []
  const anyOf = node.unlock.anyOf ?? []
  return allOf.every((nodeId) => completedNodeIds.has(nodeId))
    && (!anyOf.length || anyOf.some((nodeId) => completedNodeIds.has(nodeId)))
}

const getLockReason = (node: JourneyNodeDefinition, completedNodeIds: Set<string>) => {
  const missingAll = (node.unlock.allOf ?? []).filter((nodeId) => !completedNodeIds.has(nodeId))
  if (missingAll.length) return `完成「${nodeTitle(missingAll[0])}」后解锁`

  const anyOf = node.unlock.anyOf ?? []
  if (anyOf.length && !anyOf.some((nodeId) => completedNodeIds.has(nodeId))) {
    return `完成「${anyOf.map(nodeTitle).join('」或「')}」后解锁`
  }
  return undefined
}

const getLegacyQuestionCompletion = (
  node: JourneyNodeDefinition,
  questions: Question[],
  completedQuestionIds: Set<string>,
) => {
  if (node.kind === 'shortcut' || node.kind === 'lighthouse') return false
  const stablePool = resolveJourneyQuestionIds(node, questions)
  if (!stablePool.length) return false
  const completed = stablePool.filter((questionId) => completedQuestionIds.has(questionId)).length
  return completed / stablePool.length >= node.completion.minimumAccuracy
}

const hasFragileConcept = (
  questionIds: string[],
  questionsById: Map<string, Question>,
  state: StudyState,
) => questionIds.some((questionId) => {
  const conceptId = questionsById.get(questionId)?.conceptId
  return Boolean(conceptId && state.conceptMastery[conceptId]?.status === 'fragile')
})

const getIslandStatus = (
  nodes: JourneyNodeSnapshot[],
): JourneyIslandSnapshot['status'] => {
  if (nodes.length > 0 && nodes.every((node) => node.completed)) return 'completed'
  if (nodes.some((node) => node.completed || node.status === 'in-progress')) return 'in-progress'
  if (nodes.some((node) => node.status === 'available')) return 'available'
  return 'locked'
}

/**
 * Build the complete, render-ready journey view without mutating study state.
 * Unlocking is always derived; only durable completion evidence is persisted.
 */
export function getJourneySnapshot(
  state: StudyState,
  questions: Question[],
  now: Date = new Date(),
): JourneySnapshot {
  const progressMap = state.journeyProgress ?? {}
  const completedQuestions = new Set(state.completedQuestionIds)
  const questionsById = new Map(questions.map((question) => [question.id, question]))
  const completedNodeIds = new Set<string>()

  for (const node of journeyNodes) {
    if (progressMap[node.id]?.completedAt) completedNodeIds.add(node.id)
    else if (getLegacyQuestionCompletion(node, questions, completedQuestions)) completedNodeIds.add(node.id)
  }

  // The lighthouse is a terminal destination, not another quiz. Reaching it
  // completes it automatically once the final boss prerequisite is satisfied.
  const lighthouse = getJourneyNode('journey-lighthouse')
  if (lighthouse && unlockSatisfied(lighthouse, completedNodeIds)) {
    completedNodeIds.add(lighthouse.id)
  }

  const snapshots = journeyNodes.map<JourneyNodeSnapshot>((node) => {
    const progress = progressMap[node.id]
    const questionIds = resolveJourneyQuestionIds(node, questions, state.completedQuestionIds)
    const completed = completedNodeIds.has(node.id)
    const redundantShortcut = node.kind === 'shortcut'
      && Boolean(node.replacesNodeId && completedNodeIds.has(node.replacesNodeId))
      && !completed
    const unlocked = unlockSatisfied(node, completedNodeIds)
    const onCooldown = Boolean(
      !completed
      && node.dailyAttemptLimit
      && progress?.lastPlayedAt
      && localDateKey(progress.lastPlayedAt) === localDateKey(now),
    )

    let status: JourneyNodeSnapshot['status']
    let lockReason: string | undefined
    if (completed) status = 'completed'
    else if (redundantShortcut) {
      status = 'unavailable'
      lockReason = '已完成岛主挑战，无需再走越级航线'
    } else if (!unlocked) {
      status = 'locked'
      lockReason = getLockReason(node, completedNodeIds)
    } else if (node.questionQuery && !questionIds.length) {
      status = 'unavailable'
      lockReason = '本关题池尚未准备好'
    } else if (onCooldown) {
      status = 'cooldown'
      lockReason = '今日越级机会已使用，明天再来'
    } else if (progress?.attempts) status = 'in-progress'
    else status = 'available'

    return {
      ...node,
      status,
      questionIds,
      progress,
      completed,
      hasFragileMastery: hasFragileConcept(questionIds, questionsById, state),
      lockReason,
    }
  })

  const snapshotsById = new Map(snapshots.map((node) => [node.id, node]))
  const islands = journeyIslands.map<JourneyIslandSnapshot>((island) => {
    const nodes = island.nodeIds
      .map((nodeId) => snapshotsById.get(nodeId))
      .filter((node): node is JourneyNodeSnapshot => Boolean(node))
    const completedNodes = nodes.filter((node) => node.completed).length
    return {
      ...island,
      status: getIslandStatus(nodes),
      nodes,
      shortcut: island.shortcutNodeId ? snapshotsById.get(island.shortcutNodeId) : undefined,
      completedNodes,
      totalNodes: nodes.length,
      progressPercent: nodes.length ? Math.round((completedNodes / nodes.length) * 100) : 0,
    }
  })

  const recommendationCandidates = snapshots
    .filter((node) => node.status === 'available' || node.status === 'in-progress')
    .sort((left, right) => {
      const progressPriority = Number(right.status === 'in-progress') - Number(left.status === 'in-progress')
      if (progressPriority !== 0) return progressPriority
      const shortcutPriority = Number(left.kind === 'shortcut') - Number(right.kind === 'shortcut')
      if (shortcutPriority !== 0) return shortcutPriority
      return left.order - right.order
    })
  const countedNodes = snapshots.filter((node) => node.kind !== 'shortcut')

  return {
    islands,
    nodes: snapshots,
    recommendedNode: recommendationCandidates[0],
    totalStars: Object.values(progressMap).reduce((sum, progress) => sum + progress.stars, 0),
    completedNodes: countedNodes.filter((node) => node.completed).length,
    totalNodes: countedNodes.length,
  }
}
