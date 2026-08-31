import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  Flame,
  Heart,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { achievementDefinitions } from '../data/achievements'
import { chapters, difficultyMeta } from '../data/chapters'
import type { AnswerOutcome, Question, QuizSessionConfig, StudyState } from '../types'
import { Brand } from './Brand'
import { EmptyState } from './EmptyState'

interface QuizSessionProps {
  config: QuizSessionConfig
  questions: Question[]
  state: StudyState
  onAnswer: (question: Question, selectedIndex: number, mode: 'learn' | 'review') => AnswerOutcome
  onExit: () => void
  onRefillHearts: () => void
}

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']

const shuffle = <T,>(items: T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

export function QuizSession({
  config,
  questions,
  state,
  onAnswer,
  onExit,
  onRefillHearts,
}: QuizSessionProps) {
  const [sessionQuestions] = useState(() => {
    const requestedIds = config.questionIds ? new Set(config.questionIds) : undefined
    const completedIds = new Set(state.completedQuestionIds)
    const selectedDifficulty = config.difficulty ?? 'easy'
    const scoped = questions.filter((question) => {
      if (requestedIds) return requestedIds.has(question.id)
      return (
        (!config.chapterId || question.chapterId === config.chapterId) &&
        question.difficulty === selectedDifficulty
      )
    })
    const unseen = shuffle(scoped.filter((question) => !completedIds.has(question.id)))
    const seen = shuffle(scoped.filter((question) => completedIds.has(question.id)))
    return [...unseen, ...seen].slice(0, 10)
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null)
  const [finished, setFinished] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, xp: 0 })
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [hellCoachEnabled, setHellCoachEnabled] = useState(
    config.difficulty === 'hard' && config.hellCoachEnabled !== false,
  )
  const questionTitleRef = useRef<HTMLHeadingElement>(null)
  const wrongTitleRef = useRef<HTMLHeadingElement>(null)

  const currentQuestion = sessionQuestions[currentIndex]
  const chapter = chapters.find((item) => item.id === currentQuestion?.chapterId)
  const answeredCount = sessionStats.correct + sessionStats.wrong
  const accuracy = answeredCount ? Math.round((sessionStats.correct / answeredCount) * 100) : 0
  const isWrong = Boolean(outcome && !outcome.correct)
  const isHellSession = config.mode === 'learn' && config.difficulty === 'hard'
  const selectedMisconception = currentQuestion && selectedIndex !== null
    ? currentQuestion.misconceptionMap?.[selectedIndex]
      ?? currentQuestion.misconception
      ?? `你还没有划清「${currentQuestion.knowledgePoint}」的判断边界`
    : ''

  const hellCoachFeedback = useMemo(() => {
    if (!currentQuestion || selectedIndex === null) return ''
    const wrongAnswer = currentQuestion.options[selectedIndex]
    const cleanMisconception = selectedMisconception.replace(/[。！？!?]+$/, '')
    return `这次不是“差一点”，而是判断规则没站稳。你选了“${wrongAnswer}”，暴露的问题是：${cleanMisconception}。别靠语感再蒙一次——${currentQuestion.errorGuidance}`
  }, [currentQuestion, selectedIndex, selectedMisconception])

  const advance = () => {
    if (
      currentIndex >= sessionQuestions.length - 1 ||
      (outcome && outcome.heartsLeft === 0 && config.mode === 'learn')
    ) {
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setSelectedIndex(null)
    setOutcome(null)
  }

  useEffect(() => {
    if (!outcome?.correct) return
    const timer = window.setTimeout(advance, 720)
    return () => window.clearTimeout(timer)
    // `advance` intentionally tracks the current question state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, currentIndex])

  useEffect(() => {
    if (selectedIndex === null) questionTitleRef.current?.focus()
  }, [currentIndex, selectedIndex])

  useEffect(() => {
    if (!isWrong) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => wrongTitleRef.current?.focus(), reducedMotion ? 0 : 360)
    return () => window.clearTimeout(timer)
  }, [isWrong, currentIndex])

  const chooseOption = (index: number) => {
    if (!currentQuestion || outcome || index >= currentQuestion.options.length) return
    const result = onAnswer(currentQuestion, index, config.mode)
    setSelectedIndex(index)
    setOutcome(result)
    setSessionStats((current) => ({
      correct: current.correct + (result.correct ? 1 : 0),
      wrong: current.wrong + (result.correct ? 0 : 1),
      xp: current.xp + result.xpEarned,
    }))
    if (result.unlockedAchievementIds.length) {
      setUnlockedIds((current) => Array.from(new Set([...current, ...result.unlockedAchievementIds])))
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (finished) return
      const target = event.target
      const isFormControl = target instanceof HTMLButtonElement || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

      if (outcome && !outcome.correct && !isFormControl && (event.key === 'Enter' || event.code === 'Space')) {
        event.preventDefault()
        advance()
        return
      }
      if (outcome) return
      const index = Number(event.key) - 1
      if (index >= 0 && index < (currentQuestion?.options.length ?? 0)) chooseOption(index)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!sessionQuestions.length) {
    return (
      <div className="quiz-shell quiz-empty-shell">
        <div className="quiz-topbar"><Brand /><button className="icon-button" type="button" onClick={onExit} aria-label="退出答题"><X /></button></div>
        <EmptyState
          Icon={BookOpen}
          title={config.mode === 'review' ? '暂时没有可复习的错题' : `这一章还没有${difficultyMeta[config.difficulty ?? 'easy'].label}题`}
          description={config.mode === 'review' ? '继续学习新章节，错题会自动收录到这里。' : '当前难度不会混入其他档位的题目。请换一个难度，或先到导入中心补充知识。'}
          actionLabel="返回学习页"
          onAction={onExit}
        />
      </div>
    )
  }

  if (finished) {
    return (
      <div className="quiz-shell completion-shell">
        <div className="completion-card">
          <div className="completion-burst" aria-hidden="true">
            <span /><span /><span />
            <div><Sparkles size={42} /></div>
          </div>
          <span className="eyebrow">SESSION COMPLETE</span>
          <h1>{outcome?.heartsLeft === 0 && config.mode === 'learn' ? '先停一下，巩固再出发' : '这一轮完成了！'}</h1>
          <p>{config.mode === 'review' ? '每一次重新作答，都在把薄弱点变成长期记忆。' : '保持小步前进，你的知识网络正在变得更牢固。'}</p>

          <div className="completion-stats">
            <div><span className="stat-orb yellow"><Target size={20} /></span><strong>{accuracy}%</strong><small>正确率</small></div>
            <div><span className="stat-orb green"><Sparkles size={20} /></span><strong>+{sessionStats.xp}</strong><small>本轮 XP</small></div>
            <div><span className="stat-orb coral"><Heart size={20} /></span><strong>{outcome?.heartsLeft ?? state.hearts}</strong><small>剩余爱心</small></div>
          </div>

          {unlockedIds.length > 0 && (
            <div className="achievement-unlocked">
              <Sparkles size={18} />
              <span>解锁成就：{unlockedIds.map((id) => achievementDefinitions.find((item) => item.id === id)?.title).filter(Boolean).join('、')}</span>
            </div>
          )}

          <div className="completion-actions">
            {outcome?.heartsLeft === 0 && config.mode === 'learn' && (
              <button className="secondary-button" type="button" onClick={onRefillHearts}>
                <RotateCcw size={17} /> 恢复爱心
              </button>
            )}
            <button className="primary-button" type="button" onClick={onExit}>
              回到学习页 <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = Math.round(((currentIndex + (outcome ? 1 : 0)) / sessionQuestions.length) * 100)
  const selectedAnswer = selectedIndex === null ? '未记录' : currentQuestion.options[selectedIndex]
  const correctAnswer = currentQuestion.options[currentQuestion.correctIndex]

  return (
    <div className="quiz-shell">
      <header className="quiz-topbar">
        <Brand compact />
        <button className="quiz-close" type="button" onClick={onExit} aria-label="退出本轮练习">
          <X size={21} />
        </button>
        <div className="quiz-progress" aria-label={`答题进度 ${currentIndex + 1} / ${sessionQuestions.length}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="quiz-count"><b>{currentIndex + 1}</b> / {sessionQuestions.length}</span>
        <span className="quiz-heart"><Heart size={18} fill="currentColor" /> {config.mode === 'review' ? '复习' : state.hearts}</span>
      </header>

      <main className="quiz-main">
        {isHellSession && (
          <div className="hell-coach-control">
            <span><Flame size={16} fill="currentColor" /> 毒舌教练</span>
            <p>只批错误思路，不做人身攻击。</p>
            <button
              type="button"
              aria-pressed={hellCoachEnabled}
              onClick={() => setHellCoachEnabled((value) => !value)}
            >
              {hellCoachEnabled ? '已开启 · 点击关闭' : '已关闭 · 点击开启'}
            </button>
          </div>
        )}

      <div className={isWrong ? 'quiz-card-stage is-flipped' : 'quiz-card-stage'}>
          <div className="quiz-card-inner">
            <section className="quiz-card-face quiz-card-front" aria-hidden={isWrong}>
              <div className="question-context">
                <span>{config.mode === 'review' ? '错题复习' : difficultyMeta[currentQuestion.difficulty].label}</span>
                <i />
                <span>{currentQuestion.knowledgePoint}</span>
              </div>

              {config.mode === 'learn' && (
                <p className={sessionQuestions.length < 10 ? 'practice-scope-note is-short' : 'practice-scope-note'}>
                  {sessionQuestions.length < 10
                    ? `本章本档目前只有 ${sessionQuestions.length} 道题，本轮按实际题量练习，不会混入其他难度。`
                    : `本轮固定练习 10 道${difficultyMeta[config.difficulty ?? 'easy'].label}题，不跨难度混合。`}
                </p>
              )}

              <h1 ref={questionTitleRef} tabIndex={-1}>{currentQuestion.prompt}</h1>
              {currentQuestion.criticalNote && (
                <p className="critical-note"><CircleAlert size={16} /> {currentQuestion.criticalNote}</p>
              )}

              <div className="option-list" role="group" aria-label="答案选项">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedIndex === index
                  const className = [
                    'option-button',
                    outcome?.correct && isSelected ? 'is-correct' : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <button
                      className={className}
                      type="button"
                      key={`${currentQuestion.id}-${index}`}
                      disabled={Boolean(outcome)}
                      onClick={() => chooseOption(index)}
                      aria-pressed={isSelected}
                    >
                      <span className="option-letter">{optionLetters[index] ?? index + 1}</span>
                      <span className="option-copy">{option}</span>
                      <span className="option-shortcut">{outcome?.correct && isSelected ? <Check size={19} /> : index + 1}</span>
                    </button>
                  )
                })}
              </div>

              <p className="keyboard-hint">提示：可使用键盘数字 1–{Math.min(4, currentQuestion.options.length)} 快速选择</p>
            </section>

            {isWrong && (
              <section
                className="quiz-card-face quiz-card-back"
                aria-hidden={!isWrong}
                aria-labelledby="wrong-answer-title"
              >
                <header className="flip-feedback-heading">
                  <span className="feedback-icon"><Lightbulb size={24} /></span>
                  <div>
                    <span className="eyebrow">答错了 · 答案解析</span>
                    <h2 id="wrong-answer-title" ref={wrongTitleRef} tabIndex={-1}>先弄懂判断依据</h2>
                    <p>重点看解析和判断方法，原题只保留作对照。</p>
                  </div>
                </header>

                <div className="answer-review-question">
                  <span><BookOpen size={14} /> 题目回看</span>
                  <p>{currentQuestion.prompt}</p>
                </div>

                <div className="answer-comparison">
                  <div className="is-wrong">
                    <span>我的错误答案</span>
                    <strong>{selectedIndex === null ? '' : `${optionLetters[selectedIndex]}. `}{selectedAnswer}</strong>
                  </div>
                  <div className="is-correct">
                    <span>正确答案</span>
                    <strong>{optionLetters[currentQuestion.correctIndex]}. {correctAnswer}</strong>
                  </div>
                </div>

                <article className="answer-explanation-primary">
                  <header>
                    <span className="analysis-icon"><Lightbulb size={20} /></span>
                    <div>
                      <span>详细解析</span>
                      <h3>为什么正确答案成立</h3>
                    </div>
                  </header>
                  <p>{currentQuestion.explanation}</p>
                </article>

                <div className="answer-learning-grid">
                  <article className="is-misconception">
                    <header><CircleAlert size={18} /><span>你这个选项具体错在哪</span></header>
                    <p>{selectedMisconception || '当前选择混淆了相邻概念，需要重新确认判断条件。'}</p>
                  </article>
                  <article className="is-guidance">
                    <header><Target size={18} /><span>下次这样判断</span></header>
                    <p>{currentQuestion.errorGuidance}</p>
                  </article>
                </div>

                {isHellSession && hellCoachEnabled && (
                  <aside className="hell-coach-feedback">
                    <Flame size={20} fill="currentColor" aria-hidden="true" />
                    <div><strong>毒舌教练</strong><p>{hellCoachFeedback}</p></div>
                  </aside>
                )}

                <footer className="flip-feedback-footer">
                  <small><BookOpen size={14} /> 回看 {chapter ? `${chapter.day} 号笔记 · ` : ''}{currentQuestion.knowledgePoint}</small>
                  <button className="feedback-next" type="button" onClick={advance}>
                    {outcome?.heartsLeft === 0 && config.mode === 'learn' ? '查看本轮结果' : '我弄懂了，下一题'}
                    <ChevronRight size={19} />
                  </button>
                  <span>键盘按 Enter 或空格继续</span>
                </footer>
              </section>
            )}
          </div>
        </div>
      </main>

      <div className="answer-announcer sr-only" aria-live="assertive" aria-atomic="true">
        {outcome
          ? outcome.correct
            ? '回答正确，即将进入下一题'
            : `回答错误，题卡已翻到解析面。你的答案是 ${selectedAnswer}，正确答案是 ${correctAnswer}`
          : ''}
      </div>

      {outcome?.correct && (
        <aside className="correct-feedback" aria-hidden="true">
          <span><Check size={21} strokeWidth={3} /></span>
          <strong>正确</strong>
          <small>+{outcome.xpEarned} XP</small>
        </aside>
      )}
    </div>
  )
}
