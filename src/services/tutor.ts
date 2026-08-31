import type {
  LearningConcept,
  LearningStage,
  TutorActivity,
  TutorAdapter,
  TutorEvaluation,
  TutorEvaluationRequest,
} from '../types'

export const tutorStageOrder: LearningStage[] = [
  'recall',
  'distinguish',
  'guided',
  'independent',
  'transfer',
]

export const tutorStageMeta: Record<LearningStage, { label: string; description: string }> = {
  diagnostic: { label: '入口诊断', description: '不扣分地找到起点' },
  recall: { label: '讲清概念', description: '不看原文，用自己的话说出核心' },
  distinguish: { label: '划清边界', description: '识别一个看似合理的误区' },
  guided: { label: '跟着范例', description: '从完整例子里找到判断依据' },
  independent: { label: '独立判断', description: '撤掉提示，自己完成一次推理' },
  transfer: { label: '迁移 Boss', description: '把同一原理用到没见过的情境' },
  review: { label: '间隔复习', description: '隔一段时间再次主动提取' },
}

const clean = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')
const trimSentenceEnd = (value: string) => value.replace(/[。；；,.!?]+$/g, '')

const containsSignal = (answer: string, signal: string) => {
  const normalizedSignal = clean(signal)
  return normalizedSignal.length > 1 && clean(answer).includes(normalizedSignal)
}

const getVariant = (seed: string) => Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2

export function createTutorActivity(
  concept: LearningConcept,
  stage: LearningStage,
  variant = 0,
): TutorActivity {
  const misconception = concept.misconceptions[variant % Math.max(1, concept.misconceptions.length)]
  const id = `${concept.id}:${stage}:v${variant + 1}`
  const expectedAnswer = `${concept.plainDefinition} ${concept.keyPoints[0] ?? ''}`.trim()

  if (stage === 'diagnostic') {
    return {
      id,
      conceptId: concept.id,
      stage,
      context: '这是不计分的起点检查，不用猜标准原文。',
      prompt: `在看微课之前，请说说你对「${concept.title}」的当前理解：它解决什么判断问题？你最不确定的是哪里？`,
      expectedAnswer,
      acceptedSignals: concept.answerSignals,
      hint: '诊断不追求完整，先说出你现在真正相信的答案。',
    }
  }

  if (stage === 'review' && variant === 0) {
    return {
      id,
      conceptId: concept.id,
      stage,
      context: '这次不重读课文，直接检查你还能否主动提取。',
      prompt: `请回忆「${concept.title}」：写出一个核心条件，再举一个不符合它的反例。`,
      expectedAnswer: `${concept.keyPoints[0] ?? concept.plainDefinition} 反例：${concept.counterexample}`,
      acceptedSignals: concept.answerSignals,
      hint: `先想「什么时候才能用」，再想「少了哪个条件就不成立」。`,
    }
  }

  if (stage === 'distinguish' && misconception) {
    const accurateFirst = getVariant(`${concept.id}-${variant}`) === 0
    const accurate = concept.plainDefinition
    const misleading = misconception.label
    return {
      id,
      conceptId: concept.id,
      stage,
      prompt: `哪个说法更准确？先选 A 或 B，再用一句话说明理由。\n\nA. ${accurateFirst ? accurate : misleading}\n\nB. ${accurateFirst ? misleading : accurate}`,
      expectedAnswer: `${accurateFirst ? 'A' : 'B'} 更准确。${misconception.explanation}`,
      acceptedSignals: [accurateFirst ? 'A' : 'B', ...concept.answerSignals],
      hint: `先问自己：哪个说法保留了适用条件，而不是把它说成一条永远正确的定律？`,
      misconceptionId: misconception.id,
    }
  }

  if ((stage === 'recall' || stage === 'review') && variant > 0 && misconception) {
    return {
      id,
      conceptId: concept.id,
      stage,
      context: `有人说：「${misconception.label}」`,
      prompt: `这句话哪里不准确？请先指出被偷换的条件，再用你自己的话改写。`,
      expectedAnswer: `${misconception.explanation} ${expectedAnswer}`,
      acceptedSignals: concept.answerSignals,
      hint: `对照定义：${concept.plainDefinition}`,
      misconceptionId: misconception.id,
    }
  }

  if (stage === 'guided') {
    const useCounterexample = variant % 2 === 1
    return {
      id,
      conceptId: concept.id,
      stage,
      context: `${useCounterexample ? '待修复范例' : '完整范例'}：${useCounterexample ? concept.counterexample : concept.example}`,
      prompt: useCounterexample
        ? `先找出这个做法缺了哪个关键条件，再补上一步可检查的行动。`
        : `这个例子里，真正起作用的判断依据是什么？不要只复述结果。`,
      expectedAnswer,
      acceptedSignals: concept.answerSignals,
      hint: concept.keyPoints[0] ?? concept.plainDefinition,
    }
  }

  if (stage === 'independent') {
    const challengeMisconception = variant > 0 && misconception
    return {
      id,
      conceptId: concept.id,
      stage,
      context: challengeMisconception ? `同事提议：「${misconception.label}」` : undefined,
      prompt: challengeMisconception
        ? `你会如何反驳这个提议，并给出一个第一步就能执行的替代做法？`
        : `现在撤掉范例。假设你明天要在一个新项目中运用「${concept.title}」，你会先检查什么，再做什么？`,
      expectedAnswer: `${concept.keyPoints.slice(0, 2).join('；')}`,
      acceptedSignals: concept.answerSignals,
      hint: `先从目标和边界中找判断依据，再给出可检查的行动。`,
    }
  }

  if (stage === 'transfer') {
    return {
      id,
      conceptId: concept.id,
      stage,
      context: `Boss 情境：${concept.counterexample}`,
      prompt: `这个做法错在哪里？请指出它违反的核心条件，并给出一个更好的改法。`,
      expectedAnswer: `${concept.plainDefinition} ${concept.keyPoints.join('；')}`,
      acceptedSignals: concept.answerSignals,
      hint: `对照「${concept.title}」的适用边界：这个做法把哪个前提偷换掉了？`,
    }
  }

  return {
    id,
    conceptId: concept.id,
    stage,
    prompt: `不看笔记，请用 1–2 句自己的话解释「${concept.title}」。同时说出：它是什么，以及它不等于什么。`,
    expectedAnswer,
    acceptedSignals: concept.answerSignals,
    hint: `${concept.plainDefinition} 再想想它和「${concept.misconceptions[0]?.label ?? '相似说法'}」的差别。`,
  }
}

const findMisconception = (request: TutorEvaluationRequest) => {
  const normalized = clean(request.answer)
  const hasExplicitNegation = /(不是|不等于|不能|并非|不应|避免)/.test(request.answer)
  if (hasExplicitNegation) return undefined

  return request.concept.misconceptions.find((item) =>
    item.triggers?.some((trigger) => normalized.includes(clean(trigger))),
  )
}

class LocalTutorAdapter implements TutorAdapter {
  readonly mode = 'local' as const

  async evaluate(request: TutorEvaluationRequest): Promise<TutorEvaluation> {
    await new Promise((resolve) => window.setTimeout(resolve, 420))

    const answer = request.answer.trim()
    if (request.activity.stage === 'diagnostic') {
      return {
        verdict: 'partial',
        briefFeedback: '起点已记录，这题不计分。',
        explanation: `你现在的理解将用来决定后面要多讲哪一步。${request.concept.plainDefinition}`,
        answerComparison: '诊断不要求标准答案，只保留你真实的起点。',
        nextStep: '先看一段微课，再关掉笔记主动提取。',
        nextAction: 'advance',
      }
    }
    const signalHits = Array.from(new Set(
      request.activity.acceptedSignals.filter((signal) => containsSignal(answer, signal)),
    ))
    const choiceMatch = request.activity.stage === 'distinguish'
      ? new RegExp(`(^|[\u9009\u62e9\u662f])\\s*${request.activity.acceptedSignals[0]}`, 'i').test(answer)
      : true
    const misconception = findMisconception(request)
      ?? (request.activity.stage === 'distinguish' && !choiceMatch
        ? request.concept.misconceptions.find((item) => item.id === request.activity.misconceptionId)
        : undefined)
    const threshold = request.activity.stage === 'guided' ? 1 : Math.min(2, request.concept.answerSignals.length)

    let verdict: TutorEvaluation['verdict'] = 'incorrect'
    if (misconception) verdict = 'misconception'
    else if (answer.length >= 8 && choiceMatch && signalHits.length >= threshold) verdict = 'correct'
    else if (answer.length >= 5 && (signalHits.length > 0 || choiceMatch && request.activity.stage === 'distinguish')) verdict = 'partial'

    const explanation = `${request.concept.plainDefinition}\n\n判断时抓住：${request.concept.keyPoints.slice(0, 2).map(trimSentenceEnd).join('；')}。`
    const comparison = verdict === 'correct'
      ? `你的回答已经抓到「${signalHits.join('、') || request.concept.title}」这个核心。`
      : misconception
        ? `你的表述接近常见误区「${misconception.label}」。${misconception.explanation}`
        : `你已经给出了部分方向，但还缺少可用来判断的条件。可对照参考答案：${request.activity.expectedAnswer}`

    return {
      verdict,
      briefFeedback: verdict === 'correct'
        ? '对了，你抓住了判断依据。'
        : verdict === 'partial'
          ? '方向对了，但还差一个关键条件。'
          : '先不跳过：这里暴露了一个值得修复的混淆。',
      explanation,
      answerComparison: comparison,
      nextStep: verdict === 'correct'
        ? '进入下一种思维动作。'
        : `先用「${request.concept.title}」的定义重写一句，再处理同类问题。`,
      misconceptionId: misconception?.id,
      nextAction: verdict === 'correct' ? 'advance' : verdict === 'partial' ? 'probe' : 'remediate',
    }
  }
}

const isTutorEvaluation = (value: unknown): value is TutorEvaluation => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<TutorEvaluation>
  const isText = (text: unknown, max = 6_000) => typeof text === 'string' && text.trim().length > 0 && text.length <= max
  const validNextActivity = !item.nextActivity || (
    isText(item.nextActivity.id, 160)
    && isText(item.nextActivity.conceptId, 160)
    && item.nextActivity.stage in tutorStageMeta
    && isText(item.nextActivity.prompt, 4_000)
    && isText(item.nextActivity.hint, 2_000)
    && (item.nextActivity.context === undefined || isText(item.nextActivity.context, 4_000))
  )
  return validNextActivity
    && ['correct', 'partial', 'misconception', 'incorrect'].includes(item.verdict ?? '')
    && isText(item.briefFeedback, 1_000)
    && isText(item.explanation)
    && isText(item.answerComparison, 4_000)
    && isText(item.nextStep, 2_000)
    && ['advance', 'probe', 'remediate'].includes(item.nextAction ?? '')
}

class HttpTutorAdapter implements TutorAdapter {
  readonly mode = 'connected' as const

  constructor(private readonly endpoint: string) {}

  async evaluate(request: TutorEvaluationRequest): Promise<TutorEvaluation> {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 25_000)
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId,
        },
        signal: controller.signal,
        body: JSON.stringify({
          apiVersion: '1',
          requestId,
          sessionId: request.sessionId,
          conceptId: request.concept.id,
          activityId: request.activity.id,
          stage: request.activity.stage,
          context: request.activity.context,
          prompt: request.activity.prompt,
          answer: request.answer.slice(0, 2_000),
          confidence: request.confidence,
          usedHint: request.usedHint,
          recentAttempts: request.recentAttempts.slice(-4).map((attempt) => ({
            stage: attempt.stage,
            verdict: attempt.verdict,
            misconceptionId: attempt.misconceptionId,
          })),
        }),
      })

      if (!response.ok) throw new Error(`教练服务暂时不可用（${response.status}）`)
      const result: unknown = await response.json()
      if (!isTutorEvaluation(result)) throw new Error('教练服务返回了无法识别的结果')
      if (result.nextActivity && result.nextActivity.conceptId !== request.concept.id) {
        throw new Error('教练服务返回了越出当前课程的问题')
      }
      return result
    } finally {
      window.clearTimeout(timeout)
    }
  }
}

export const createTutorAdapter = (): TutorAdapter => {
  const endpoint = import.meta.env.VITE_TUTOR_ENDPOINT?.trim()
  return endpoint ? new HttpTutorAdapter(endpoint) : new LocalTutorAdapter()
}
