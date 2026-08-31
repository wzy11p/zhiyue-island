# 对话学习教练 API 设计

> 状态：前端已接入课程图谱、本地教练和可选 HTTP adapter；本文的完整 start / answer / next contract 是生产后端目标。现有 `QuizSession` 和静态 100 题继续作为可独立工作的本地学习模式。

这份文档定义动态对话教练的最小安全边界、浏览器与后端之间的 API contract，以及题目从生成到发布的生命周期。实现时应保持静态答题路径可独立运行，不能因为模型或网络不可用而破坏现有学习功能。

## 1. 信任边界与配置

浏览器只能调用本产品控制的可信后端，不能直接调用 OpenAI 或飞书开放平台。

- `OPENAI_API_KEY` 只存在于后端环境变量或密钥管理服务中，不能写入源码、`localStorage`、接口响应或任何 `VITE_*` 环境变量。
- `VITE_TUTOR_ENDPOINT` 会进入公开的前端构建产物。它只能表示同源路径或经过明确审核的可信后端基础 URL，例如 `/api/tutor`；它不是密钥，也不能携带 token。
- 生产环境优先使用相对的同源 `/api/tutor`。若确实跨域，后端必须使用固定来源 allowlist、严格 CORS、身份校验和 CSRF 防护，不能接受任意 Origin。
- OpenAI 的 response id、conversation id、飞书 access token 和题目私有答案均由后端持有，不能下发到浏览器。
- 后端必须限制请求体大小、文本长度、调用频率和执行时间，并记录不包含答案和隐私原文的审计日志。

建议的公开前端配置：

```bash
# 可省略；省略时前端使用同源 /api/tutor
VITE_TUTOR_ENDPOINT=/api/tutor
```

建议的后端私密配置：

```bash
OPENAI_API_KEY=server-side-secret
OPENAI_TUTOR_MODEL=pinned-model-snapshot
```

后端可以使用 Node.js 内置 `fetch` 调用 Responses API，不要求浏览器安装或打包 OpenAI SDK。

## 2. 会话状态

前端只保存产品自己的不透明 `session.id`、`session.revision` 和当前公开 turn。建议状态机为：

```text
starting -> question -> submitting -> feedback -> advancing
    |                                      |
    +----------> offline | error <---------+
                                  -> completed
```

后端会话记录至少包含：

```ts
interface ServerTutorSession {
  id: string
  ownerId: string
  revision: number
  latestResponseId?: string
  promptVersion: string
  status: 'active' | 'completed' | 'expired'
  compactTranscript: unknown[]
  createdAt: string
  updatedAt: string
}
```

`latestResponseId` 对应 Responses API 的 `previous_response_id`，只保存在后端。后续 turn 由后端传入该值，并在每轮显式重发固定版本的教练 instructions。若 response id 已失效，后端使用经过长度限制的 `compactTranscript` 重建新链，而不是要求浏览器提供模型上下文。

OpenAI 官方文档说明 Response 默认保存 30 天，可以使用 `store: false` 关闭保存；Conversation 对象适合跨会话或设备的长期状态，但其中 items 不受相同的 30 天 TTL。产品必须在上线前明确数据保留和删除策略。若私有笔记要求 `store: false`，应切换为后端手工管理和压缩历史，不能假设 `previous_response_id` 仍可恢复完整上下文。

参考：[Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)。

## 3. HTTP API contract

以下 contract 的 `apiVersion` 为产品协议版本，并不等同于题目版本。所有写请求都必须携带唯一 `requestId`，推荐同时放入 `Idempotency-Key` 请求头。

### 3.0 当前前端 adapter

当前 MVP 会将每次自由回答 `POST` 到 `VITE_TUTOR_ENDPOINT` 本身，携带公开的 `sessionId` / `activityId` / `conceptId` / `stage` / `prompt`、用户回答、信心和最近几次 verdict。它不会上传标准答案、本地关键词或 OpenAI response id。返回值是经运行时校验的 `TutorEvaluation`，可选附带下一道动态问题。

这个单端点 adapter 用于当前页面演示和分阶段对接。生产环境应迁移到下方的 start / answer / next contract，以获得服务端会话所有权、revision 并发控制和不可变题目版本。

### 3.1 开始会话

`POST {VITE_TUTOR_ENDPOINT}/sessions`

```http
Content-Type: application/json
Idempotency-Key: 9d303974-ef90-4d0f-98e8-a8fca07c639e
```

```json
{
  "apiVersion": "1",
  "requestId": "9d303974-ef90-4d0f-98e8-a8fca07c639e",
  "mode": "learn",
  "scope": {
    "chapterId": "day-24",
    "difficulty": "easy"
  },
  "client": {
    "locale": "zh-CN",
    "timeZone": "Asia/Shanghai"
  }
}
```

成功响应：

```json
{
  "apiVersion": "1",
  "requestId": "9d303974-ef90-4d0f-98e8-a8fca07c639e",
  "session": {
    "id": "ts_01JEXAMPLE",
    "revision": 1
  },
  "turn": {
    "type": "question",
    "turnId": "turn_01JEXAMPLE",
    "question": {
      "questionId": "question_01JEXAMPLE",
      "questionVersionId": "qv_01JEXAMPLE",
      "kind": "choice",
      "prompt": "行为成本为什么只能作为意图线索，而不能直接证明需求？",
      "options": [
        { "id": "opt_a", "text": "因为所有行为信号都没有价值" },
        { "id": "opt_b", "text": "因为仍需用留存或付费结果校准" },
        { "id": "opt_c", "text": "因为只有访谈可以证明需求" },
        { "id": "opt_d", "text": "因为成本只影响界面性能" }
      ],
      "knowledgePointId": "kp_behavior_cost",
      "difficulty": "easy",
      "sourceRefs": [
        {
          "sourceId": "source_day24",
          "sourceVersionId": "sv_01JEXAMPLE",
          "locator": "行为成本与意图"
        }
      ]
    }
  },
  "degraded": false
}
```

公开 question 绝不能包含 `correctIndex`、`correctOptionId`、`canonicalAnswer` 或评分 rubric。

### 3.2 提交答案

`POST {VITE_TUTOR_ENDPOINT}/sessions/{sessionId}/answers`

选择题请求：

```json
{
  "apiVersion": "1",
  "requestId": "43f0d69d-f39d-47d3-9cb3-08dd65da2d40",
  "expectedRevision": 1,
  "turnId": "turn_01JEXAMPLE",
  "questionVersionId": "qv_01JEXAMPLE",
  "answer": {
    "kind": "choice",
    "optionId": "opt_b"
  }
}
```

自由回答请求只替换 `answer`：

```json
{
  "kind": "text",
  "text": "高成本行为提高了意图判断的可信度，但还需要结果指标验证。"
}
```

成功响应：

```json
{
  "apiVersion": "1",
  "requestId": "43f0d69d-f39d-47d3-9cb3-08dd65da2d40",
  "session": {
    "id": "ts_01JEXAMPLE",
    "revision": 2
  },
  "attemptId": "attempt_01JEXAMPLE",
  "evaluation": {
    "verdict": "correct",
    "score": 1,
    "confidence": 1,
    "correctAnswerDisplay": "高成本行为是较强线索，但需要后续结果校准。",
    "explanation": "行为成本提高信号可信度，但不能消除样本、场景和因果解释的不确定性。",
    "misconception": null,
    "guidance": "把行为信号和留存、复购或付费结果放在同一条证据链里。",
    "evidenceRefs": ["source_day24:sv_01JEXAMPLE:行为成本与意图"]
  },
  "nextTurn": null,
  "progress": {
    "answered": 1,
    "correct": 1,
    "remaining": 9
  }
}
```

`verdict` 只能是 `correct`、`partial` 或 `incorrect`，`score` 和 `confidence` 必须位于 0 到 1。选择题的 verdict 由服务端使用私有 `correctOptionId` 确定性计算；模型只生成解释。自由回答才使用私有 rubric 进行结构化评测。XP、爱心和掌握状态由服务端产品规则计算，不能直接采用模型建议的奖励值。

答对时响应可以直接包含下一道公开 `nextTurn`，前端短暂显示正确反馈后立即前进。答错时前端先展示 `evaluation`，再请求下一步。

### 3.3 继续下一题

`POST {VITE_TUTOR_ENDPOINT}/sessions/{sessionId}/next`

```json
{
  "apiVersion": "1",
  "requestId": "f5d74bf9-75ea-4f68-b988-df90fd60fece",
  "expectedRevision": 2
}
```

响应沿用开始会话中的 `session + turn` 结构。`expectedRevision` 不匹配时返回 `409 session_revision_conflict`，前端应刷新会话快照，不能盲目覆盖较新的 turn。

### 3.4 错误响应

```json
{
  "apiVersion": "1",
  "requestId": "43f0d69d-f39d-47d3-9cb3-08dd65da2d40",
  "error": {
    "code": "invalid_tutor_response",
    "message": "教练响应暂时无法解析，请重试。",
    "retryable": true
  }
}
```

建议使用：

- `400`：请求格式或长度非法
- `401` / `403`：未登录、会话不属于当前用户或来源无权限
- `409`：会话 revision 冲突或 turn 已提交
- `422`：答案与当前题目不匹配
- `429`：频率限制
- `502` / `503`：模型、飞书或知识服务暂时不可用

## 4. 幂等与并发

`requestId` 必须由浏览器为每个用户意图生成一次，重试时复用原值，不能每次点击重试都生成新值。后端按 `ownerId + sessionId + requestId` 保存幂等结果：

1. 首次请求完成模型调用、计分和 revision 更新，并保存完整响应。
2. 相同 `requestId` 的重复请求直接返回第一次的响应。
3. 相同 `requestId` 但请求体不同，返回 `409 idempotency_conflict`。
4. `expectedRevision` 保证同一会话不会由两个并发答案重复推进。

只有得到后端确认的 `attemptId` 后，前端才能更新 XP、爱心、错题和完成数量。网络超时的未确认答案不扣心、不加分。

## 5. 运行时校验

TypeScript 类型在运行时会被擦除，不能用 `as TutorResponse` 代替校验。浏览器和后端都需要验证实际 JSON；当前项目可以先用手写 type guard，无需新增依赖。

最少检查：

- `apiVersion`、`requestId`、session id、turn id 和 version id 是非空且长度受限的字符串。
- `session.revision` 是非负整数，且不会倒退。
- `turn.type` 是已知 discriminant；每种 turn 只出现该类型允许的字段。
- choice 题有 2—6 个 option，option id 唯一，文本非空且长度受限。
- 公共 question 中没有私有答案字段。
- 回答中的 `turnId` 和 `questionVersionId` 必须等于当前公开题。
- `score`、`confidence` 位于 0—1；`evidenceRefs` 只能引用会话已授权的来源版本。
- `nextTurn` 不能重复当前 `turnId` 或已完成的 `questionVersionId`。
- 未知 `apiVersion`、未知 enum、模型 refusal、Response 非 `completed`、JSON 解析失败或 schema 不变量失败都进入明确错误态，不能按正确答案计分。

## 6. Responses API 与 Structured Outputs

教练的模型输出使用 Responses API 的 `text.format` 和严格 JSON Schema，而不是让前端解析自然语言。Structured Outputs 适合把问题、解析和评测拆成稳定 UI 字段；若要让模型调用内部检索函数，则另行使用严格的 function calling。

参考：[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)。

下面是自由回答评测的最小 schema。题目生成应使用独立 schema，并包含只保留在服务端的答案键和 rubric。

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "verdict": {
      "type": "string",
      "enum": ["correct", "partial", "incorrect"]
    },
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "correctAnswerDisplay": { "type": "string" },
    "explanation": { "type": "string" },
    "misconception": { "type": ["string", "null"] },
    "guidance": { "type": "string" },
    "evidenceRefIds": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": [
    "verdict",
    "score",
    "confidence",
    "correctAnswerDisplay",
    "explanation",
    "misconception",
    "guidance",
    "evidenceRefIds"
  ]
}
```

Responses API 调用形态：

```json
{
  "model": "pinned-model-snapshot",
  "previous_response_id": "server-owned-response-id",
  "instructions": "versioned tutor instructions",
  "input": "server-constructed turn input",
  "text": {
    "format": {
      "type": "json_schema",
      "name": "tutor_evaluation_v1",
      "strict": true,
      "schema": "<the schema above>"
    }
  }
}
```

生产代码需把 `schema` 作为 JSON 对象传入，而不是示例中的占位字符串。后端还必须处理模型 `refusal`、非 `completed` 状态、`incomplete_details`、超时以及本地二次校验失败。Structured Outputs 保证输出形状，不保证事实正确或评分合理。

## 7. 本地 fallback

本地 fallback 继续使用编译进应用的 `src/data/questions.ts` 和 `correctIndex` 做确定性选择题判分，它的边界必须在界面中明确标记：

- 没有 Responses API 多轮语义记忆，也不会根据用户追问实时调整教学策略。
- 不可靠地评判自由文本，因此本地模式只支持现有选择题规则或用户自行翻卡核对。
- 不会生成新的针对性解释；它只展示静态题目中已有的 `explanation`、`misconception` 和 `errorGuidance`。
- 不能读取私有飞书页面，也不会把新导入内容真正加入运行时题库。
- 当前 `LocalPreviewIngestionAdapter` 只登记导入记录并估算知识点数量，不代表已经抓取、验证或发布题目。
- 学习记录仍只在当前浏览器的 `localStorage`，没有跨设备同步。

推荐只在“开始 Agent 会话失败”时自动提供本地模式。会话进行中断线时先保留同一个 `requestId` 供重试，再让用户明确选择切换本地题库；不能悄悄更换评分规则。

## 8. 飞书导入与不可信内容

飞书文档内容、文档标题、链接文本和粘贴内容都属于不可信数据，即使它来自用户自己的空间。服务端必须：

- 再次验证允许的 Feishu / Lark host；从 URL 提取受支持的文档标识后调用官方 API，不能对用户提供的任意 URL 做服务器抓取，避免 SSRF。
- 只在服务端完成 OAuth 和 token 刷新；token 加密存储，并按当前用户和文档权限读取。
- 对文本设长度、文件类型和字符限制，移除活动内容；外部链接不自动访问。
- 在 prompt 中把笔记作为有明确分隔符的引用数据，不能让笔记里的“忽略规则”“调用工具”或“泄露答案”等文字覆盖系统 instructions。
- 保存 `sourceId`、飞书 revision、`sourceVersionId`、内容 hash、抓取时间和 locator，使每个知识点与题目都能追溯到具体来源版本。
- 对冲突、时效性、许可、个人信息和缺少证据的内容做标记，不能把模型生成等同于事实确认。

建议导入 API 使用异步任务：

```text
POST /api/knowledge/import -> 202 + jobId
GET  /api/knowledge/import/{jobId}
queued -> fetching -> extracting -> review_required -> ready | failed
```

## 9. 候选题生命周期与版本化

动态题目不能直接进入正式计分题库，必须经过：

```text
draft -> 审校 review_required -> published -> retired
```

1. **draft**：由结构化生成产生，保存私有答案、rubric、来源版本、模型版本和 prompt 版本；仅供审校，不出现在正式闯关中。
2. **审校**：检查来源支持、唯一正确答案、多解、干扰项质量、绝对化措辞、答案泄露、笔记冲突和时效性。未通过的题退回 draft 或 rejected。
3. **published**：通过自动规则和规定的人工或显式质量闸门后才能供 Tutor 和正式计分使用。
4. **retired**：停止出新题，但保留历史版本以解释旧 attempt。

`questionId` 表示稳定的学习目标，`questionVersionId` 表示不可变的具体题目版本。published 后不原地编辑；任何题干、选项、答案、rubric 或来源变化都创建新的 `questionVersionId`。每次作答永久绑定当时的版本，后续审校不能悄悄改变历史得分。

建议的服务端私有记录：

```ts
interface QuestionVersion {
  questionId: string
  questionVersionId: string
  status: 'draft' | 'review_required' | 'published' | 'retired' | 'rejected'
  prompt: string
  options?: Array<{ id: string; text: string }>
  correctOptionId?: string
  canonicalAnswer?: string
  rubric: string[]
  sourceRefs: Array<{
    sourceId: string
    sourceVersionId: string
    locator: string
  }>
  contentHash: string
  generatorModel: string
  promptVersion: string
  createdAt: string
  publishedAt?: string
}
```

现有 `scripts/validate-question-bank.mjs` 继续负责静态 100 题；运行时动态题进入后端版本库，并复用或强化同类质量检查，不能在浏览器中追加到 `src/data/questions.ts`。

## 10. 最小交付顺序

1. 同源安全后端、`sessions / answers / next` contract、幂等与运行时校验。
2. 前端新增独立 `TutorSession`，静态 `QuizSession` 保持不变并作为 fallback。
3. choice-only 动态题、私有答案、Structured Outputs 解析和不可变题目版本。
4. 自由回答 rubric 评测、低置信复核和动态错题快照。
5. 飞书 OAuth、异步导入、来源版本、候选题审校和发布。
