# 知越岛 · AI 知识闯关

一个独立的 React + TypeScript + Vite 学习应用，把 24—28 号飞书学习笔记组织成可闯关、可复习、可由 AI 私教陪练的知识群岛。

## 版本

- `v1` 分支 / `V1` 标签：原始仪表盘、章节练习、错题翻卡和记忆卡版本。
- `v2` 分支：当前知越岛版本；首页改为曲折群岛航线，并保留 V1 的答题、错题、卡片、报告、导入和 AI 私教能力。
- `V2` 标签只在群岛版本通过生产构建与浏览器验收后创建。

## 本地运行

```bash
npm install
npm run dev
```

生产检查：

```bash
npm run validate:questions
npm run validate:journey
npm run typecheck
npm run build
```

`validate:questions` 会锁定题库总量、五日与三档难度分布、唯一 ID、四选一结构、A/B/C/D 答案位置平衡，并阻止明显绝对词或选项长度暴露正解的题目进入题库。`validate:journey` 额外检查群岛依赖无环、关卡题池非空、递进结构和越级挑战规则。

本项目作为独立仓库维护，不会修改或覆盖个人作品集的源码与构建产物。

## 已实现

- V2 群岛首页：港口、森林、水晶、钟楼、书院与终点灯塔沿 S 形航线分布，完成、当前、可挑战、锁定和薄弱状态不只依赖颜色表达
- 每座知识岛按“概念基础 → 边界辨析 → 独立应用 → 岛主挑战”递进；越级挑战要求 10 题至少 90%、最多错 1 题，且每天只有一次机会
- 学习首页、章节地图，以及简单 / 困难 / 地狱三级独立题池；每轮开始前必须明确选档，不跨难度混题
- 知识脉络页：按五天归纳知识，并用“课堂说法 → 严谨理解 → 行动建议”审校关键概念
- 答对后短暂确认并自动进入下一题
- 答错后整张问题卡 3D 翻面，以完整背面展示原题、错误答案、正确答案、详细解析、误区和针对性提醒
- 地狱难度默认开启可关闭的“毒舌教练”，只针对错误思路给出有冲击的反馈，不做人身攻击
- XP、爱心、连续学习天数、等级、成就和每日目标
- 持久化错题本、间隔复习时间和“连续两次答对后掌握”机制
- 记忆卡：内置题动态转卡，支持先写本轮回答、3D 翻面、自评和 1 / 3 / 7 / 14 天渐进复习
- 自建记忆卡支持问题、答案与可选标签的新增、编辑、二次确认删除，并保存在当前浏览器
- 学习报告、章节掌握度、近七天活跃记录
- 飞书链接登记、粘贴知识预解析、导入历史
- 键盘 1—4 作答、焦点管理、`aria-live` 反馈和减少动态效果支持
- 所有学习状态保存在浏览器 `localStorage`

## 题库接口

题库在 `src/data/questions.ts` 中导出：

```ts
export const questions: Question[] = []
```

`Question` 定义位于 `src/types/index.ts`。核心字段包括 `prompt`、`options`、`correctIndex`、`explanation`、`errorGuidance`、`knowledgePoint`、`chapterId` 和 `difficulty`。

记忆卡不复制维护另一套内置数据：页面会从 `questions` 动态生成正面原题，以及包含正确答案与解析的背面。自建卡片和每张卡片的复习阶段保存在同一份本地学习状态中；旧版状态加载时会自动补齐这些字段。

章节 ID 固定为：

- `day-24`
- `day-25`
- `day-26`
- `day-27`
- `day-28`

## 未来飞书 / 知识生成接口

适配器定义在 `src/services/ingestion.ts`：

```ts
interface KnowledgeIngestionAdapter {
  ingest(request: KnowledgeIngestionRequest): Promise<KnowledgeIngestionResult>
}
```

配置环境变量后，前端会自动从本地预览适配器切换到 HTTP 适配器：

```bash
VITE_INGESTION_ENDPOINT=https://example.com/api/knowledge/ingest
```

请求示例：

```json
{
  "title": "8 月 29 日 AI 产品笔记",
  "sourceUrl": "https://my.feishu.cn/wiki/...",
  "pastedContent": "可选的原文内容",
  "requestedQuestionCount": 10
}
```

响应示例：

```json
{
  "importRecord": {
    "id": "import-001",
    "title": "8 月 29 日 AI 产品笔记",
    "sourceType": "feishu",
    "excerpt": "内容摘要",
    "knowledgePointCount": 8,
    "suggestedQuestionCount": 10,
    "status": "ready",
    "createdAt": "2026-08-30T10:00:00.000Z"
  },
  "questions": []
}
```

服务端应负责飞书 OAuth、权限校验、文档读取、去重、冲突 / 时效性检查、生成题目和内容审校。候选题不应未经审核直接进入正式计分题库。

## 对话学习教练

前端已提供「AI 私教」课程入口：它按先修关系组织知识点，通过微课、概念提取、辨析、范例、独立判断和迁移逐步推进，并将自由回答的掌握证据保存在本机。未配置后端时使用透明标注的本地关键信号判定，不会伪装成语义 Agent。

如需实时语义判定、动态追问与出题，可将 `VITE_TUTOR_ENDPOINT` 指向产品控制的同源路径或可信后端 URL。后端再调用 Responses API；浏览器不会保存或接触 `OPENAI_API_KEY`，也不能把任何密钥放入 `VITE_*` 变量。

当前静态题库仍可脱离联网服务独立使用。本地教练不具备真正的多轮语义理解或私有飞书读取能力。课程阶段、错误补救、掌握阈值和题目质量门见 [课程与题库设计准则](docs/learning-design.md)；完整的会话 contract、`requestId` 幂等、运行时校验、后端持有的 `previous_response_id`、Structured Outputs schema、飞书不可信内容边界，以及候选题 `draft → 审校 → published` 流程见 [对话学习教练 API 设计](docs/tutor-api.md)。

## 数据与隐私

- 当前版本不上传学习记录。
- 浏览器无法读取没有公开权限的飞书文档；仅登记链接，等待后端授权服务处理。
- “清空本机进度”会移除 XP、错题、成就、导入历史和记忆卡复习阶段，但不会改动静态题库，也不会删除自建卡片。
