import type { KnowledgeAuditItem, KnowledgeDay, KnowledgeSource } from '../types'

const sources = {
  whoBehavior: {
    label: 'WHO 行为干预评估指南',
    url: 'https://www.who.int/europe/publications/i/item/WHO-EURO-2022-6045-45810-65956',
  },
  oecdClassification: {
    label: 'OECD AI 系统分类框架',
    url: 'https://oecd.ai/en/ai-publications/framework-classification',
  },
  oecdDefinition: {
    label: 'OECD AI 系统定义说明',
    url: 'https://oecd.ai/en/ai-publications/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system',
  },
  transformer: {
    label: '原始论文：Attention Is All You Need',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  hfArchitectures: {
    label: 'Hugging Face Transformer 架构',
    url: 'https://huggingface.co/docs/course/chapter1/6',
  },
  openAiTokens: {
    label: 'OpenAI Token 说明',
    url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-',
  },
  hfGeneration: {
    label: 'Hugging Face 解码策略',
    url: 'https://huggingface.co/docs/transformers/generation_strategies',
  },
  anthropicFeatures: {
    label: 'Anthropic 特征与神经元研究',
    url: 'https://www.anthropic.com/research/decomposing-language-models-into-understandable-components',
  },
  instructGpt: {
    label: '原始论文：InstructGPT',
    url: 'https://arxiv.org/abs/2203.02155',
  },
  openAiOptimization: {
    label: 'OpenAI 模型优化循环',
    url: 'https://developers.openai.com/api/docs/guides/model-optimization',
  },
  openAiRetrieval: {
    label: 'OpenAI Retrieval 指南',
    url: 'https://developers.openai.com/api/docs/guides/retrieval',
  },
  loraPaper: {
    label: '原始论文：LoRA',
    url: 'https://arxiv.org/abs/2106.09685',
  },
  peft: {
    label: 'Hugging Face PEFT 方法概览',
    url: 'https://huggingface.co/docs/peft/en/methods/overview',
  },
  openAiPrompting: {
    label: 'OpenAI Prompt Engineering',
    url: 'https://developers.openai.com/api/docs/guides/prompt-engineering',
  },
  modelSpec: {
    label: 'OpenAI Model Spec（2026-08-18）',
    url: 'https://model-spec.openai.com/2026-08-18.html',
  },
  mcpArchitecture: {
    label: 'MCP 官方架构规范',
    url: 'https://modelcontextprotocol.io/specification/2025-06-18/architecture',
  },
  openAiAgents: {
    label: 'OpenAI 构建 Agent 实践指南',
    url: 'https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/',
  },
  openAiEvals: {
    label: 'OpenAI Evals 指南',
    url: 'https://developers.openai.com/api/docs/guides/evals',
  },
  codexSkills: {
    label: 'OpenAI 官方 Codex Skills 文档',
    url: 'https://learn.chatgpt.com/docs/build-skills',
  },
  aiLabels: {
    label: '人工智能生成合成内容标识办法',
    url: 'https://www.nrta.gov.cn/art/2025/3/14/art_113_70340.html?xxgkhide=1',
  },
  douyinRules: {
    label: '抖音电商官方创作者规则示例',
    url: 'https://school.jinritemai.com/doudian/wap/article/aHRbnsP5fSGu?from=shop_rules&from_school=1',
  },
} satisfies Record<string, KnowledgeSource>

export const knowledgeDays: KnowledgeDay[] = [
  {
    chapterId: 'day-24',
    day: 24,
    summary: '从“做什么”前移到“为什么值得做”，用用户行为、价值证据和能力边界完成产品判断。',
    clusters: [
      {
        title: '产品机会判断',
        points: [
          '先定义具体用户、情境和未满足任务，再谈功能或模型。',
          '同时看问题强度、发生频率、现有替代方案、切换成本与付费意愿。',
          '区分用户“说想要”、真实行为和可量化结果，优先收集行为证据。',
        ],
      },
      {
        title: '行为成本与验证',
        points: [
          '行为改变往往困难，但“成本最高”只是排序启发，不是通用定律。',
          '将目标行为拆到能力、机会、动机与环境约束，不把失败简化为用户“不懂”。',
          '用基线、小实验和结果指标验证假设，并记录副作用。',
        ],
      },
      {
        title: 'AI 概念坐标',
        points: [
          'AI、机器学习、深度学习、生成式 AI 可以作为入门包含图，但实际分类还会沿任务、输入输出、自主性等多轴交叉。',
          '“人类内容 / AI 内容”描述的是来源与参与方式，不是 AI 技术分类。',
          'ANI / AGI / ASI 适合讨论能力愿景，但需为具体产品改写成可测的任务边界。',
        ],
      },
      {
        title: 'AI 产品人的职业能力',
        points: [
          '产品经理对从问题、方案、交付到结果的完整链路负责，不只产出文档。',
          'AI 产品需多一层模型不确定性、数据、评测、安全与成本素养。',
          '用可复盘的决策、实验和交付证据建立职业竞争力，而不是追逐工具名单。',
        ],
      },
    ],
    takeaway: '把“我有一个 AI 想法”改写成“某类用户的某个行为结果，可以用某项指标验证”。',
    sources: [sources.whoBehavior, sources.oecdClassification, sources.oecdDefinition],
  },
  {
    chapterId: 'day-25',
    day: 25,
    summary: '建立从 AI 历史叙事、模型结构到训练与生成的技术底图，并为所有简化模型标上边界。',
    clusters: [
      {
        title: '发展叙事与能力边界',
        points: [
          '图灵问题→深蓝→ AlphaGo→ ChatGPT 是便于记忆的四节点故事，不是完整 AI 史。',
          '里程碑的取舍服务于叙事目的；评价技术进展时应同时保留评测任务和时代背景。',
          '“2025 看懂物理世界 / 自我设计 / AI 虚拟高官”等属于待核验新闻索引，不能直接升格为长期原理。',
        ],
      },
      {
        title: 'Transformer 结构',
        points: [
          '原始 Transformer 是编码器—解码器架构；现代语言模型还有编码器型、解码器型和编解码型。',
          '完整模块不只有注意力，还包括词元 / 位置表示、前馈网络、残差连接与归一化。',
          '自注意力建模序列内部关系，多头机制让多组投影并行学习不同关系。',
        ],
      },
      {
        title: 'Token、预测与解码',
        points: [
          'Token 是 tokenizer 定义的序列单位，可以是字符、子词、词或字节片段，不等同于一个中文字。',
          '生成模型通常给出下一 Token 的概率分布，产品还需选择贪心、采样、束搜索等解码策略。',
          '温度等参数改变输出分布或选择过程，不等于模型突然获得或失去事实知识。',
        ],
      },
      {
        title: '参数、微调与幻觉',
        points: [
          '参数是训练得到的数值，概念通常分布在多维激活中；不应把权重矩阵的每一行当成已命名的知识神经元。',
          'SFT 用示例更新参数，可改变任务行为并可能内化训练中的模式 / 事实，但不保证可靠召回与时效性。',
          'LoRA 是低秩权重更新，PEFT 是参数高效微调方法族；节省资源不等于所有场景都更好。',
          '幻觉是未被依据支持或与事实冲突的输出；创造性是新颖性、多样性与适切性，应分开评测。',
        ],
      },
    ],
    takeaway: '用“架构 + 训练 + 解码 + 评测”四层来解释模型现象，避免用一个比喻解释全部。',
    sources: [
      sources.transformer,
      sources.hfArchitectures,
      sources.openAiTokens,
      sources.hfGeneration,
      sources.instructGpt,
      sources.peft,
    ],
  },
  {
    chapterId: 'day-26',
    day: 26,
    summary: '把 Prompt 当成可测的产品配置，把 MCP 当成连接能力的协议，把工具调用当成有权限与失败模式的系统行为。',
    clusters: [
      {
        title: 'Prompt 的结构化表达',
        points: [
          '明确任务目标、必要背景、输入边界、输出格式、约束与成功标准。',
          '只在能表达边界时添加示例，并使示例覆盖真实输入的多样性。',
          '修改 Prompt 后运行固定评测集，不靠单次对话的“感觉更好”。',
        ],
      },
      {
        title: '指令层级与不可信数据',
        points: [
          '在 OpenAI API 语境中，System 高于 Developer，Developer 高于 User；当前 Model Spec 还有 Root 与 Guideline 层。',
          '工具返回、网页、附件和引用文本是数据，默认不获得指令权威。',
          '隔离不可信内容、最小化权限，并在外部副作用前增加确认和校验。',
        ],
      },
      {
        title: 'MCP 的能力连接',
        points: [
          'MCP 是 Host—Client—Server 架构，Host 负责编排、授权与上下文边界。',
          'Server 可暴露 Prompts、Resources 与 Tools，各自的发现方式和控制主体不同。',
          '协议解决发现和调用约定，不自动解决业务权限、数据质量、结果真实性与撤销。',
        ],
      },
      {
        title: 'Prompt / Retrieval / 微调的选择',
        points: [
          '当模型已有能力，先用 Prompt 提供目标、约束与少量示例。',
          '当信息私有、频繁更新或需可追溯时，优先考虑 Retrieval / RAG。',
          '当需要稳定的任务行为、格式或专用模式，再评估微调；不存在 30% / 50% 的通用阈值。',
        ],
      },
    ],
    takeaway: '任何 Prompt 或工具接入都要有版本、评测集、权限边界和失败处理。',
    sources: [sources.openAiPrompting, sources.modelSpec, sources.mcpArchitecture, sources.openAiOptimization, sources.openAiRetrieval],
  },
  {
    chapterId: 'day-27',
    day: 27,
    summary: '用单 Agent 先验证端到端价值，将自由决策放在需要语义判断的环节，将可预知流程收敛为确定性代码。',
    clusters: [
      {
        title: '单 Agent 最小结构',
        points: [
          '核心元素是模型、指令和工具，产品实现还需状态、运行循环与明确退出条件。',
          '工具数量不等于智能程度；更少、语义清晰、可测的工具通常更易维护。',
          '先让一个 Agent 在有限范围内稳定，再根据可观测的失败模式考虑拆分。',
        ],
      },
      {
        title: '确定流程 + Agentic 决策',
        points: [
          '认证、参数校验、计费、审批与可重试逻辑适合确定性代码。',
          '意图理解、异常语义判断、动态选择与非结构化信息处理可交给 Agent。',
          '真实系统常是混合编排，而不是“工作流”和“Agent”二选一。',
        ],
      },
      {
        title: '工具合同与风险边界',
        points: [
          '工具名称、描述、参数 schema、返回值和错误应该少歧义并可自动校验。',
          '为调用设置超时、重试、幂等、速率和成本限制，并保留可审计记录。',
          '发送、付款、删除、发布等高影响动作需要额外确认、最小权限和可恢复方案。',
        ],
      },
      {
        title: '验收与运营',
        points: [
          '用真实任务集和失败分类验收，同时看任务成功率、事实性、工具正确率与副作用。',
          '将质量与延迟、成本、需人工介入率一起衡量，避免只看演示成功。',
          '上线后保留 tracing、反馈、回放和回归评测，将新失败转化为新用例。',
        ],
      },
    ],
    takeaway: '验收 Agent 的对象不是一次漂亮回答，而是在真实输入分布下的整体任务系统。',
    sources: [sources.openAiAgents, sources.openAiEvals, sources.modelSpec],
  },
  {
    chapterId: 'day-28',
    day: 28,
    summary: '将 AI 写作从“一次生成”升级为可编辑、可核验、可发布、可沉淀的内容工程，再把稳定流程封装为 Skill。',
    clusters: [
      {
        title: '文章生成的输入合同',
        points: [
          '生成前明确主题、目标读者、渠道、内容目标、中心论点、语气、长度和禁区。',
          '证据包要分开原始资料、已核验事实、作者观点与待确认说法。',
          '先生成大纲和论证结构，确认后再生成段落，减少结构错误的返工。',
        ],
      },
      {
        title: '人机协作的校审流程',
        points: [
          '将事实核验、引用追溯、逻辑反驳、风格统一、平台改写拆成独立步骤。',
          '为关键主张保留证据链，无来源的数字、引语、人物与新闻不应自动通过。',
          '人类编辑对立场、伤害、隐私、声誉、法律与最终发布负责。',
        ],
      },
      {
        title: 'Skills 的沉淀方式',
        points: [
          'Skill 是具体产品中的能力封装；目录、触发和加载规则应以当前官方文档为准。',
          '当前 Codex 采用渐进式披露：先读名称与描述，命中后再读完整 SKILL.md。',
          '最小目录包含 SKILL.md，可选 scripts/、references/、assets/；只在需确定行为或外部工具时添加脚本。',
        ],
      },
      {
        title: '发布、合规与复盘',
        points: [
          '标题、摘要、封面文案和正文是不同的信息层，应分别验收可读性与真实性。',
          '记录平台、规则版本、查询日期和生效日；“最佳发布时间”不是静态知识。',
          '发布后将阅读、完读、收藏、转化和负反馈回流到选题与评测集。',
          '涉及 AI 生成合成内容时，核对当前法规和所在平台的显式 / 隐式标识要求。',
        ],
      },
    ],
    takeaway: '高质量 AI 写作的产物不只是文章，还包括可追溯证据、编辑决策、发布版本与可复用流程。',
    sources: [sources.codexSkills, sources.aiLabels, sources.douyinRules],
  },
]

export const knowledgeAuditItems: KnowledgeAuditItem[] = [
  {
    id: 'behavior-cost',
    day: 24,
    title: '行为成本是启发，不是定律',
    classroomClaim: '“改变人的行为成本最高，产品应尽量避免行为改变。”',
    rigorousUnderstanding: '这是有用的产品排序启发，但成本取决于能力、机会、动机、环境和介入强度。有些产品的核心价值恰好是帮助用户建立新行为。',
    action: '写出目标行为和障碍假设，建基线，用小实验测转化、持续性与副作用。',
    status: 'needs-context',
    confidence: 'high',
    sources: [sources.whoBehavior],
  },
  {
    id: 'ai-taxonomy',
    day: 24,
    title: 'AI 分类不只有一棵包含树',
    classroomClaim: '“AI 包含 ML，ML 包含深度学习，再分人类内容与 AI 内容。”',
    rigorousUnderstanding: '包含图可帮助入门，但 AI 系统还会沿场景、数据、模型、任务输出、自主性等多维交叉分类。“人类 / AI 内容”是内容来源标记，不是技术分类学。',
    action: '为每次分类先写“分类目的与维度”，不混用技术、能力、输出来源和风险标签。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.oecdClassification, sources.oecdDefinition],
  },
  {
    id: 'agi-labels',
    day: 24,
    title: 'ANI / AGI / ASI 没有统一操作定义',
    classroomClaim: '“ANI、AGI、ASI 是界限清晰、可客观判定的三个发展等级。”',
    rigorousUnderstanding: '这些标签对战略讨论有用，却没有被全行业接受的任务集、阈值和自主性标准。不同机构对“通用”的要求不同。',
    action: '产品文档中改用任务范围、成功率、迁移能力、自主程度与人工介入阈值。',
    status: 'needs-context',
    confidence: 'high',
    sources: [sources.oecdDefinition],
  },
  {
    id: 'history-and-headlines',
    day: 25,
    title: '教学叙事与年度新闻要分层',
    classroomClaim: '“图灵问题→深蓝→AlphaGo→ChatGPT 就是 AI 发展史；2025 的能力 / 人物案例可直接进知识库。”',
    rigorousUnderstanding: '四节点是主观但有用的教学叙事，会省略专家系统、统计学习、数据 / 硬件等主线。“看懂物理世界”、“自我设计”、“AI 虚拟高官”等是强时效主张，需原始来源与当时状态。',
    action: '为新闻型知识保留事件日期、原始来源、核验日期、证据强度和“已证实 / 待核实 / 已过期”状态。',
    status: 'time-sensitive',
    confidence: 'high',
    sources: [sources.oecdDefinition, sources.openAiEvals],
  },
  {
    id: 'hallucination-creativity',
    day: 25,
    title: '幻觉不是创造力的代名词',
    classroomClaim: '“幻觉是模型创造力的副作用，降低幻觉就会损失创造力。”',
    rigorousUnderstanding: '两者可能受采样与任务设置共同影响，但不是同一概念。幻觉关于主张是否有依据，创造力关于新颖性、多样性与任务适切性，可以分开优化。',
    action: '事实任务评引用支持率 / 准确率，创意任务另评多样性、新颖性和符合简报程度。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.openAiEvals, sources.hfGeneration],
  },
  {
    id: 'transformer-architecture',
    day: 25,
    title: 'LLM 不都相同，Transformer 也不只有注意力',
    classroomClaim: '“所有 LLM 都是同样的 decoder-only Transformer；Transformer 就是 attention。”',
    rigorousUnderstanding: '语言模型可用编码器、解码器或编码器—解码器等架构，训练目标和多模态组件也不同。原始 Transformer 除注意力外还有 FFN、残差、归一化和位置表示。',
    action: '讲某个模型时列明具体架构、训练目标、上下文机制和解码方式，不用“LLM 都是……”。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.transformer, sources.hfArchitectures],
  },
  {
    id: 'tokens-and-weights',
    day: 25,
    title: '不要把 Token 与权重讲成整齐的字典',
    classroomClaim: '“一个中文字就是一个 Token，模型每次都选概率最高的字；权重矩阵每行是一个已命名概念神经元。”',
    rigorousUnderstanding: 'Token 边界由编码器、语言与文本决定；生成可用贪心、采样、束搜索等策略。模型内部概念常以分布式 / 叠加特征表示，一个神经元可对多种不相关语境激活。',
    action: '分别用 tokenizer 可视化、解码参数对比和特征激活实验来演示，将类比标注为简化模型。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.openAiTokens, sources.hfGeneration, sources.anthropicFeatures],
  },
  {
    id: 'sft-rag-choice',
    day: 25,
    title: 'SFT 和方案选择必须回到评测',
    classroomClaim: '“SFT 只改语气不改知识；知识差 30% 用 RAG、50% 以上才微调。”',
    rigorousUnderstanding: 'SFT 会更新参数并改变行为，也可能内化训练中的模式或事实，但不是可靠的时效知识库。Prompt、Retrieval / RAG 与微调的选择取决于失败类型、时效、可追溯、成本和质量，没有通用百分比法则。',
    action: '先写代表性 evals 建基线，再对 Prompt、Retrieval 和微调候选方案做质量—延迟—成本对比。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.instructGpt, sources.openAiOptimization, sources.openAiRetrieval],
  },
  {
    id: 'lora-peft',
    day: 25,
    title: 'LoRA / PEFT 的性价比取决于上下文',
    classroomClaim: '“LoRA 参数少、训练快，所以总是比全量微调更好。”',
    rigorousUnderstanding: 'LoRA 冻结基础权重并学习低秩更新，通常降低可训参数、存储与显存需求；但表达能力、目标层、rank、数据、基座模型和推理部署都会改变结果。',
    action: '对实际硬件记录质量、训练显存 / 时间、适配器切换成本、推理延迟与能力保留。',
    status: 'needs-context',
    confidence: 'high',
    sources: [sources.loraPaper, sources.peft],
  },
  {
    id: 'instruction-hierarchy',
    day: 26,
    title: '有层级的是指令，工具输出是不可信数据',
    classroomClaim: '“System > Developer > User，所以工具返回的命令也会自动加入层级。”',
    rigorousUnderstanding: 'OpenAI 当前公开规范中还有 Root 与 Guideline 权威层；对 API 消息角色而言，System > Developer > User。工具输出、附件、网页与引用内容默认无指令权威，其中的命令应当作数据。',
    action: '在工具边界做结构化隔离、输入 / 输出验证和最小权限，高影响动作增加人工确认。',
    status: 'needs-correction',
    confidence: 'high',
    sources: [sources.modelSpec],
  },
  {
    id: 'workflow-agent',
    day: 27,
    title: 'Agent 常与确定性工作流混合',
    classroomClaim: '“使用 Agent 就应把整个任务交给模型自主规划，确定性工作流不算 Agent。”',
    rigorousUnderstanding: 'Agent 的价值是在模糊、例外多、需语义判断的节点控制流程。身份验证、业务规则、权限、重试和高风险动作等可继续用确定性代码。',
    action: '在流程图中标出“模型决策 / 规则决策 / 人类决策”，分别定义退出条件、追踪与验收。',
    status: 'needs-context',
    confidence: 'high',
    sources: [sources.openAiAgents],
  },
  {
    id: 'skills-and-publishing',
    day: 28,
    title: 'Skills 与发布规则都有版本语境',
    classroomClaim: '“Skill 的目录 / 加载规则是行业通用定义；记住一套平台发布规则就能长期使用。”',
    rigorousUnderstanding: 'Skill 行为由宿主产品实现决定。当前 Codex 官方文档确认渐进式披露、SKILL.md 以及可选 scripts / references / assets，但后续仍可变更。发布规则、流量机制和 AI 标识要求同样有更新日与生效日。',
    action: '知识库记录产品 / 平台、规则版本、官方链接、核验日和下次复核日；发布前重新查官方规则。',
    status: 'time-sensitive',
    confidence: 'high',
    sources: [sources.codexSkills, sources.aiLabels, sources.douyinRules],
  },
]

