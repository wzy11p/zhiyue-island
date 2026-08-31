import {
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers3,
  Plus,
  RotateCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FlashcardDraft, Question, StudyState } from '../types'

type FlashcardFilter = 'due' | 'all' | 'builtin' | 'custom'

interface FlashcardView {
  id: string
  source: 'builtin' | 'custom'
  question: string
  answer: string
  explanation?: string
  options?: string[]
  correctIndex?: number
  tags: string[]
}

interface FlashcardCenterProps {
  state: StudyState
  questions: Question[]
  onAdd: (draft: FlashcardDraft) => string
  onUpdate: (id: string, draft: FlashcardDraft) => void
  onDelete: (id: string) => void
  onReview: (cardId: string, remembered: boolean) => void
}

const intervals = [1, 3, 7, 14]

const filterLabels: Array<{ id: FlashcardFilter; label: string }> = [
  { id: 'due', label: '今日待复习' },
  { id: 'all', label: '全部' },
  { id: 'builtin', label: '内置' },
  { id: 'custom', label: '自建' },
]

const formatDate = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '待安排'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date)
}

const tagsFromQuestion = (question: Question) => Array.from(new Set([
  `Day ${question.sourceDay ?? question.chapterId.replace('day-', '')}`,
  question.knowledgePoint,
  ...(question.tags ?? []),
])).filter(Boolean)

export function FlashcardCenter({
  state,
  questions,
  onAdd,
  onUpdate,
  onDelete,
  onReview,
}: FlashcardCenterProps) {
  const [filter, setFilter] = useState<FlashcardFilter>('due')
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [myAnswer, setMyAnswer] = useState('')
  const [notice, setNotice] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formQuestion, setFormQuestion] = useState('')
  const [formAnswer, setFormAnswer] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formError, setFormError] = useState('')
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)
  const answerInputRef = useRef<HTMLTextAreaElement>(null)
  const backHeadingRef = useRef<HTMLHeadingElement>(null)

  const builtinCards = useMemo<FlashcardView[]>(() => questions.map((question) => ({
    id: `builtin:${question.id}`,
    source: 'builtin',
    question: question.prompt,
    answer: `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`,
    explanation: question.explanation,
    options: question.options,
    correctIndex: question.correctIndex,
    tags: tagsFromQuestion(question),
  })), [questions])

  const customCards = useMemo<FlashcardView[]>(() => state.customFlashcards.map((card) => ({
    id: card.id,
    source: 'custom',
    question: card.question,
    answer: card.answer,
    tags: card.tags,
  })), [state.customFlashcards])

  const allCards = useMemo(() => [...builtinCards, ...customCards], [builtinCards, customCards])
  const endOfToday = useMemo(() => {
    const date = new Date()
    date.setHours(23, 59, 59, 999)
    return date.getTime()
  }, [])
  const isDue = (cardId: string) => {
    const record = state.flashcardReviews[cardId]
    return !record || new Date(record.nextReviewAt).getTime() <= endOfToday
  }
  const dueCount = allCards.filter((card) => isDue(card.id)).length
  const reviewedCount = Object.keys(state.flashcardReviews).filter((cardId) => allCards.some((card) => card.id === cardId)).length

  const filteredCards = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-CN')
    return allCards.filter((card) => {
      const matchesFilter = filter === 'all'
        || (filter === 'due' && isDue(card.id))
        || (filter === 'builtin' && card.source === 'builtin')
        || (filter === 'custom' && card.source === 'custom')
      if (!matchesFilter) return false
      if (!query) return true
      return [card.question, card.answer, card.explanation ?? '', ...card.tags]
        .some((value) => value.toLocaleLowerCase('zh-CN').includes(query))
    })
  // isDue only reads state.flashcardReviews, included explicitly to refresh the queue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCards, filter, search, state.flashcardReviews, endOfToday])

  const activeCard = filteredCards[activeIndex]
  const activeRecord = activeCard ? state.flashcardReviews[activeCard.id] : undefined

  useEffect(() => {
    setActiveIndex(0)
    setIsFlipped(false)
    setMyAnswer('')
  }, [filter, search])

  useEffect(() => {
    if (activeIndex >= filteredCards.length) setActiveIndex(Math.max(0, filteredCards.length - 1))
  }, [activeIndex, filteredCards.length])

  useEffect(() => {
    setIsFlipped(false)
    setMyAnswer('')
  }, [activeCard?.id])

  const moveCard = (direction: -1 | 1) => {
    if (filteredCards.length < 2) return
    setActiveIndex((current) => (current + direction + filteredCards.length) % filteredCards.length)
    setIsFlipped(false)
    setMyAnswer('')
  }

  const flipCard = () => {
    if (!activeCard || isFlipped) return
    setIsFlipped(true)
    window.requestAnimationFrame(() => backHeadingRef.current?.focus())
  }

  const rateCard = (remembered: boolean) => {
    if (!activeCard) return
    const nextStep = remembered
      ? Math.min((activeRecord?.successfulSteps ?? 0) + 1, intervals.length)
      : 0
    const interval = remembered ? intervals[Math.max(0, nextStep - 1)] : intervals[0]
    onReview(activeCard.id, remembered)
    setNotice(remembered
      ? `已记录“记住了”，${interval} 天后再见。`
      : `已重置记忆阶段，${interval} 天后再复习。`)
    setIsFlipped(false)
    setMyAnswer('')
    if (filter !== 'due' && filteredCards.length > 1) {
      setActiveIndex((current) => (current + 1) % filteredCards.length)
    }
    window.requestAnimationFrame(() => answerInputRef.current?.focus())
  }

  const handleDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const isWriting = target.matches('input, textarea, select')

    if (!isFlipped && event.ctrlKey && event.key === 'Enter') {
      event.preventDefault()
      flipCard()
      return
    }
    if (isWriting) return
    if (isFlipped && event.key === '1') {
      event.preventDefault()
      rateCard(false)
    } else if (isFlipped && event.key === '2') {
      event.preventDefault()
      rateCard(true)
    } else if (!isFlipped && event.key === 'ArrowLeft') {
      event.preventDefault()
      moveCard(-1)
    } else if (!isFlipped && event.key === 'ArrowRight') {
      event.preventDefault()
      moveCard(1)
    }
  }

  const resetEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setFormQuestion('')
    setFormAnswer('')
    setFormTags('')
    setFormError('')
  }

  const startNewCard = () => {
    setEditingId(null)
    setFormQuestion('')
    setFormAnswer('')
    setFormTags('')
    setFormError('')
    setEditorOpen(true)
  }

  const startEditCard = (id: string) => {
    const card = state.customFlashcards.find((item) => item.id === id)
    if (!card) return
    setEditingId(id)
    setFormQuestion(card.question)
    setFormAnswer(card.answer)
    setFormTags(card.tags.join(', '))
    setFormError('')
    setEditorOpen(true)
  }

  const submitCard = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formQuestion.trim() || !formAnswer.trim()) {
      setFormError('问题和答案都需要填写。')
      return
    }
    const draft: FlashcardDraft = {
      question: formQuestion,
      answer: formAnswer,
      tags: formTags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
    }
    if (editingId) {
      onUpdate(editingId, draft)
      setNotice('自建卡片已更新。')
    } else {
      onAdd(draft)
      setNotice('新卡片已加入自建卡组。')
    }
    resetEditor()
  }

  const confirmDelete = (id: string) => {
    onDelete(id)
    setDeletePendingId(null)
    if (editingId === id) resetEditor()
    setNotice('卡片已删除。')
  }

  const filterCount = (id: FlashcardFilter) => {
    if (id === 'due') return dueCount
    if (id === 'builtin') return builtinCards.length
    if (id === 'custom') return customCards.length
    return allCards.length
  }

  return (
    <div className="page flashcard-page">
      <section className="page-heading split-heading flashcard-heading">
        <div>
          <span className="eyebrow">MEMORY CARDS</span>
          <h1>先回忆，再翻面。</h1>
          <p>题库自动变成 {builtinCards.length} 张记忆卡。先写下自己的回答，再对照标准答案与解析，用自评驱动下一次复习。</p>
        </div>
        <button className="primary-button" type="button" onClick={startNewCard}>
          <Plus size={18} aria-hidden="true" />新建卡片
        </button>
      </section>

      <section className="flashcard-metrics" aria-label="记忆卡概览">
        <article><span className="metric-icon coral"><CalendarClock size={20} /></span><div><strong>{dueCount}</strong><small>今日待复习</small></div></article>
        <article><span className="metric-icon green"><Layers3 size={20} /></span><div><strong>{allCards.length}</strong><small>卡片总数</small></div></article>
        <article><span className="metric-icon purple"><BrainCircuit size={20} /></span><div><strong>{reviewedCount}</strong><small>已开始记忆</small></div></article>
        <article><span className="metric-icon blue"><Plus size={20} /></span><div><strong>{customCards.length}</strong><small>自建卡片</small></div></article>
      </section>

      {notice && <div className="flashcard-notice" role="status"><Check size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="关闭提示"><X size={15} /></button></div>}

      <section className="panel flashcard-toolbar" aria-label="卡组筛选">
        <div className="flashcard-filter-group" role="group" aria-label="筛选卡片">
          {filterLabels.map((item) => (
            <button
              type="button"
              key={item.id}
              className={filter === item.id ? 'is-active' : ''}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}<span>{filterCount(item.id)}</span>
            </button>
          ))}
        </div>
        <label className="flashcard-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">搜索问题、答案或标签</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索问题、答案或标签" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><X size={14} /></button>}
        </label>
      </section>

      {editorOpen && (
        <section className="panel flashcard-editor" aria-labelledby="flashcard-editor-title">
          <div className="flashcard-editor-heading">
            <div><span className="eyebrow">CUSTOM CARD</span><h2 id="flashcard-editor-title">{editingId ? '编辑自建卡片' : '新建自建卡片'}</h2></div>
            <button className="icon-button" type="button" onClick={resetEditor} aria-label="关闭编辑器"><X size={18} /></button>
          </div>
          <form onSubmit={submitCard}>
            <label>
              <span>问题 <b aria-hidden="true">*</b></span>
              <textarea value={formQuestion} onChange={(event) => setFormQuestion(event.target.value)} rows={3} placeholder="例如：MCP 中 Host 的主要职责是什么？" />
            </label>
            <label>
              <span>答案 <b aria-hidden="true">*</b></span>
              <textarea value={formAnswer} onChange={(event) => setFormAnswer(event.target.value)} rows={4} placeholder="写下希望翻面后看到的标准答案。" />
            </label>
            <label>
              <span>标签 <small>可选，用逗号分隔</small></span>
              <input value={formTags} onChange={(event) => setFormTags(event.target.value)} placeholder="MCP, Agent, 安全" />
            </label>
            {formError && <p className="flashcard-form-error" role="alert">{formError}</p>}
            <div className="flashcard-editor-actions">
              <button className="secondary-button" type="button" onClick={resetEditor}>取消</button>
              <button className="primary-button" type="submit">{editingId ? '保存修改' : '加入卡组'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="flashcard-practice" aria-labelledby="flashcard-practice-title">
        <header className="flashcard-deck-header">
          <div>
            <span className="eyebrow">ACTIVE DECK</span>
            <h2 id="flashcard-practice-title">{filterLabels.find((item) => item.id === filter)?.label}卡组</h2>
            <p aria-live="polite">{filteredCards.length ? `共 ${filteredCards.length} 张，当前第 ${activeIndex + 1} 张` : '当前筛选下没有卡片'}</p>
          </div>
          <div className="flashcard-deck-nav" aria-label="切换卡片">
            <button type="button" onClick={() => moveCard(-1)} disabled={filteredCards.length < 2} aria-label="上一张"><ChevronLeft size={19} /></button>
            <span>{filteredCards.length ? `${activeIndex + 1} / ${filteredCards.length}` : '0 / 0'}</span>
            <button type="button" onClick={() => moveCard(1)} disabled={filteredCards.length < 2} aria-label="下一张"><ChevronRight size={19} /></button>
          </div>
        </header>

        {activeCard ? (
          <div className="flashcard-practice-layout">
          <div className="memory-card-stage" onKeyDown={handleDeckKeyDown}>
              <div className={isFlipped ? 'memory-card is-flipped' : 'memory-card'}>
                <section className="memory-card-face memory-card-front" aria-hidden={isFlipped}>
                  <header className="memory-card-meta">
                    <span className={activeCard.source === 'builtin' ? 'is-builtin' : 'is-custom'}>{activeCard.source === 'builtin' ? '内置题库' : '自建卡片'}</span>
                    <span>{activeRecord ? `记忆阶段 ${activeRecord.successfulSteps}/4` : '新卡'}</span>
                  </header>
                  <div className="memory-card-scroll">
                    <span className="memory-card-side-label">正面 · 先回忆</span>
                    <h3>{activeCard.question}</h3>
                    {activeCard.options && (
                      <ol className="memory-card-options">
                        {activeCard.options.map((option, index) => <li key={option}><span>{String.fromCharCode(65 + index)}</span>{option}</li>)}
                      </ol>
                    )}
                    <label className="memory-answer-input">
                      <span>我的回答 <small>仅用于本轮对照</small></span>
                      <textarea
                        ref={answerInputRef}
                        value={myAnswer}
                        disabled={isFlipped}
                        onChange={(event) => setMyAnswer(event.target.value)}
                        rows={3}
                        placeholder="不必完美，先写下你现在能想起的内容。"
                      />
                    </label>
                  </div>
                  <footer className="memory-card-footer">
                    <span><RotateCw size={14} />Ctrl + Enter 翻面</span>
                    <button className="primary-button" type="button" disabled={isFlipped} onClick={flipCard}>翻到背面<RotateCw size={17} /></button>
                  </footer>
                </section>

                <section className="memory-card-face memory-card-back" aria-hidden={!isFlipped}>
                  <header className="memory-card-meta">
                    <span className="is-answer">答案与解析</span>
                    <span>{activeRecord ? `下次：${formatDate(activeRecord.nextReviewAt)}` : '首次复习'}</span>
                  </header>
                  <div className="memory-card-scroll">
                    <span className="memory-card-side-label">背面 · 对照判断</span>
                    <h3 ref={backHeadingRef} tabIndex={-1}>{activeCard.question}</h3>
                    <div className="memory-answer-comparison">
                      <section>
                        <span>我的回答</span>
                        <p className={myAnswer.trim() ? '' : 'is-empty'}>{myAnswer.trim() || '本轮未填写'}</p>
                      </section>
                      <section>
                        <span>标准答案</span>
                        <p>{activeCard.answer}</p>
                      </section>
                    </div>
                    {activeCard.explanation && (
                      <section className="memory-card-explanation">
                        <span>解析</span>
                        <p>{activeCard.explanation}</p>
                      </section>
                    )}
                    {activeCard.tags.length > 0 && <div className="memory-card-tags">{activeCard.tags.slice(0, 6).map((tag) => <span key={tag}><Tag size={11} />{tag}</span>)}</div>}
                  </div>
                  <footer className="memory-rating-footer">
                    <div><strong>这次记住了吗？</strong><span>键盘 1 / 2 可直接自评</span></div>
                    <button className="memory-rate-button is-forgot" type="button" disabled={!isFlipped} onClick={() => rateCard(false)}><span>1</span>还没记住</button>
                    <button className="memory-rate-button is-remembered" type="button" disabled={!isFlipped} onClick={() => rateCard(true)}><span>2</span>记住了</button>
                  </footer>
                </section>
              </div>
            </div>

            <aside className="flashcard-schedule-card" aria-label="当前卡片复习状态">
              <span className="card-icon yellow"><CalendarClock size={20} /></span>
              <h3>间隔复习</h3>
              <p>每次“记住了”向后推进一阶；“还没记住”会回到起点。</p>
              <div className="schedule-steps" aria-label="1天、3天、7天、14天复习间隔">
                {intervals.map((day, index) => <span className={(activeRecord?.successfulSteps ?? 0) > index ? 'is-complete' : ''} key={day}>{day}<small>天</small></span>)}
              </div>
              <dl>
                <div><dt>已复习</dt><dd>{activeRecord?.totalReviews ?? 0} 次</dd></div>
                <div><dt>已记住</dt><dd>{activeRecord?.rememberedCount ?? 0} 次</dd></div>
                <div><dt>下次复习</dt><dd>{activeRecord ? formatDate(activeRecord.nextReviewAt) : '今天'}</dd></div>
              </dl>
            </aside>
          </div>
        ) : (
          <div className="panel flashcard-empty">
            <span className="card-icon green"><Check size={21} /></span>
            <h3>{filter === 'due' && !search ? '今天的卡片已复习完' : '没找到匹配卡片'}</h3>
            <p>{filter === 'due' && !search ? '很好，可以切换到“全部”继续练习。' : '试试清空搜索或切换卡组筛选。'}</p>
            <button className="secondary-button" type="button" onClick={() => { setSearch(''); setFilter('all') }}>查看全部卡片</button>
          </div>
        )}
      </section>

      <section className="panel custom-card-library" aria-labelledby="custom-card-library-title">
        <div className="panel-heading">
          <div><span className="eyebrow">MY CARDS</span><h2 id="custom-card-library-title">自建卡片</h2></div>
          <button className="secondary-button" type="button" onClick={startNewCard}><Plus size={16} />新建</button>
        </div>
        {state.customFlashcards.length ? (
          <div className="custom-card-list">
            {state.customFlashcards.map((card) => {
              const record = state.flashcardReviews[card.id]
              const confirming = deletePendingId === card.id
              return (
                <article key={card.id}>
                  <div className="custom-card-copy">
                    <div><span>问</span><h3>{card.question}</h3></div>
                    <p><strong>答</strong>{card.answer}</p>
                    <footer>
                      <div>{card.tags.map((tag) => <span key={tag}><Tag size={10} />{tag}</span>)}</div>
                      <small>{record ? `下次 ${formatDate(record.nextReviewAt)} · 阶段 ${record.successfulSteps}/4` : '尚未复习'}</small>
                    </footer>
                  </div>
                  <div className="custom-card-actions">
                    <button type="button" onClick={() => startEditCard(card.id)} aria-label={`编辑：${card.question}`}><Edit3 size={16} />编辑</button>
                    <button className="is-delete" type="button" onClick={() => setDeletePendingId(card.id)} aria-label={`删除：${card.question}`}><Trash2 size={16} />删除</button>
                  </div>
                  {confirming && (
                    <div className="flashcard-delete-confirm" role="alertdialog" aria-labelledby={`delete-title-${card.id}`} aria-describedby={`delete-copy-${card.id}`}>
                      <div><strong id={`delete-title-${card.id}`}>确认删除这张卡片？</strong><p id={`delete-copy-${card.id}`}>卡片和它的复习记录都会从本机移除。</p></div>
                      <button type="button" onClick={() => setDeletePendingId(null)}>取消</button>
                      <button className="is-confirm-delete" type="button" onClick={() => confirmDelete(card.id)}>确认删除</button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="custom-card-empty"><BrainCircuit size={22} /><p>还没有自建卡片。把难以记住的概念，写成只属于你的问答。</p><button className="text-button" type="button" onClick={startNewCard}>创建第一张<ChevronRight size={15} /></button></div>
        )}
      </section>
    </div>
  )
}
