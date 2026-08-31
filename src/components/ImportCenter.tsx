import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  PlusCircle,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { createKnowledgeIngestionAdapter } from '../services/ingestion'
import type { KnowledgeImportRecord, StudyState } from '../types'

interface ImportCenterProps {
  state: StudyState
  onImport: (record: KnowledgeImportRecord) => void
}

type FormStatus = { type: 'success' | 'error'; message: string } | null

const isSupportedUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'feishu.cn' ||
      url.hostname.endsWith('.feishu.cn') ||
      url.hostname === 'larksuite.com' ||
      url.hostname.endsWith('.larksuite.com')
    )
  } catch {
    return false
  }
}

export function ImportCenter({ state, onImport }: ImportCenterProps) {
  const adapter = useMemo(() => createKnowledgeIngestionAdapter(), [])
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [pastedContent, setPastedContent] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<FormStatus>(null)
  const endpointEnabled = Boolean(import.meta.env.VITE_INGESTION_ENDPOINT?.trim())

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus(null)
    const normalizedUrl = sourceUrl.trim()
    const normalizedContent = pastedContent.trim()

    if (!normalizedUrl && !normalizedContent) {
      setStatus({ type: 'error', message: '请至少填写飞书链接或粘贴一段知识内容。' })
      return
    }
    if (normalizedUrl && !isSupportedUrl(normalizedUrl)) {
      setStatus({ type: 'error', message: '请输入有效的飞书 Wiki / 文档 HTTPS 链接。' })
      return
    }

    setLoading(true)
    try {
      const result = await adapter.ingest({
        title: title.trim() || (normalizedUrl ? '飞书知识导入' : '粘贴知识导入'),
        sourceUrl: normalizedUrl || undefined,
        pastedContent: normalizedContent || undefined,
        requestedQuestionCount: questionCount,
      })
      onImport(result.importRecord)
      setStatus({ type: 'success', message: result.importRecord.message ?? '导入任务已创建。' })
      setTitle('')
      setSourceUrl('')
      setPastedContent('')
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : '导入失败，请稍后重试。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page import-page">
      <section className="page-heading split-heading">
        <div>
          <span className="eyebrow">IMPORT CENTER</span>
          <h1>让新笔记，持续长成新题目</h1>
          <p>登记飞书来源或直接粘贴内容。候选题经过冲突检查与审校后，再进入正式题库。</p>
        </div>
        <span className={endpointEnabled ? 'adapter-status is-online' : 'adapter-status'}>
          <i /> {endpointEnabled ? '后端导入服务已连接' : '本地预解析模式'}
        </span>
      </section>

      <section className="import-layout">
        <form className="import-form panel" onSubmit={submit}>
          <div className="panel-heading">
            <div><span className="eyebrow">NEW SOURCE</span><h2>添加知识来源</h2></div>
            <PlusCircle size={20} />
          </div>

          <label className="field-label" htmlFor="import-title">名称 <small>可选</small></label>
          <input
            id="import-title"
            className="text-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：8 月 29 日 AI 产品笔记"
            maxLength={80}
          />

          <label className="field-label" htmlFor="feishu-url"><Link2 size={15} /> 飞书文档链接 <small>可选</small></label>
          <input
            id="feishu-url"
            className="text-input"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://my.feishu.cn/wiki/..."
            inputMode="url"
          />
          <p className="field-hint">私有文档需要由服务端通过飞书授权读取；浏览器不会绕过你的访问权限。</p>

          <div className="or-divider"><span>或者直接粘贴</span></div>

          <label className="field-label" htmlFor="knowledge-content"><FileText size={15} /> 知识内容 <small>建议包含标题和分点</small></label>
          <textarea
            id="knowledge-content"
            className="content-input"
            value={pastedContent}
            onChange={(event) => setPastedContent(event.target.value)}
            placeholder={'粘贴你的笔记内容…\n\n系统将据此提取知识点，并在接入生成服务后输出候选题。'}
            rows={9}
          />
          <div className="input-footer"><span>{pastedContent.length.toLocaleString()} 字</span><span>内容越结构化，生成结果越稳定</span></div>

          <div className="question-count-field">
            <label htmlFor="question-count">期望候选题数量</label>
            <div>
              <input
                id="question-count"
                type="range"
                min="5"
                max="30"
                step="5"
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              />
              <strong>{questionCount} 题</strong>
            </div>
          </div>

          {status && (
            <div className={status.type === 'success' ? 'form-message is-success' : 'form-message is-error'} role="status">
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
              <span>{status.message}</span>
            </div>
          )}

          <button className="primary-button import-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
            {loading ? '正在解析…' : endpointEnabled ? '提取知识并生成候选题' : '预解析并登记'}
          </button>
        </form>

        <div className="import-side">
          <article className="panel quality-card">
            <span className="card-icon green"><ShieldCheck size={21} /></span>
            <h2>发布前质量闸门</h2>
            <p>生成并不等于正确。正式入库前，系统应完成以下检查：</p>
            <ul>
              <li><CheckCircle2 size={16} /> 区分事实、观点与待核验推论</li>
              <li><CheckCircle2 size={16} /> 发现笔记间冲突与过时结论</li>
              <li><CheckCircle2 size={16} /> 排除多解、暗示答案与绝对化题目</li>
              <li><CheckCircle2 size={16} /> 保留来源、版本与审核状态</li>
            </ul>
          </article>

          <article className="flow-card">
            <span className="eyebrow">SAFE INGESTION FLOW</span>
            <div className="ingestion-flow" aria-label="知识导入流程">
              {['读取来源', '提取知识点', '冲突检查', '生成候选题', '审核发布'].map((step, index) => (
                <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < 4 && <i />}</div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="panel import-history">
        <div className="panel-heading">
          <div><span className="eyebrow">SYNC HISTORY</span><h2>最近导入</h2></div>
          <span className="soft-label">本机记录 {state.imports.length}</span>
        </div>
        {state.imports.length ? (
          <div className="history-list">
            {state.imports.map((record) => (
              <article key={record.id}>
                <span className="history-source"><FileText size={18} /></span>
                <div className="history-copy">
                  <div><strong>{record.title}</strong><span className={`import-status status-${record.status}`}>{record.status === 'ready' ? '已预解析' : record.status === 'queued' ? '等待服务端' : '失败'}</span></div>
                  <p>{record.excerpt}</p>
                  <small>{new Date(record.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {record.knowledgePointCount} 个知识点 · {record.suggestedQuestionCount} 道候选题</small>
                </div>
                {record.sourceUrl && <a href={record.sourceUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${record.title} 的飞书来源`}><ExternalLink size={17} /></a>}
              </article>
            ))}
          </div>
        ) : (
          <div className="history-empty"><Clock3 size={21} /><span>还没有导入记录。完成上面的表单后，处理状态会出现在这里。</span></div>
        )}
      </section>
    </div>
  )
}
