import { Award, BarChart3, Brain, CheckCircle2, Flame, RotateCcw, Sparkles, Target } from 'lucide-react'
import { achievementDefinitions } from '../data/achievements'
import { chapters } from '../data/chapters'
import { getRecentDays } from '../services/dates'
import { getAccuracy, getLevel, getLevelProgress, getQuestionProgress } from '../services/progress'
import type { Question, StudyState } from '../types'
import { ProgressRing } from './ProgressRing'

interface ProgressReportProps {
  state: StudyState
  questions: Question[]
  onReset: () => void
}

export function ProgressReport({ state, questions, onReset }: ProgressReportProps) {
  const overall = getQuestionProgress(questions, state.completedQuestionIds)
  const level = getLevel(state.xp)
  const levelProgress = getLevelProgress(state.xp)
  const accuracy = getAccuracy(state)
  const recentDays = getRecentDays(7)
  const unlocked = new Set(state.achievements.map((item) => item.id))

  const confirmReset = () => {
    if (window.confirm('确定清空本设备上的学习进度吗？XP、错题、导入记录和记忆卡复习阶段无法恢复；静态题库与自建卡片会保留。')) {
      onReset()
    }
  }

  return (
    <div className="page progress-page">
      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">LEARNING REPORT</span>
          <h1>看见进步，也看见下一步</h1>
          <p>数据只服务于调整学习节奏，不把一次答错定义成失败。</p>
        </div>
        <div className="level-badge"><span>LV.</span><strong>{level}</strong><small>{levelProgress} / 200 XP</small></div>
      </section>

      <section className="report-summary">
        <article className="mastery-card">
          <ProgressRing value={overall.percent} size={126} stroke={11} label="总掌握度" />
          <div>
            <span className="eyebrow">KNOWLEDGE MASTERY</span>
            <h2>{overall.complete} / {overall.total} 道题已掌握</h2>
            <p>掌握度按至少答对一次计算；错题仍需完成两次间隔复习。</p>
          </div>
        </article>
        <div className="metric-grid">
          <article><span className="metric-icon green"><Target size={20} /></span><strong>{accuracy}%</strong><small>累计正确率</small></article>
          <article><span className="metric-icon purple"><Brain size={20} /></span><strong>{state.totalAnswered}</strong><small>累计答题</small></article>
          <article><span className="metric-icon orange"><Flame size={20} /></span><strong>{state.longestStreak}</strong><small>最长连续天数</small></article>
          <article><span className="metric-icon blue"><Sparkles size={20} /></span><strong>{state.xp}</strong><small>累计 XP</small></article>
        </div>
      </section>

      <section className="report-columns">
        <article className="panel chapter-report">
          <div className="panel-heading">
            <div><span className="eyebrow">BY CHAPTER</span><h2>章节掌握度</h2></div>
            <BarChart3 size={20} />
          </div>
          <div className="chapter-report-list">
            {chapters.map((chapter) => {
              const progress = getQuestionProgress(questions, state.completedQuestionIds, chapter.id)
              return (
                <div className="chapter-report-row" key={chapter.id}>
                  <span className="chapter-report-day" style={{ background: chapter.accent }}>{chapter.day}</span>
                  <div>
                    <p><strong>{chapter.title}</strong><span>{progress.complete}/{progress.total}</span></p>
                    <div className="thin-progress"><span style={{ width: `${progress.percent}%`, background: chapter.accent }} /></div>
                  </div>
                  <b>{progress.percent}%</b>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel rhythm-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">CONSISTENCY</span><h2>近 7 天活跃</h2></div>
            <Flame size={20} />
          </div>
          <div className="study-dots" aria-label="最近七天是否学习">
            {recentDays.map((day) => {
              const amount = state.weeklyActivity[day.key] ?? 0
              return <div key={day.key} className={amount ? 'study-dot is-active' : 'study-dot'}><span>{amount ? <CheckCircle2 size={20} /> : day.label}</span><small>{day.shortDate}</small></div>
            })}
          </div>
          <p className="rhythm-note">连续学习 <strong>{state.streakDays}</strong> 天。每天 10 道，比偶尔刷 100 道更容易形成长期记忆。</p>
        </article>
      </section>

      <section className="panel achievements-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">ACHIEVEMENTS</span><h2>学习成就</h2></div>
          <span className="soft-label"><Award size={15} /> {unlocked.size}/{achievementDefinitions.length} 已解锁</span>
        </div>
        <div className="achievement-grid">
          {achievementDefinitions.map(({ id, title, description, Icon }) => {
            const isUnlocked = unlocked.has(id)
            return (
              <div className={isUnlocked ? 'achievement-item is-unlocked' : 'achievement-item'} key={id}>
                <span><Icon size={22} /></span>
                <div><strong>{title}</strong><small>{description}</small></div>
                {isUnlocked && <CheckCircle2 size={18} />}
              </div>
            )
          })}
        </div>
      </section>

      <div className="data-control">
        <p>学习数据仅保存在当前浏览器中；清空进度不会删除自建卡片。</p>
        <button type="button" onClick={confirmReset}><RotateCcw size={15} /> 清空本机进度</button>
      </div>
    </div>
  )
}
