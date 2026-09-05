import type {
  Difficulty,
  JourneyIslandDefinition,
  JourneyNodeDefinition,
  JourneyNodeKind,
  JourneyPosition,
  LearningStage,
  QuestionFormat,
} from '../types'

interface CoreNodeSeed {
  suffix: 'recall' | 'distinguish' | 'application' | 'boss'
  title: string
  description: string
  kind: JourneyNodeKind
  difficulties: Difficulty[]
  stages: LearningStage[]
  formats?: QuestionFormat[]
  limit: number
  requiredQuestionCount: number
  minimumAccuracy: number
  rewardXp: number
}

const coreNodeSeeds: CoreNodeSeed[] = [
  {
    suffix: 'recall',
    title: '概念基础',
    description: '先把本岛的关键词、定义和核心事实说清楚。',
    kind: 'recall',
    difficulties: ['easy'],
    stages: ['recall'],
    limit: 5,
    requiredQuestionCount: 3,
    minimumAccuracy: 0.6,
    rewardXp: 30,
  },
  {
    suffix: 'distinguish',
    title: '边界辨析',
    description: '在相似说法和常见误区之间划清判断边界。',
    kind: 'distinguish',
    difficulties: ['easy', 'medium'],
    stages: ['distinguish'],
    limit: 6,
    requiredQuestionCount: 4,
    minimumAccuracy: 0.7,
    rewardXp: 45,
  },
  {
    suffix: 'application',
    title: '独立应用',
    description: '脱离提示，把知识用于新的产品情境和决策。',
    kind: 'application',
    difficulties: ['medium'],
    stages: ['guided', 'independent'],
    limit: 6,
    requiredQuestionCount: 4,
    minimumAccuracy: 0.75,
    rewardXp: 60,
  },
  {
    suffix: 'boss',
    title: '岛主挑战',
    description: '处理反例、约束和取舍，证明你能迁移而不是背答案。',
    kind: 'boss',
    difficulties: ['hard'],
    stages: ['transfer'],
    formats: ['find-error'],
    limit: 5,
    requiredQuestionCount: 4,
    minimumAccuracy: 0.8,
    rewardXp: 100,
  },
]

const nodePositions: Record<string, JourneyPosition[]> = {
  'day-24': [
    { x: 13, y: 85 },
    { x: 16, y: 81 },
    { x: 20, y: 77 },
    { x: 23, y: 72 },
  ],
  'day-25': [
    { x: 17, y: 48 },
    { x: 20, y: 44 },
    { x: 24, y: 40 },
    { x: 28, y: 36 },
  ],
  'day-26': [
    { x: 47, y: 55 },
    { x: 51, y: 51 },
    { x: 55, y: 47 },
    { x: 59, y: 43 },
  ],
  'day-27': [
    { x: 51, y: 84 },
    { x: 55, y: 80 },
    { x: 59, y: 76 },
    { x: 63, y: 72 },
  ],
  'day-28': [
    { x: 73, y: 36 },
    { x: 77, y: 32 },
    { x: 81, y: 28 },
    { x: 85, y: 24 },
  ],
}

const chapterOrder = ['day-24', 'day-25', 'day-26', 'day-27', 'day-28'] as const

const createCoreNodes = (
  chapterId: (typeof chapterOrder)[number],
  chapterIndex: number,
): JourneyNodeDefinition[] => {
  const dayKey = chapterId.replace('-', '')
  const previousDayKey = chapterIndex > 0 ? chapterOrder[chapterIndex - 1].replace('-', '') : undefined

  return coreNodeSeeds.map((seed, index) => {
    const id = `${dayKey}-${seed.suffix}`
    const previousCoreId = index > 0 ? `${dayKey}-${coreNodeSeeds[index - 1].suffix}` : undefined
    const unlock = previousCoreId
      ? { allOf: [previousCoreId] }
      : previousDayKey
        ? { anyOf: [`${previousDayKey}-boss`, `shortcut-${chapterId.replace('-', '')}`] }
        : {}

    return {
      id,
      islandId: `island-${dayKey}`,
      chapterId,
      title: seed.title,
      description: seed.description,
      kind: seed.kind,
      order: chapterIndex * 10 + index + 1,
      unlock,
      questionQuery: {
        chapterId,
        difficulties: seed.difficulties,
        stages: seed.stages,
        formats: seed.formats,
        limit: seed.limit,
      },
      completion: {
        minimumAccuracy: seed.minimumAccuracy,
        maximumWrong: seed.kind === 'boss' ? 1 : undefined,
        requiredQuestionCount: seed.requiredQuestionCount,
      },
      rewardXp: seed.rewardXp,
      position: nodePositions[chapterId][index],
    }
  })
}

const coreNodes = chapterOrder.flatMap(createCoreNodes)

const shortcutSeeds = [
  { target: 'day-25', source: 'day-24', position: { x: 82, y: 73 }, order: 9 },
  { target: 'day-26', source: 'day-25', position: { x: 86, y: 70 }, order: 19 },
  { target: 'day-27', source: 'day-26', position: { x: 90, y: 67 }, order: 29 },
  { target: 'day-28', source: 'day-27', position: { x: 86, y: 63 }, order: 39 },
] as const

const shortcutNodes: JourneyNodeDefinition[] = shortcutSeeds.map(({ target, source, position, order }) => ({
  id: `shortcut-${target.replace('-', '')}`,
  islandId: `island-${target.replace('-', '')}`,
  chapterId: source,
  title: '风暴越级挑战',
  description: '抽测目标岛的上一岛先修知识，可替代那座岛的岛主挑战；每天只有一次出航机会。',
  kind: 'shortcut',
  order,
  unlock: { allOf: [`${source.replace('-', '')}-application`] },
  questionQuery: {
    chapterId: source,
    difficulties: ['easy', 'medium', 'hard'],
    stages: ['recall', 'distinguish', 'guided', 'independent', 'transfer'],
    limit: 10,
  },
  completion: {
    minimumAccuracy: 0.9,
    maximumWrong: 1,
    requiredQuestionCount: 10,
  },
  rewardXp: 120,
  position,
  replacesNodeId: `${source.replace('-', '')}-boss`,
  dailyAttemptLimit: 1,
}))

const lighthouseNode: JourneyNodeDefinition = {
  id: 'journey-lighthouse',
  islandId: 'lighthouse',
  title: '终点灯塔',
  description: '五座知识岛已经连成航线。灯塔点亮，代表本轮主线完成。',
  kind: 'lighthouse',
  order: 99,
  unlock: { allOf: ['day28-boss'] },
  completion: { minimumAccuracy: 1 },
  rewardXp: 0,
  position: { x: 48, y: 16 },
}

export const journeyNodes: JourneyNodeDefinition[] = [
  ...coreNodes,
  ...shortcutNodes,
  lighthouseNode,
].sort((a, b) => a.order - b.order)

export const journeyIslands: JourneyIslandDefinition[] = [
  {
    id: 'island-day24',
    chapterId: 'day-24',
    title: '判断启航岛',
    shortTitle: '产品判断',
    description: '从真实问题、行为证据与能力边界出发，建立 AI 产品人的判断坐标。',
    accent: '#5FAF83',
    icon: 'compass',
    order: 1,
    position: { x: 18, y: 79 },
    nodeIds: ['day24-recall', 'day24-distinguish', 'day24-application', 'day24-boss'],
  },
  {
    id: 'island-day25',
    chapterId: 'day-25',
    title: '模型原理岛',
    shortTitle: '模型原理',
    description: '理解 Transformer、Token 预测、参数与微调，不再用模糊比喻代替原理。',
    accent: '#5A9ED6',
    icon: 'network',
    order: 2,
    position: { x: 22, y: 42 },
    nodeIds: ['day25-recall', 'day25-distinguish', 'day25-application', 'day25-boss'],
    shortcutNodeId: 'shortcut-day25',
  },
  {
    id: 'island-day26',
    chapterId: 'day-26',
    title: '工具连接岛',
    shortTitle: 'Prompt 与 MCP',
    description: '把指令、检索、工具连接与安全层级组合成可靠的任务接口。',
    accent: '#967CCE',
    icon: 'bridge',
    order: 3,
    position: { x: 53, y: 49 },
    nodeIds: ['day26-recall', 'day26-distinguish', 'day26-application', 'day26-boss'],
    shortcutNodeId: 'shortcut-day26',
  },
  {
    id: 'island-day27',
    chapterId: 'day-27',
    title: 'Agent 驾驶岛',
    shortTitle: 'Agent 系统',
    description: '设计有状态、有终止条件、有观测证据的单 Agent 运行循环。',
    accent: '#D49B50',
    icon: 'agent',
    order: 4,
    position: { x: 57, y: 78 },
    nodeIds: ['day27-recall', 'day27-distinguish', 'day27-application', 'day27-boss'],
    shortcutNodeId: 'shortcut-day27',
  },
  {
    id: 'island-day28',
    chapterId: 'day-28',
    title: '创作发布岛',
    shortTitle: '写作与 Skills',
    description: '把内容生成、人工校审、合规发布和可复用 Skill 串成稳定流程。',
    accent: '#D96E69',
    icon: 'quill',
    order: 5,
    position: { x: 80, y: 30 },
    nodeIds: ['day28-recall', 'day28-distinguish', 'day28-application', 'day28-boss'],
    shortcutNodeId: 'shortcut-day28',
  },
  {
    id: 'lighthouse',
    title: '终点灯塔',
    shortTitle: '灯塔',
    description: '完成五岛主线后点亮，作为下一轮复习和扩展知识的出发点。',
    accent: '#F0C84A',
    icon: 'lighthouse',
    order: 6,
    position: { x: 48, y: 16 },
    nodeIds: ['journey-lighthouse'],
  },
]

const journeyNodeIndex = new Map(journeyNodes.map((node) => [node.id, node]))

export const getJourneyNode = (nodeId: string): JourneyNodeDefinition | undefined =>
  journeyNodeIndex.get(nodeId)
