import type { Chapter, Difficulty } from '../types'

export const chapters: Chapter[] = [
  {
    id: 'day-24',
    day: 24,
    eyebrow: 'DAY 01',
    title: '产品判断与职业认知',
    description: '从真实问题、行为成本与价值证据出发，建立 AI 产品人的判断坐标。',
    accent: '#70C997',
  },
  {
    id: 'day-25',
    day: 25,
    eyebrow: 'DAY 02',
    title: 'AI 基础、Transformer 与微调',
    description: '理解模型谱系、Transformer 组件、Token 生成以及 SFT / LoRA 的能力边界。',
    accent: '#79B8F3',
  },
  {
    id: 'day-26',
    day: 26,
    eyebrow: 'DAY 03',
    title: 'Prompt、MCP 与工具',
    description: '用清晰指令、安全的消息层级和标准化工具连接，提升任务可靠性。',
    accent: '#B39AE8',
  },
  {
    id: 'day-27',
    day: 27,
    eyebrow: 'DAY 04',
    title: '单 Agent 设计与验收',
    description: '围绕模型、指令、工具与运行循环，把单 Agent 做成可观测、可验收的系统。',
    accent: '#F1B56A',
  },
  {
    id: 'day-28',
    day: 28,
    eyebrow: 'DAY 05',
    title: 'AI 写作与 Skills',
    description: '把定位、素材、草稿、校审与发布串成流程，再将稳定做法沉淀为 Skill。',
    accent: '#F18582',
  },
]

export const difficultyMeta: Record<
  Difficulty,
  { label: string; shortLabel: string; description: string; xp: number }
> = {
  easy: { label: '简单', shortLabel: '简单', description: '概念基础：记住定义与核心事实', xp: 10 },
  medium: { label: '困难', shortLabel: '困难', description: '辨析应用：在相似说法中做判断', xp: 12 },
  hard: { label: '地狱', shortLabel: '地狱', description: '边界推理：处理条件、例外与取舍', xp: 15 },
}
