import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { chapters } from '../data/chapters'
import { formatRelativeReview } from '../services/dates'
import { getActiveMistakes, getDueMistakes } from '../services/progress'
import type { Question, StudyState, WrongAnswerRecord } from '../types'
import { EmptyState } from './EmptyState'

interface MistakeNotebookProps {
  state: StudyState
  questions: Question[]
  onReview: (questionIds: string[]) => void
  onGoLearn: () => void
}

type Filter = 'active' | 'due' | 'mastered'

export function MistakeNotebook({ state, questions, onReview, onGoLearn }: MistakeNotebookProps) {
  const [filter, setFilter] = useState<Filter>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const active = getActiveMistakes(state)
  const due = getDueMistakes(state)
  const mastered = Object.values(state.wrongAnswers).filter((item) => item.status === 'mastered')
  const records = (filter === 'active' ? active : filter === 'due' ? due : mastered)
    .filter((record) => questionMap.has(record.questionId))
    .sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime())

  const reviewIds = (due.length ? due : active)
    .filter((record) => questionMap.has(record.questionId))
    .map((record) => record.questionId)

  return (
    <div className="page mistakes-page">
      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">MISTAKE NOTEBOOK</span>
          <h1>错题不是惩罚，是下一次答对的线索</h1>
          <p>系统会记录错误次数、误区与复习节奏；连续两次复习正确后标记为已掌握。</p>
        </div>
        <button className="primary-button" type="button" disabled={!reviewIds.length} onClick={() => onReview(reviewIds)}>
          <RotateCcw size={18} />
          {due.length ? `复习到期错题 (${due.length})` : `复习全部错题 (${active.length})`}
        </button>
      </section>

      <section className="mistake-overview" aria-label="错题概览">
        <div><span className="card-icon coral"><BookOpenCheck size={20} /></span><strong>{active.length}</strong><small>待掌握</small></div>
        <div><span className="card-icon yellow"><Clock3 size={20} /></span><strong>{due.length}</strong><small>现在应复习</small></div>
        <div><span className="card-icon green"><ShieldCheck size={20} /></span><strong>{mastered.length}</strong><small>已经攻克</small></div>
      </section>

      <div className="segmented-control" role="tablist" aria-label="错题筛选">
        <button role="tab" type="button" aria-selected={filter === 'active'} className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>待复习 {active.length}</button>
        <button role="tab" type="button" aria-selected={filter === 'due'} className={filter === 'due' ? 'is-active' : ''} onClick={() => setFilter('due')}>已到期 {due.length}</button>
        <button role="tab" type="button" aria-selected={filter === 'mastered'} className={filter === 'mastered' ? 'is-active' : ''} onClick={() => setFilter('mastered')}>已掌握 {mastered.length}</button>
      </div>

      {records.length ? (
        <section className="mistake-list" aria-label="错题列表">
          {records.map((record) => {
            const question = questionMap.get(record.questionId)!
            const chapter = chapters.find((item) => item.id === question.chapterId)
            const expanded = expandedId === question.id
            return (
              <MistakeCard
                key={record.questionId}
                record={record}
                question={question}
                chapterDay={chapter?.day}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : question.id)}
                onReview={() => onReview([question.id])}
              />
            )
          })}
        </section>
      ) : (
        <EmptyState
          Icon={filter === 'mastered' ? ShieldCheck : BookOpenCheck}
          title={filter === 'mastered' ? '还没有已掌握的错题' : filter === 'due' ? '今天没有到期错题' : '错题本还是空的'}
          description={filter === 'mastered' ? '错题复习连续答对两次，就会出现在这里。' : filter === 'due' ? '你可以提前复习全部待掌握题，或去学习新内容。' : '开始答题后，系统会自动记录并分析你的错误。'}
          actionLabel="去闯关"
          onAction={onGoLearn}
        />
      )}
    </div>
  )
}

function MistakeCard({
  record,
  question,
  chapterDay,
  expanded,
  onToggle,
  onReview,
}: {
  record: WrongAnswerRecord
  question: Question
  chapterDay?: number
  expanded: boolean
  onToggle: () => void
  onReview: () => void
}) {
  const selectedAnswer = record.lastSelectedAnswer ?? question.options[record.lastSelectedIndex] ?? '未记录'
  const correctAnswer = question.options[question.correctIndex] ?? '题目答案异常'

  return (
    <article className={record.status === 'mastered' ? 'mistake-card is-mastered' : 'mistake-card'}>
      <div className="mistake-card-main">
        <div className="mistake-card-meta">
          <span>{chapterDay ? `${chapterDay} 号笔记` : '导入知识'}</span>
          <i />
          <span>{question.knowledgePoint}</span>
          <i />
          <span>{record.attempts} 次错误</span>
        </div>
        <h2>{question.prompt}</h2>
        <div className="mistake-answer-row">
          <span className="answer-wrong">你的答案：{selectedAnswer}</span>
          <span className="answer-correct"><Check size={14} /> 正确答案：{correctAnswer}</span>
        </div>
        <div className="mistake-card-footer">
          <span className={record.status === 'mastered' ? 'review-status mastered' : 'review-status'}>
            {record.status === 'mastered' ? <><ShieldCheck size={14} /> 已掌握</> : <><Clock3 size={14} /> {formatRelativeReview(record.nextReviewAt)}</>}
          </span>
          <div>
            {record.status === 'active' && <button className="text-button" type="button" onClick={onReview}>单题复习 <ArrowRight size={15} /></button>}
            <button className="disclosure-button" type="button" onClick={onToggle} aria-expanded={expanded}>
              {expanded ? '收起解析' : '查看解析'} {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mistake-analysis">
          <div><span>错误点</span><p>{question.misconception ?? question.errorGuidance}</p></div>
          <div><span>判断依据</span><p>{question.explanation}</p></div>
          <div><span>下次这样想</span><p>{question.errorGuidance}</p></div>
        </div>
      )}
    </article>
  )
}
