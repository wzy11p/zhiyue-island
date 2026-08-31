import type {
  KnowledgeImportRecord,
  KnowledgeIngestionAdapter,
  KnowledgeIngestionRequest,
  KnowledgeIngestionResult,
} from '../types'

const compactText = (value: string) => value.replace(/\s+/g, ' ').trim()

const estimatePoints = (content: string) => {
  const lines = content
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.、)\s]+/, '').trim())
    .filter((line) => line.length >= 6)
  return Math.max(1, Math.min(50, new Set(lines).size || Math.ceil(content.length / 120)))
}

/**
 * Browser-only fallback. It records an ingestion job locally but deliberately
 * does not pretend that a private Feishu page was fetched. Swap this adapter
 * for HttpKnowledgeIngestionAdapter when a trusted backend is available.
 */
export class LocalPreviewIngestionAdapter implements KnowledgeIngestionAdapter {
  async ingest(request: KnowledgeIngestionRequest): Promise<KnowledgeIngestionResult> {
    const content = request.pastedContent?.trim() ?? ''
    const pointCount = estimatePoints(content)
    const sourceType: KnowledgeImportRecord['sourceType'] =
      request.sourceUrl && content ? 'mixed' : request.sourceUrl ? 'feishu' : 'pasted'
    const hasOnlyRemoteSource = Boolean(request.sourceUrl && !content)

    await new Promise((resolve) => window.setTimeout(resolve, 450))

    return {
      importRecord: {
        id: `import-${Date.now()}`,
        title: request.title.trim() || '未命名知识导入',
        sourceUrl: request.sourceUrl?.trim() || undefined,
        sourceType,
        excerpt: content ? compactText(content).slice(0, 120) : '等待后端读取飞书文档内容',
        knowledgePointCount: hasOnlyRemoteSource ? 0 : pointCount,
        suggestedQuestionCount: hasOnlyRemoteSource
          ? 0
          : request.requestedQuestionCount ?? Math.min(20, Math.max(5, pointCount * 2)),
        status: hasOnlyRemoteSource ? 'queued' : 'ready',
        createdAt: new Date().toISOString(),
        message: hasOnlyRemoteSource
          ? '链接已登记。接入服务端适配器后，可使用飞书授权安全读取并生成题目。'
          : '知识点已在本地预解析。接入服务端后可完成去重、审校与正式出题。',
      },
    }
  }
}

/**
 * Future backend contract:
 * POST {endpoint} with KnowledgeIngestionRequest and return
 * KnowledgeIngestionResult. The backend owns Feishu OAuth, document parsing,
 * question generation, deduplication and validation.
 */
export class HttpKnowledgeIngestionAdapter implements KnowledgeIngestionAdapter {
  constructor(private readonly endpoint: string) {}

  async ingest(request: KnowledgeIngestionRequest): Promise<KnowledgeIngestionResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`导入服务暂时不可用（${response.status}）`)
    }

    return (await response.json()) as KnowledgeIngestionResult
  }
}

export const createKnowledgeIngestionAdapter = (): KnowledgeIngestionAdapter => {
  const endpoint = import.meta.env.VITE_INGESTION_ENDPOINT?.trim()
  return endpoint
    ? new HttpKnowledgeIngestionAdapter(endpoint)
    : new LocalPreviewIngestionAdapter()
}
