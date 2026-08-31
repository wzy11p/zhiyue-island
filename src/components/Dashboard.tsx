import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  LibraryBig,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { chapters, difficultyMeta } from '../data/chapters'
import { getRecentDays, toLocalDateKey } from '../services/dates'
import { getActiveMistakes, getQuestionProgress } from '../services/progress'
import type { Difficulty, Question, StudyState } from '../types'
import { ProgressRing } from './ProgressRing'

interface DashboardProps {
  state: StudyState
  questions: Question[]
  onStart: (chapterId: string | undefined, difficulty: Difficulty, hellCoachEnabled?: boolean) => void
  onReview: () => void
  onNavigatePath: () => void
  onNavigateCoach: () => void
  onNavigateImport: () => void
  onRefillHearts: () => void
}

export function Dashboard({
  state,
  questions,
  onStart,
  onReview,
  onNavigatePath,
  onNavigateCoach,
  onNavigateImport,
  onRefillHearts,
}: DashboardProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [hellCoachEnabled, setHellCoachEnabled] = useState(true)
  const today = toLocalDateKey()
  const todayAnswered = state.weeklyActivity[today] ?? 0
  const dailyPercent = Math.min(100, Math.round((todayAnswered / state.dailyGoal) * 100))
  const activeMistakes = getActiveMistakes(state)
  const recentDays = getRecentDays(7)
  const maxActivity = Math.max(state.dailyGoal, ...recentDays.map((day) => state.weeklyActivity[day.key] ?? 0), 1)
  const recommended = chapters.find((chapter) => {
    const progress = getQuestionProgress(questions, state.completedQuestionIds, chapter.id)
    return progress.total > 0 && progress.percent < 100
  }) ?? chapters.find((chapter) => questions.some((question) => question.chapterId === chapter.id))
  const recommendedProgress = recommended
    ? getQuestionProgress(questions, state.completedQuestionIds, recommended.id)
    : { complete: 0, total: 0, percent: 0 }
  const canPractice = state.hearts > 0

  return (
    <div className="page dashboard-page">
      <section className="page-intro dashboard-intro">
        <div>
          <span className="eyebrow">LEARNING HOME</span>
          <h1>今天，继续把知识<br />变成你的判断力。</h1>
          <p>短练习、及时反馈、重复巩固。一次只专注一个知识点。</p>
        </div>
        <div className="today-goal" aria-label={`今日已完成 ${todayAnswered} 道，共 ${state.dailyGoal} 道`}>
          <ProgressRing value={dailyPercent} size={96} stroke={9} label="今日" />
          <div>
            <span>今日目标</span>
            <strong>{Math.min(todayAnswered, state.dailyGoal)}<small> / {state.dailyGoal} 题</small></strong>
            <p>{dailyPercent >= 100 ? '目标已达成，做得很好。' : `再答 ${Math.max(0, state.dailyGoal - todayAnswered)} 题即可完成`}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="今日学习建议">
        <article className="continue-card">
          <div className="continue-card-copy">
            <div className="card-kicker"><span><Sparkles size={14} /></span> 为你推荐</div>
            {recommended ? (
              <>
                <p className="continue-meta">{recommended.eyebrow} · {recommendedProgress.complete}/{recommendedProgress.total} 已掌握</p>
                <h2>{recommended.title}</h2>
                <p>{recommended.description}</p>
                <div className="thin-progress" aria-label={`本章进度 ${recommendedProgress.percent}%`}>
                  <span style={{ width: `${recommendedProgress.percent}%` }} />
                </div>
                <button className="coach-entry-button" type="button" onClick={onNavigateCoach}>
                  <span><Bot size={20} aria-hidden="true" /></span>
                  <span><b>从零开始，跟 AI 私教聊着学</b><small>先讲概念，再根据你的回答追问和补救</small></span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                {canPractice ? (
                  <div className="dashboard-start-panel">
                    <fieldset className="difficulty-picker">
                      <legend>先选择本轮难度</legend>
                      <div role="radiogroup" aria-label="练习难度">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
                          <button
                            className={selectedDifficulty === difficulty ? `difficulty-choice is-selected is-${difficulty}` : `difficulty-choice is-${difficulty}`}
                            type="button"
                            role="radio"
                            aria-checked={selectedDifficulty === difficulty}
                            key={difficulty}
                            onClick={() => setSelectedDifficulty(difficulty)}
                          >
                            <strong>{difficultyMeta[difficulty].label}</strong>
                            <small>{difficultyMeta[difficulty].description.split('：')[0]}</small>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {selectedDifficulty === 'hard' && (
                      <label className="hell-coach-option">
                        <input
                          type="checkbox"
                          checked={hellCoachEnabled}
                          onChange={(event) => setHellCoachEnabled(event.target.checked)}
                        />
                        <span><b>开启毒舌教练</b><small>只批你的思路，不攻击你的人格；答题页可随时关闭。</small></span>
                      </label>
                    )}

                    <button
                      className="primary-button"
                      type="button"
                      disabled={!selectedDifficulty}
                      onClick={() => selectedDifficulty && onStart(recommended.id, selectedDifficulty, hellCoachEnabled)}
                    >
                      {selectedDifficulty ? `开始${difficultyMeta[selectedDifficulty].label}` : '请先选择难度'}
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button className="primary-button is-heart" type="button" onClick={onRefillHearts}>
                    <Heart size={18} fill="currentColor" aria-hidden="true" />
                    恢复爱心后继续
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="continue-meta">题库等待内容</p>
                <h2>导入你的第一份知识笔记</h2>
                <p>粘贴笔记内容或登记飞书链接，开始构建专属题库。</p>
                <button className="primary-button" type="button" onClick={onNavigateImport}>
                  前往导入中心 <ArrowRight size={18} />
                </button>
              </>
            )}
          </div>
          <div className="continue-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="visual-core"><Brain size={38} /></span>
            <span className="visual-chip chip-one"><Check size={15} /></span>
            <span className="visual-chip chip-two"><Target size={17} /></span>
          </div>
        </article>

        <article className="review-card">
          <div className="review-card-head">
            <span className="card-icon coral"><BookOpenCheck size={20} /></span>
            <span>{activeMistakes.length ? '等待你重新攻克' : '错题会自动来到这里'}</span>
          </div>
          <strong>{activeMistakes.length}<small> 道</small></strong>
          <h3>错题待复习</h3>
          <p>{activeMistakes.length ? '答对两次后，知识点将标记为已掌握。' : '当前没有待复习错题，保持住。'}</p>
          <button
            className="text-button"
            type="button"
            disabled={!activeMistakes.length}
            onClick={onReview}
          >
            开始错题复习 <ChevronRight size={16} />
          </button>
        </article>
      </section>

      <section className="lower-dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">THIS WEEK</span>
              <h2>本周学习节奏</h2>
            </div>
            <span className="soft-label"><Clock3 size={15} /> 稳定比突击更有效</span>
          </div>
          <div className="activity-chart" aria-label="最近七天答题数量">
            {recentDays.map((day) => {
              const amount = state.weeklyActivity[day.key] ?? 0
              const height = amount ? Math.max(16, (amount / maxActivity) * 100) : 5
              return (
                <div className="activity-day" key={day.key}>
                  <span className="activity-value">{amount || ''}</span>
                  <div className={day.key === today ? 'activity-bar is-today' : 'activity-bar'}>
                    <span style={{ height: `${height}%` }} />
                  </div>
                  <b>{day.label}</b>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel library-panel">
          <span className="card-icon green"><LibraryBig size={20} /></span>
          <h2>你的知识库</h2>
          <p><strong>{questions.length}</strong> 道题已收录，覆盖 {chapters.filter((chapter) => questions.some((q) => q.chapterId === chapter.id)).length} 个学习章节。</p>
          <button className="text-button" type="button" onClick={onNavigatePath}>
            查看全部章节 <ChevronRight size={16} />
          </button>
        </article>
      </section>
    </div>
  )
}
