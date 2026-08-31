import { Award, Brain, Flame, ShieldCheck, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StudyState } from '../types'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  Icon: LucideIcon
  check: (state: StudyState) => boolean
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'first-step',
    title: '第一步',
    description: '完成第 1 道题',
    Icon: Sparkles,
    check: (state) => state.totalAnswered >= 1,
  },
  {
    id: 'ten-correct',
    title: '渐入佳境',
    description: '累计答对 10 道题',
    Icon: Target,
    check: (state) => state.totalCorrect >= 10,
  },
  {
    id: 'xp-100',
    title: '能量满格',
    description: '累计获得 100 XP',
    Icon: Award,
    check: (state) => state.xp >= 100,
  },
  {
    id: 'streak-3',
    title: '三日有恒',
    description: '连续学习 3 天',
    Icon: Flame,
    check: (state) => state.streakDays >= 3,
  },
  {
    id: 'mistake-master',
    title: '反脆弱',
    description: '彻底掌握 1 道错题',
    Icon: ShieldCheck,
    check: (state) => Object.values(state.wrongAnswers).some((item) => item.status === 'mastered'),
  },
  {
    id: 'fifty-answered',
    title: '深度学习者',
    description: '累计练习 50 道题',
    Icon: Brain,
    check: (state) => state.totalAnswered >= 50,
  },
]
