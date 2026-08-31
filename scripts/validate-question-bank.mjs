import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const questionFile = path.join(projectRoot, 'src/data/questionBank.ts')
const moduleCache = new Map()

const resolveLocalModule = (specifier, importer) => {
  const base = path.resolve(path.dirname(importer), specifier)
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts')]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

const loadTypeScriptModule = (filename) => {
  const resolvedFile = path.resolve(filename)
  if (moduleCache.has(resolvedFile)) return moduleCache.get(resolvedFile).exports

  const source = fs.readFileSync(resolvedFile, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolvedFile,
  }).outputText

  const module = { exports: {} }
  moduleCache.set(resolvedFile, module)
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) return require(specifier)
    const localFile = resolveLocalModule(specifier, resolvedFile)
    if (!localFile) throw new Error(`无法解析 ${resolvedFile} 中的导入：${specifier}`)
    return loadTypeScriptModule(localFile)
  }

  Function('module', 'exports', 'require', '__filename', '__dirname', compiled)(
    module,
    module.exports,
    localRequire,
    resolvedFile,
    path.dirname(resolvedFile),
  )
  return module.exports
}

const { questions, questionCandidates } = loadTypeScriptModule(questionFile)
const errors = []
const warnings = []

const expectedChapterIds = ['day-24', 'day-25', 'day-26', 'day-27', 'day-28']
const enrichmentFields = [
  'conceptId',
  'stage',
  'format',
  'objectiveId',
  'misconceptionMap',
  'sourceRefs',
  'version',
  'status',
]
const absoluteWords = /一律|永远|完全|只要|只能|所有|任何|必然|无需|从不|唯一|全部/

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const countBy = (key) => questions.reduce((counts, question) => {
  const value = question[key]
  counts[value] = (counts[value] ?? 0) + 1
  return counts
}, {})

assert(Array.isArray(questions), '学习者题库 questions 不是数组')
assert(Array.isArray(questionCandidates), '候选题库 questionCandidates 不是数组')
assert(questions.length >= 120, `已发布题目应不少于 120 题，当前为 ${questions.length}`)
assert(new Set(questions.map((question) => question.id)).size === questions.length, '存在重复题目 ID')
assert(new Set(questions.map((question) => question.prompt)).size === questions.length, '存在重复题干')
assert(
  new Set(questionCandidates.map((question) => question.id)).size === questionCandidates.length,
  '候选题库存在重复题目 ID',
)
assert(
  questionCandidates.every((question) => ['draft', 'published'].includes(question.status)),
  '候选题库存在未知发布状态',
)

const byDay = countBy('sourceDay')
const byChapter = countBy('chapterId')
const byDifficulty = countBy('difficulty')

expectedChapterIds.forEach((chapterId) => {
  assert((byChapter[chapterId] ?? 0) > 0, `${chapterId} 没有已发布题目`)
})
assert(
  Object.keys(byChapter).every((chapterId) => expectedChapterIds.includes(chapterId)),
  '已发布题库包含未登记章节',
)

const difficultyRatio = (difficulty) => (byDifficulty[difficulty] ?? 0) / Math.max(1, questions.length)
assert(difficultyRatio('easy') >= 0.30 && difficultyRatio('easy') <= 0.45, 'easy 题占比应在 30%–45%')
assert(difficultyRatio('medium') >= 0.25 && difficultyRatio('medium') <= 0.40, 'medium 题占比应在 25%–40%')
assert(difficultyRatio('hard') >= 0.20 && difficultyRatio('hard') <= 0.35, 'hard 题占比应在 20%–35%')

const answerPositions = [0, 0, 0, 0]

for (const question of questions) {
  assert(Array.isArray(question.options) && question.options.length === 4, `${question.id} 不是四选一`)
  assert(
    question.options.every((option) => typeof option === 'string' && option.trim())
      && new Set(question.options.map((option) => option.trim())).size === question.options.length,
    `${question.id} 包含空选项或重复选项`,
  )
  assert(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4, `${question.id} 答案索引无效`)
  assert(
    [question.prompt, question.explanation, question.errorGuidance, question.knowledgePoint, question.chapterId]
      .every((value) => typeof value === 'string' && value.trim()),
    `${question.id} 缺少必填内容`,
  )
  assert(
    enrichmentFields.every((field) => {
      const value = question[field]
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'number') return Number.isFinite(value)
      return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0)
    }),
    `${question.id} 缺少课程元数据`,
  )
  assert(
    question.chapterId === `day-${question.sourceDay}`,
    `${question.id} 的 chapterId 与 sourceDay 不一致`,
  )

  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= 4) continue
  answerPositions[question.correctIndex] += 1

  const correct = question.options[question.correctIndex]
  const distractors = question.options.filter((_, index) => index !== question.correctIndex)
  const absoluteDistractors = distractors.filter((option) => absoluteWords.test(option)).length
  if (!absoluteWords.test(correct) && absoluteDistractors >= 2) {
    warnings.push(`${question.id}：至少两个干扰项含明显绝对词，可能暴露答案`)
  }

  const averageDistractorLength = distractors.reduce((sum, option) => sum + option.length, 0) / distractors.length
  if (correct.length > averageDistractorLength * 1.55 && correct.length - averageDistractorLength > 12) {
    warnings.push(`${question.id}：正确项明显长于干扰项，可能形成长度线索`)
  }
}

assert(
  Math.max(...answerPositions) - Math.min(...answerPositions) <= 1,
  `A/B/C/D 答案位置不平衡：${answerPositions.join('/')}`,
)

console.log('题库结构：', {
  total: questions.length,
  byDay,
  byChapter,
  byDifficulty,
  answerPositions,
})

if (warnings.length) {
  console.warn(`\n需要人工复核的质量问题（${warnings.length}）：`)
  warnings.forEach((warning) => console.warn(`- ${warning}`))
  process.exitCode = 1
}

if (errors.length) {
  console.error(`\n校验失败（${errors.length}）：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else if (!warnings.length) {
  console.log('\n题库结构校验通过。')
}
