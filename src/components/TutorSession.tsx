import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  LockKeyhole,
  MessageCircleMore,
  RotateCcw,
  Send,
  Sparkles,
  Target,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { chapters } from '../data/chapters'
import { curriculumConcepts } from '../data/curriculum'
import { createTutorActivity, createTutorAdapter, tutorStageMeta, tutorStageOrder } from '../services/tutor'
import type {
  ConceptMasteryRecord,
  LearningConcept,
  LearningStage,
  StudyState,
  TutorActivity,
  TutorAttempt,
  TutorEvaluation,
} from '../types'

interface TutorSessionProps {
  state: StudyState
  onRecordAttempt: (conceptId: string, attempt: TutorAttempt) => void
}

interface TutorExchange {
  id: string
  activity: TutorActivity
  answer: string
  evaluation: TutorEvaluation
}

const masteryMeta: Record<ConceptMasteryRecord['status'], { label: string; className: string }> = {
  unseen: { label: '未开始', className: 'is-unseen' },
  acquiring: { label: '正在理解', className: 'is-acquiring' },
  guided: { label: '可跟做', className: 'is-guided' },
  independent: { label: '可独立', className: 'is-independent' },
  retained: { label: '已巩固', className: 'is-retained' },
  fragile: { label: '待修复', className: 'is-fragile' },
}

const verdictMeta: Record<TutorEvaluation['verdict'], { label: string; className: string }> = {
  correct: { label: '判断正确', className: 'is-correct' },
  partial: { label: '部分正确', className: 'is-partial' },
  misconception: { label: '发现混淆', className: 'is-wrong' },
  incorrect: { label: '还没掌握', className: 'is-wrong' },
}

const createId = (prefix: string) => {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${suffix}`
}

const getRecord = (state: StudyState, conceptId: string): ConceptMasteryRecord | undefined =>
  state.conceptMastery[conceptId]

const hasIndependentMastery = (record?: ConceptMasteryRecord) =>
  record?.status === 'independent' || record?.status === 'retained'

const isConceptUnlocked = (concept: LearningConcept, state: StudyState) =>
  concept.prerequisiteIds.every((id) => hasIndependentMastery(getRecord(state, id)))

const getSuggestedStage = (record?: ConceptMasteryRecord): LearningStage => {
  if (!record?.attempts.length) return 'diagnostic'
  if (record.status === 'fragile') return record.attempts.at(-1)?.stage ?? 'recall'
  const unfinished = tutorStageOrder.find((stage) =>
    !record.attempts.some((attempt) => attempt.stage === stage && attempt.verdict === 'correct'),
  )
  return unfinished ?? 'review'
}

const getChapterTitle = (chapterId: string) =>
  chapters.find((chapter) => chapter.id === chapterId)?.title ?? chapterId

export function TutorSession({ state, onRecordAttempt }: TutorSessionProps) {
  const concepts = curriculumConcepts
  const adapter = useMemo(() => createTutorAdapter(), [])
  const sessionId = useMemo(() => createId('tutor-session'), [])
  const firstUnlocked = concepts.find((concept) =>
    isConceptUnlocked(concept, state) && getRecord(state, concept.id)?.status !== 'retained',
  ) ?? concepts[0]
  const [selectedConceptId, setSelectedConceptId] = useState(firstUnlocked?.id ?? '')
  const concept = concepts.find((item) => item.id === selectedConceptId) ?? firstUnlocked
  const record = concept ? getRecord(state, concept.id) : undefined
  const [stage, setStage] = useState<LearningStage>(() => getSuggestedStage(record))
  const [variant, setVariant] = useState(0)
  const [lessonOpen, setLessonOpen] = useState(() => getSuggestedStage(record) !== 'diagnostic')
  const [answer, setAnswer] = useState('')
  const [confidence, setConfidence] = useState<TutorAttempt['confidence']>('fair')
  const [showHint, setShowHint] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchanges, setExchanges] = useState<TutorExchange[]>([])
  const [pendingEvaluation, setPendingEvaluation] = useState<TutorEvaluation | null>(null)
  const [activityOverride, setActivityOverride] = useState<TutorActivity | null>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)
  const lessonRef = useRef<HTMLElement>(null)
  const streamEndRef = useRef<HTMLDivElement>(null)
  const advanceTimer = useRef<number | null>(null)

  const activity = useMemo(
    () => activityOverride ?? (concept ? createTutorActivity(concept, stage, variant) : undefined),
    [activityOverride, concept, stage, variant],
  )

  const selectConcept = (next: LearningConcept) => {
    if (!isConceptUnlocked(next, state)) return
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    setSelectedConceptId(next.id)
    const nextStage = getSuggestedStage(getRecord(state, next.id))
    setStage(nextStage)
    setVariant(0)
    setLessonOpen(nextStage !== 'diagnostic')
    setAnswer('')
    setShowHint(false)
    setError(null)
    setExchanges([])
    setPendingEvaluation(null)
    setActivityOverride(null)
  }

  const advance = (nextActivity?: TutorEvaluation['nextActivity']) => {
    setPendingEvaluation(null)
    setAnswer('')
    setShowHint(false)
    setConfidence('fair')
    if (stage === 'diagnostic') {
      setActivityOverride(null)
      setStage('recall')
      setLessonOpen(true)
      return
    }
    if (nextActivity && nextActivity.conceptId === concept.id) {
      setStage(nextActivity.stage)
      setActivityOverride({
        ...nextActivity,
        expectedAnswer: '',
        acceptedSignals: [],
      })
      return
    }
    setActivityOverride(null)
    const index = tutorStageOrder.indexOf(stage)
    if (index >= 0 && index < tutorStageOrder.length - 1) {
      setStage(tutorStageOrder[index + 1])
      setVariant(0)
    } else if (stage === 'review') {
      setVariant((current) => current + 1)
    } else {
      setStage('review')
      setVariant(0)
    }
  }

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
  }, [])

  useEffect(() => {
    if (lessonOpen) {
      const lesson = lessonRef.current
      if (lesson) {
        window.scrollBy({ top: lesson.getBoundingClientRect().top - 88, behavior: 'smooth' })
      }
    } else if (exchanges.length > 0 || pendingEvaluation) {
      streamEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [exchanges, lessonOpen, pendingEvaluation, stage])

  useEffect(() => {
    if (!lessonOpen && !submitting && !pendingEvaluation) answerRef.current?.focus()
  }, [lessonOpen, pendingEvaluation, stage, submitting])

  if (!concept || !activity) {
    return <div className="panel tutor-empty">课程知识图谱正在准备中。</div>
  }

  const submit = async () => {
    if (submitting || pendingEvaluation || answer.trim().length < 2) return
    setSubmitting(true)
    setError(null)
    try {
      const evaluation = await adapter.evaluate({
        sessionId,
        activity,
        concept,
        answer: answer.trim(),
        confidence,
        usedHint: showHint,
        recentAttempts: record?.attempts.slice(-8) ?? [],
      })
      const attempt: TutorAttempt = {
        id: createId('attempt'),
        activityId: activity.id,
        stage,
        answer: answer.trim(),
        verdict: evaluation.verdict,
        usedHint: showHint,
        confidence,
        misconceptionId: evaluation.misconceptionId,
        answeredAt: new Date().toISOString(),
      }
      onRecordAttempt(concept.id, attempt)
      setExchanges((current) => [...current, {
        id: attempt.id,
        activity,
        answer: answer.trim(),
        evaluation,
      }])
      setPendingEvaluation(evaluation)

      if (stage === 'diagnostic') {
        advanceTimer.current = window.setTimeout(() => advance(), 700)
      } else if (evaluation.verdict === 'correct') {
        advanceTimer.current = window.setTimeout(() => advance(evaluation.nextActivity), 900)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这次连接没有完成，请重试。')
    } finally {
      setSubmitting(false)
    }
  }

  const remediate = () => {
    if (pendingEvaluation?.nextActivity && pendingEvaluation.nextActivity.conceptId === concept.id) {
      setStage(pendingEvaluation.nextActivity.stage)
      setActivityOverride({
        ...pendingEvaluation.nextActivity,
        expectedAnswer: '',
        acceptedSignals: [],
      })
      setPendingEvaluation(null)
      setAnswer('')
      setShowHint(true)
      return
    }
    const fallbackStage = stage === 'transfer' ? 'independent' : stage
    setStage(fallbackStage)
    setVariant((current) => current + 1)
    setActivityOverride(null)
    setPendingEvaluation(null)
    setAnswer('')
    setShowHint(true)
  }

  const status = masteryMeta[record?.status ?? 'unseen']
  const visibleStages: LearningStage[] = ['diagnostic', ...tutorStageOrder]
  const stageIndex = stage === 'review' ? visibleStages.length : Math.max(0, visibleStages.indexOf(stage))

  return (
    <div className="page tutor-page">
      <section className="tutor-heading">
        <div>
          <span className="eyebrow">ADAPTIVE TUTOR</span>
          <h1>和私教聊着学，不靠猜选项。</h1>
          <p>先讲清概念，再辨析、跟做、独立判断和迁移。答错时才展开针对性补救。</p>
        </div>
        <div className={adapter.mode === 'connected' ? 'tutor-mode is-connected' : 'tutor-mode'}>
          <span><Bot size={18} aria-hidden="true" /></span>
          <div>
            <strong>{adapter.mode === 'connected' ? '实时 Agent 已连接' : '本地课程教练'}</strong>
            <small>{adapter.mode === 'connected' ? '语义判定与动态追问' : '无后端也可练习，接口已预留'}</small>
          </div>
        </div>
      </section>

      <div className="tutor-layout">
        <aside className="tutor-course-rail" aria-label="知识点课程地图">
          <div className="tutor-rail-heading">
            <span><Target size={17} /></span>
            <div><strong>知识路线</strong><small>按先修关系解锁</small></div>
          </div>
          <div className="tutor-concept-list">
            {concepts.map((item, index) => {
              const unlocked = isConceptUnlocked(item, state)
              const itemRecord = getRecord(state, item.id)
              const itemStatus = masteryMeta[itemRecord?.status ?? 'unseen']
              return (
                <button
                  type="button"
                  className={item.id === concept.id ? 'tutor-concept is-active' : 'tutor-concept'}
                  key={item.id}
                  onClick={() => selectConcept(item)}
                  disabled={!unlocked}
                  aria-current={item.id === concept.id ? 'step' : undefined}
                >
                  <span className={`concept-order ${itemStatus.className}`}>
                    {!unlocked ? <LockKeyhole size={13} /> : itemRecord?.status === 'retained' ? <Check size={14} /> : index + 1}
                  </span>
                  <span className="concept-name"><b>{item.title}</b><small>{getChapterTitle(item.chapterId)} · {itemStatus.label}</small></span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </aside>

        <section className="tutor-workspace" aria-label="对话式学习">
          <header className="tutor-session-head">
            <div>
              <span className="tutor-chapter-label">{getChapterTitle(concept.chapterId)}</span>
              <h2>{concept.title}</h2>
            </div>
            <span className={`mastery-badge ${status.className}`}>{status.label}</span>
          </header>

          <div className="tutor-stage-track" aria-label={`当前阶段：${tutorStageMeta[stage].label}`}>
            {visibleStages.map((item, index) => (
              <span className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-current' : ''} key={item}>
                {index < stageIndex ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                <b>{tutorStageMeta[item].label}</b>
              </span>
            ))}
          </div>

          <div className="tutor-stream" aria-live="polite">
            <div className="tutor-message is-coach">
              <span className="tutor-avatar"><Sparkles size={18} /></span>
              <div className="tutor-bubble">
                <span className="message-label">学习私教</span>
                <p>这一关的目标是：{concept.objective}</p>
              </div>
            </div>

            {lessonOpen && (
              <article className="micro-lesson" ref={lessonRef}>
                <div className="micro-lesson-title">
                  <span><BookOpen size={18} /></span>
                  <div><small>60 秒微课</small><h3>先把「{concept.title}」讲清楚</h3></div>
                </div>
                <p className="lesson-definition">{concept.plainDefinition}</p>
                <p className="lesson-why"><b>为什么要学：</b>{concept.whyItMatters}</p>
                <ul>{concept.keyPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul>
                <div className="lesson-example"><b>看一个正例</b><p>{concept.example}</p></div>
                <div className="lesson-boundary"><b>别掉进这个坑</b><p>{concept.misconceptions[0]?.label ?? concept.counterexample}</p></div>
                <div className="lesson-sources">
                  <b>本节依据</b>
                  <div>{concept.sourceRefs.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</div>
                </div>
                <button className="primary-button" type="button" onClick={() => setLessonOpen(false)}>
                  关掉笔记，开始提取 <ArrowRight size={17} />
                </button>
              </article>
            )}

            {!lessonOpen && (
              <>
                {exchanges.map((exchange) => {
                  const verdict = verdictMeta[exchange.evaluation.verdict]
                  return (
                    <div className="tutor-exchange" key={exchange.id}>
                      <div className="tutor-message is-coach">
                        <span className="tutor-avatar"><Bot size={18} /></span>
                        <div className="tutor-bubble"><span className="message-label">{tutorStageMeta[exchange.activity.stage].label}</span>{exchange.activity.context && <p className="activity-context">{exchange.activity.context}</p>}<p>{exchange.activity.prompt}</p></div>
                      </div>
                      <div className="tutor-message is-user"><div className="tutor-bubble"><span className="message-label">你的回答</span><p>{exchange.answer}</p></div></div>
                      <div className={`tutor-feedback-summary ${verdict.className}`}>
                        {exchange.evaluation.verdict === 'correct' ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
                        <span>{exchange.evaluation.briefFeedback}</span>
                      </div>
                    </div>
                  )
                })}

                {!pendingEvaluation && (
                  <div className="tutor-message is-coach is-current-question">
                    <span className="tutor-avatar"><MessageCircleMore size={18} /></span>
                    <div className="tutor-bubble">
                      <span className="message-label">{tutorStageMeta[stage].label} · {tutorStageMeta[stage].description}</span>
                      {activity.context && <p className="activity-context">{activity.context}</p>}
                      <p>{activity.prompt}</p>
                    </div>
                  </div>
                )}

                {pendingEvaluation && pendingEvaluation.verdict !== 'correct' && (
                  <article className="tutor-remediation" tabIndex={-1}>
                    <div className="remediation-title">
                      <span><RotateCcw size={19} /></span>
                      <div><small>针对性补救</small><h3>{pendingEvaluation.briefFeedback}</h3></div>
                    </div>
                    <section><h4>先对照你的回答</h4><p>{pendingEvaluation.answerComparison}</p></section>
                    <section><h4>核心判断依据</h4>{pendingEvaluation.explanation.split('\n').map((line) => line && <p key={line}>{line}</p>)}</section>
                    <section className="remediation-next"><h4>下一步</h4><p>{pendingEvaluation.nextStep}</p></section>
                    <button className="primary-button" type="button" onClick={remediate}>
                      做一道最小补救题 <ArrowRight size={17} />
                    </button>
                  </article>
                )}
              </>
            )}
            <div ref={streamEndRef} />
          </div>

          {!lessonOpen && !pendingEvaluation && (
            <div className="tutor-composer">
              {showHint && <div className="tutor-hint"><Sparkles size={16} /><span><b>提示：</b>{activity.hint}</span></div>}
              <label htmlFor="tutor-answer">用你自己的话回答</label>
              <textarea
                id="tutor-answer"
                ref={answerRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit()
                }}
                placeholder="不用追求标准原文，把你真正的理解说出来……"
                rows={4}
                maxLength={2000}
                disabled={submitting}
              />
              {error && <div className="tutor-error" role="alert">{error}</div>}
              <div className="tutor-composer-actions">
                <div className="confidence-control">
                  <span>我的把握</span>
                  {([
                    ['unsure', '不确定'],
                    ['fair', '还可以'],
                    ['confident', '很确定'],
                  ] as const).map(([value, label]) => (
                    <button className={confidence === value ? 'is-selected' : ''} type="button" key={value} onClick={() => setConfidence(value)}>{label}</button>
                  ))}
                </div>
                <div className="composer-buttons">
                  <button className="text-button" type="button" onClick={() => setShowHint((current) => !current)}>{showHint ? '收起提示' : '给点提示'}</button>
                  <button className="primary-button" type="button" onClick={() => void submit()} disabled={submitting || answer.trim().length < 2}>
                    {submitting ? '正在判断……' : '发送回答'} <Send size={16} />
                  </button>
                </div>
              </div>
              <p className="composer-note">{adapter.mode === 'connected' ? '教练会根据语义与当前掌握证据判断。' : '当前使用本地关键信号判定；连接安全后端后可升级为实时语义 Agent。'} ⌘/Ctrl + Enter 发送</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
