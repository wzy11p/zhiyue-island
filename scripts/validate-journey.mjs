import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const moduleCache = new Map()

const resolveLocalModule = (specifier, importer) => {
  const base = path.resolve(path.dirname(importer), specifier)
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts')]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

const loadTypeScriptModule = (filename) => {
  const resolvedFile = path.resolve(filename)
  if (moduleCache.has(resolvedFile)) return moduleCache.get(resolvedFile).exports

  const source = fs.readFileSync(resolvedFile, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolvedFile,
  }).outputText

  const module = { exports: {} }
  moduleCache.set(resolvedFile, module)
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) return require(specifier)
    const localFile = resolveLocalModule(specifier, resolvedFile)
    if (!localFile) throw new Error(`无法解析 ${resolvedFile} 中的导入：${specifier}`)
    return loadTypeScriptModule(localFile)
  }

  Function('module', 'exports', 'require', '__filename', '__dirname', compiled)(
    module,
    module.exports,
    localRequire,
    resolvedFile,
    path.dirname(resolvedFile),
  )
  return module.exports
}

const { questions } = loadTypeScriptModule(path.join(projectRoot, 'src/data/questionBank.ts'))
const { journeyIslands, journeyNodes, getJourneyNode } = loadTypeScriptModule(
  path.join(projectRoot, 'src/data/journey.ts'),
)
const {
  applyJourneyResult,
  getJourneySnapshot,
  resolveJourneyQuestionIds,
} = loadTypeScriptModule(path.join(projectRoot, 'src/services/journey.ts'))

const errors = []
const notes = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const nodeIds = new Set(journeyNodes.map((node) => node.id))
const islandIds = new Set(journeyIslands.map((island) => island.id))
const mainIslands = journeyIslands.filter((island) => island.chapterId)
const shortcutNodes = journeyNodes.filter((node) => node.kind === 'shortcut')
const coreKinds = ['recall', 'distinguish', 'application', 'boss']

assert(journeyNodes.length === nodeIds.size, '关卡 ID 存在重复')
assert(journeyIslands.length === islandIds.size, '岛屿 ID 存在重复')
assert(mainIslands.length === 5, `主岛应为 5 座，当前为 ${mainIslands.length}`)
assert(
  mainIslands.map((island) => island.chapterId).join(',') === 'day-24,day-25,day-26,day-27,day-28',
  '五座主岛必须按 day-24 到 day-28 排列',
)
assert(journeyIslands.some((island) => island.id === 'lighthouse'), '缺少终点灯塔')
assert(shortcutNodes.length === 4, `后四岛应各有 1 个越级挑战，当前为 ${shortcutNodes.length}`)

for (const island of journeyIslands) {
  assert(
    island.position.x >= 0 && island.position.x <= 100
      && island.position.y >= 0 && island.position.y <= 100,
    `${island.id} 地图坐标必须在 0..100`,
  )
  for (const nodeId of island.nodeIds) {
    assert(nodeIds.has(nodeId), `${island.id} 引用了不存在的关卡 ${nodeId}`)
  }
  if (island.shortcutNodeId) {
    assert(nodeIds.has(island.shortcutNodeId), `${island.id} 引用了不存在的越级挑战`)
    assert(!island.nodeIds.includes(island.shortcutNodeId), `${island.id} 不应把 shortcut 重复计入主线进度`)
  }

  if (!island.chapterId) continue
  const coreNodes = island.nodeIds.map((nodeId) => getJourneyNode(nodeId)).filter(Boolean)
  assert(coreNodes.length === 4, `${island.id} 应恰好有 4 个主线关卡`)
  assert(
    coreNodes.map((node) => node.kind).join(',') === coreKinds.join(','),
    `${island.id} 的四关顺序必须为 recall/distinguish/application/boss`,
  )
}

for (const node of journeyNodes) {
  assert(islandIds.has(node.islandId), `${node.id} 引用了不存在的岛屿 ${node.islandId}`)
  assert(
    node.position.x >= 0 && node.position.x <= 100
      && node.position.y >= 0 && node.position.y <= 100,
    `${node.id} 地图坐标必须在 0..100`,
  )
  assert(
    node.completion.minimumAccuracy >= 0 && node.completion.minimumAccuracy <= 1,
    `${node.id} 的通关正确率必须在 0..1`,
  )
  for (const dependencyId of [...(node.unlock.allOf ?? []), ...(node.unlock.anyOf ?? [])]) {
    assert(nodeIds.has(dependencyId), `${node.id} 引用了不存在的前置关卡 ${dependencyId}`)
  }
}

const graph = new Map(journeyNodes.map((node) => [
  node.id,
  [...(node.unlock.allOf ?? []), ...(node.unlock.anyOf ?? [])],
]))
const visiting = new Set()
const visited = new Set()
const visit = (nodeId, trail = []) => {
  if (visiting.has(nodeId)) {
    errors.push(`关卡依赖存在环：${[...trail, nodeId].join(' -> ')}`)
    return
  }
  if (visited.has(nodeId)) return
  visiting.add(nodeId)
  for (const dependencyId of graph.get(nodeId) ?? []) visit(dependencyId, [...trail, nodeId])
  visiting.delete(nodeId)
  visited.add(nodeId)
}
journeyNodes.forEach((node) => visit(node.id))

const questionsById = new Map(questions.map((question) => [question.id, question]))
for (const node of journeyNodes.filter((item) => item.questionQuery)) {
  const resolved = resolveJourneyQuestionIds(node, questions, [])
  const query = node.questionQuery
  assert(resolved.length > 0, `${node.id} 解析出了空题池`)
  assert(resolved.length <= query.limit, `${node.id} 超过题量上限 ${query.limit}`)
  assert(
    resolved.length >= (node.completion.requiredQuestionCount ?? 1),
    `${node.id} 题池不足以达到最低作答数 ${node.completion.requiredQuestionCount ?? 1}`,
  )
  assert(
    resolved.every((questionId) => questionsById.get(questionId)?.chapterId === query.chapterId),
    `${node.id} fallback 混入了其他章节`,
  )
  assert(
    resolved.every((questionId) => query.difficulties.includes(questionsById.get(questionId)?.difficulty)),
    `${node.id} fallback 混入了其他难度`,
  )

  const strictCount = questions.filter((question) =>
    question.status !== 'draft'
      && question.chapterId === query.chapterId
      && query.difficulties.includes(question.difficulty)
      && (!query.stages?.length || query.stages.includes(question.stage))
      && (!query.formats?.length || query.formats.includes(question.format)),
  ).length
  if (strictCount < Math.min(query.limit, resolved.length)) {
    notes.push(`${node.id}: 严格题型 ${strictCount} 题，已用同章同难度补足到 ${resolved.length} 题`)
  }
}

const expectedShortcutIds = ['shortcut-day25', 'shortcut-day26', 'shortcut-day27', 'shortcut-day28']
for (const shortcutId of expectedShortcutIds) {
  const shortcut = getJourneyNode(shortcutId)
  assert(Boolean(shortcut), `缺少 ${shortcutId}`)
  if (!shortcut) continue
  const pool = resolveJourneyQuestionIds(shortcut, questions, [])
  assert(pool.length === 10, `${shortcutId} 必须解析出 10 道题，当前为 ${pool.length}`)
  assert(shortcut.completion.minimumAccuracy === 0.9, `${shortcutId} 必须要求 90% 正确率`)
  assert(shortcut.completion.maximumWrong === 1, `${shortcutId} 必须最多错 1 题`)
  assert(shortcut.completion.requiredQuestionCount === 10, `${shortcutId} 必须答满 10 题`)
  assert(shortcut.dailyAttemptLimit === 1, `${shortcutId} 必须每天最多尝试 1 次`)
  assert(Boolean(shortcut.replacesNodeId), `${shortcutId} 未声明替代的上一岛 Boss`)
}

const emptyState = {
  version: 4,
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
  journeyProgress: {},
}

const initialSnapshot = getJourneySnapshot(emptyState, questions, new Date('2030-01-01T00:00:00.000Z'))
assert(initialSnapshot.recommendedNode?.id === 'day24-recall', '首次推荐关应为 day24-recall')
assert(
  initialSnapshot.nodes.some((node) => node.status === 'available'),
  '空白学习状态下至少应有一个可用关卡',
)
assert(
  initialSnapshot.nodes.find((node) => node.id === 'day25-recall')?.status === 'locked',
  '未完成 day24 Boss 或 shortcut-day25 时不应解锁 day25',
)

const preShortcutState = {
  ...emptyState,
  journeyProgress: {
    'day24-application': {
      nodeId: 'day24-application',
      attempts: 1,
      bestAccuracy: 1,
      bestCorrect: 5,
      bestAnswered: 5,
      stars: 3,
      completedAt: '2029-12-31T08:00:00.000Z',
      lastPlayedAt: '2029-12-31T08:00:00.000Z',
    },
  },
}
const shortcutSnapshot = getJourneySnapshot(preShortcutState, questions, new Date('2030-01-01T00:00:00.000Z'))
assert(
  shortcutSnapshot.nodes.find((node) => node.id === 'shortcut-day25')?.status === 'available',
  '完成 day24 独立应用后应开放 shortcut-day25',
)

const shortcutPool = resolveJourneyQuestionIds(getJourneyNode('shortcut-day25'), questions, [])
const passedShortcut = applyJourneyResult(preShortcutState, {
  nodeId: 'shortcut-day25',
  questionIds: shortcutPool,
  correct: 9,
  wrong: 1,
  answered: 10,
  accuracy: 0.9,
  completedAt: '2030-01-01T08:00:00.000Z',
})
assert(passedShortcut.passed, 'shortcut 10 题答对 9 题、错 1 题应通关')
assert(passedShortcut.stars === 3, 'shortcut 通关应获得 3 星')
assert(passedShortcut.firstCompletion, '第一次通过 shortcut 应标记 firstCompletion')
assert(passedShortcut.state.xp === 120, '第一次通过 shortcut 应只增加一次节点奖励 XP')
const unlockedByShortcut = getJourneySnapshot(
  passedShortcut.state,
  questions,
  new Date('2030-01-01T09:00:00.000Z'),
)
assert(
  unlockedByShortcut.nodes.find((node) => node.id === 'day25-recall')?.status === 'available',
  'shortcut-day25 通过后应替代 day24 Boss 解锁 day25',
)

const failedShortcut = applyJourneyResult(preShortcutState, {
  nodeId: 'shortcut-day25',
  questionIds: shortcutPool,
  correct: 8,
  wrong: 2,
  answered: 10,
  accuracy: 0.8,
  completedAt: '2030-01-01T08:00:00.000Z',
})
const blockedSecondAttempt = applyJourneyResult(failedShortcut.state, {
  nodeId: 'shortcut-day25',
  questionIds: shortcutPool,
  correct: 10,
  wrong: 0,
  answered: 10,
  accuracy: 1,
  completedAt: '2030-01-01T09:00:00.000Z',
})
assert(!failedShortcut.passed, 'shortcut 错 2 题不应通关')
assert(!blockedSecondAttempt.passed, '同一天第二次 shortcut 结果必须被拒绝')
assert(
  blockedSecondAttempt.state.journeyProgress['shortcut-day25']?.attempts === 1,
  '同一天第二次 shortcut 不应增加尝试次数',
)

console.log('群岛结构：', {
  islands: journeyIslands.length,
  mainIslands: mainIslands.length,
  nodes: journeyNodes.length,
  shortcuts: shortcutNodes.length,
  firstRecommended: initialSnapshot.recommendedNode?.id,
})

if (notes.length) {
  console.log(`\n同章同难度 fallback（${notes.length}）：`)
  notes.forEach((note) => console.log(`- ${note}`))
}

if (errors.length) {
  console.error(`\n群岛校验失败（${errors.length}）：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('\n群岛数据、依赖、题池、越级规则与首次解锁校验通过。')
}
