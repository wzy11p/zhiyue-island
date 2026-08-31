import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Compass,
  Link2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { chapters } from '../data/chapters'
import { knowledgeAuditItems, knowledgeDays } from '../data/knowledge'
import type { AuditStatus } from '../types'

const statusMeta: Record<AuditStatus, { label: string; Icon: typeof AlertTriangle }> = {
  'needs-correction': { label: '需纠偏', Icon: AlertTriangle },
  'needs-context': { label: '需限定', Icon: Compass },
  'time-sensitive': { label: '强时效', Icon: Clock3 },
}

export function KnowledgeBase() {
  return (
    <div className="page knowledge-page">
      <section className="knowledge-hero" aria-labelledby="knowledge-title">
        <div className="knowledge-hero-copy">
          <span className="eyebrow">KNOWLEDGE MAP</span>
          <h1 id="knowledge-title">五天笔记，<br />一张可追溯的知识脉络。</h1>
          <p>左边是课堂内容的结构化压缩，下方是对简化说法、过时信息与概念混用的批判性校正。每条校正都连回官方文档或原始论文。</p>
        </div>
        <div className="knowledge-hero-stats" aria-label="知识库概览">
          <div><strong>{knowledgeDays.length}</strong><span>天知识脉络</span></div>
          <div><strong>{knowledgeDays.reduce((total, day) => total + day.clusters.length, 0)}</strong><span>个知识簇</span></div>
          <div><strong>{knowledgeAuditItems.length}</strong><span>条关键校正</span></div>
        </div>
      </section>

      <nav className="knowledge-day-nav" aria-label="按日期跳转">
        {knowledgeDays.map((day) => {
          const chapter = chapters.find((item) => item.id === day.chapterId)
          return (
            <a key={day.day} href={`#knowledge-day-${day.day}`}>
              <span>DAY {day.day}</span>
              <strong>{chapter?.title}</strong>
            </a>
          )
        })}
      </nav>

      <section className="knowledge-timeline" aria-label="五天知识摘要">
        {knowledgeDays.map((day, dayIndex) => {
          const chapter = chapters.find((item) => item.id === day.chapterId)
          return (
            <article
              className="knowledge-day-card"
              id={`knowledge-day-${day.day}`}
              key={day.day}
              style={{ '--knowledge-accent': chapter?.accent ?? '#70c997' } as React.CSSProperties}
            >
              <header className="knowledge-day-header">
                <div className="knowledge-day-index" aria-hidden="true">{String(dayIndex + 1).padStart(2, '0')}</div>
                <div>
                  <span className="chapter-eyebrow">{chapter?.eyebrow} · {day.day} 号笔记</span>
                  <h2>{chapter?.title}</h2>
                  <p>{day.summary}</p>
                </div>
              </header>

              <div className="knowledge-cluster-grid">
                {day.clusters.map((cluster, clusterIndex) => (
                  <section className="knowledge-cluster" key={cluster.title} aria-labelledby={`cluster-${day.day}-${clusterIndex}`}>
                    <div className="knowledge-cluster-title">
                      <span>{String(clusterIndex + 1).padStart(2, '0')}</span>
                      <h3 id={`cluster-${day.day}-${clusterIndex}`}>{cluster.title}</h3>
                    </div>
                    <ul>
                      {cluster.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </section>
                ))}
              </div>

              <footer className="knowledge-day-footer">
                <div className="knowledge-takeaway">
                  <span><Sparkles size={16} aria-hidden="true" /></span>
                  <div><small>这一天最应带走的判断</small><p>{day.takeaway}</p></div>
                </div>
                <div className="knowledge-source-list" aria-label={`Day ${day.day} 主要来源`}>
                  <span><Link2 size={14} aria-hidden="true" /> 主要来源</span>
                  <div>
                    {day.sources.map((source) => (
                      <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
                        {source.label}<ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </footer>
            </article>
          )
        })}
      </section>

      <section className="knowledge-audit" aria-labelledby="audit-title">
        <div className="knowledge-audit-heading">
          <div>
            <span className="eyebrow">CRITICAL AUDIT</span>
            <h2 id="audit-title">不只记住，还要知道它在什么条件下才成立。</h2>
            <p>“课堂说法”保留了原始记忆点；“更严谨理解”补足边界；“行动建议”把纠偏转成下一次可执行的判断。</p>
          </div>
          <div className="audit-legend" aria-label="校正状态图例">
            <span><i className="audit-dot is-correction" />需纠偏</span>
            <span><i className="audit-dot is-context" />需限定</span>
            <span><i className="audit-dot is-time" />强时效</span>
          </div>
        </div>

        <div className="audit-card-list">
          {knowledgeAuditItems.map((item, index) => {
            const meta = statusMeta[item.status]
            const StatusIcon = meta.Icon
            return (
              <article className={`audit-card is-${item.status}`} key={item.id}>
                <header className="audit-card-header">
                  <div className="audit-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <span className="audit-day">DAY {item.day}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className="audit-badges">
                    <span className="audit-status"><StatusIcon size={13} aria-hidden="true" />{meta.label}</span>
                    <span className="audit-confidence"><ShieldCheck size={13} aria-hidden="true" />信心 {item.confidence === 'high' ? '高' : '中'}</span>
                  </div>
                </header>

                <div className="audit-comparison">
                  <div className="audit-claim">
                    <span><BookOpenText size={16} aria-hidden="true" />课堂说法</span>
                    <p>{item.classroomClaim}</p>
                  </div>
                  <div className="audit-rigorous">
                    <span><CheckCircle2 size={16} aria-hidden="true" />更严谨理解</span>
                    <p>{item.rigorousUnderstanding}</p>
                  </div>
                  <div className="audit-action">
                    <span><Compass size={16} aria-hidden="true" />行动建议</span>
                    <p>{item.action}</p>
                  </div>
                </div>

                <footer className="audit-card-sources">
                  <span>核验来源</span>
                  {item.sources.map((source) => (
                    <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
                      {source.label}<ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  ))}
                </footer>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

