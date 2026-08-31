import { Check, ChevronRight, Circle, LockKeyhole, Play, Star } from 'lucide-react'
import { chapters, difficultyMeta } from '../data/chapters'
import { getQuestionProgress } from '../services/progress'
import type { Difficulty, Question, StudyState } from '../types'

interface ChapterMapProps {
  state: StudyState
  questions: Question[]
  onStart: (chapterId: string, difficulty: Difficulty) => void
}

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

export function ChapterMap({ state, questions, onStart }: ChapterMapProps) {
  return (
    <div className="page path-page">
      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">LEARNING PATH</span>
          <h1>五天笔记，逐层掌握</h1>
          <p>每章固定按难度独立出题，不会再把三档题混在同一轮。完成前一层 60%，即可解锁下一层。</p>
        </div>
        <div className="path-legend" aria-label="关卡状态图例">
          <span><i className="legend-dot is-complete" /> 已掌握</span>
          <span><i className="legend-dot is-current" /> 可学习</span>
          <span><i className="legend-dot" /> 未解锁</span>
        </div>
      </section>

      <section className="path-difficulty-guide" aria-label="难度说明">
        {difficulties.map((difficulty) => (
          <div className={`is-${difficulty}`} key={difficulty}>
            <strong>{difficultyMeta[difficulty].label}</strong>
            <span>{difficultyMeta[difficulty].description}</span>
            {difficulty === 'hard' && <small>毒舌教练默认开启，可在答题页关闭</small>}
          </div>
        ))}
      </section>

      <section className="chapter-list" aria-label="学习章节">
        {chapters.map((chapter, chapterIndex) => {
          const overall = getQuestionProgress(questions, state.completedQuestionIds, chapter.id)
          const previousChapter = chapters[chapterIndex - 1]
          const previousProgress = previousChapter
            ? getQuestionProgress(questions, state.completedQuestionIds, previousChapter.id)
            : undefined
          const chapterLocked = chapterIndex > 0 && Boolean(previousProgress?.total) && (previousProgress?.percent ?? 0) < 60

          return (
            <article
              className={chapterLocked ? 'chapter-card is-locked' : 'chapter-card'}
              key={chapter.id}
              style={{ '--chapter-accent': chapter.accent } as React.CSSProperties}
            >
              <div className="chapter-index" aria-hidden="true">
                <span>{String(chapterIndex + 1).padStart(2, '0')}</span>
              </div>
              <div className="chapter-copy">
                <div className="chapter-title-row">
                  <div>
                    <span className="chapter-eyebrow">{chapter.eyebrow} · {chapter.day} 号笔记</span>
                    <h2>{chapter.title}</h2>
                  </div>
                  <div className="chapter-percentage">
                    <strong>{overall.percent}%</strong>
                    <span>{overall.complete}/{overall.total || 0} 题</span>
                  </div>
                </div>
                <p>{chapter.description}</p>
                <div className="thin-progress chapter-progress" aria-hidden="true">
                  <span style={{ width: `${overall.percent}%`, background: chapter.accent }} />
                </div>

                {overall.total === 0 ? (
                  <div className="chapter-empty"><Circle size={15} /> 这一章的题目将在知识导入后出现</div>
                ) : chapterLocked ? (
                  <div className="chapter-empty"><LockKeyhole size={15} /> 完成上一章 60% 后解锁</div>
                ) : (
                  <div className="level-row">
                    {difficulties.map((difficulty, difficultyIndex) => {
                      const levelProgress = getQuestionProgress(
                        questions,
                        state.completedQuestionIds,
                        chapter.id,
                        difficulty,
                      )
                      const previousDifficulty = difficulties[difficultyIndex - 1]
                      const previousDifficultyProgress = previousDifficulty
                        ? getQuestionProgress(questions, state.completedQuestionIds, chapter.id, previousDifficulty)
                        : undefined
                      const locked = difficultyIndex > 0 && Boolean(previousDifficultyProgress?.total) && (previousDifficultyProgress?.percent ?? 0) < 60
                      const complete = levelProgress.total > 0 && levelProgress.percent === 100
                      const unavailable = levelProgress.total === 0

                      return (
                        <button
                          className={complete ? 'level-button is-complete' : 'level-button'}
                          type="button"
                          key={difficulty}
                          disabled={locked || unavailable}
                          onClick={() => onStart(chapter.id, difficulty)}
                          title={
                            unavailable
                              ? '暂无该难度题目'
                              : locked
                                ? '完成上一层 60% 后解锁'
                                : `开始${difficultyMeta[difficulty].label}`
                          }
                        >
                          <span className="level-status">
                            {complete ? <Check size={17} /> : locked ? <LockKeyhole size={16} /> : <Play size={16} fill="currentColor" />}
                          </span>
                          <span className="level-copy">
                            <b>{difficultyMeta[difficulty].label}</b>
                            <small>{difficultyMeta[difficulty].description.split('：')[0]} · {levelProgress.complete}/{levelProgress.total} 题 · +{difficultyMeta[difficulty].xp} XP</small>
                          </span>
                          {complete ? <Star size={17} fill="currentColor" /> : <ChevronRight size={17} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
