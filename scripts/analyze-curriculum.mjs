import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const questionFile = path.join(projectRoot, 'src/data/questionBank.ts')
const curriculumFile = path.join(projectRoot, 'src/data/curriculum.ts')
const strict = process.argv.includes('--strict')

const expectedChapterIds = ['day-24', 'day-25', 'day-26', 'day-27', 'day-28']
const expectedCurriculumNodeCount = 20
const knownStages = [
  'diagnostic',
  'recall',
  'distinguish',
  'guided',
  'independent',
  'transfer',
  'review',
]
const knownFormats = ['single-choice', 'free-response', 'ordering', 'find-error', 'worked-example']
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
    if (path.extname(localFile) === '.json') return JSON.parse(fs.readFileSync(localFile, 'utf8'))
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

const isFilled = (value) => {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return value === true
}

const countBy = (items, selector) => items.reduce((counts, item) => {
  const key = selector(item) ?? '(missing)'
  counts[key] = (counts[key] ?? 0) + 1
  return counts
}, {})

const percentage = (count, total) => total === 0 ? 0 : count / total
const formatPercentage = (ratio) => `${(ratio * 100).toFixed(1)}%`

const looksLikeCurriculumNode = (value) => Boolean(
  value
  && typeof value === 'object'
  && typeof value.id === 'string'
  && typeof value.title === 'string'
  && typeof value.chapterId === 'string'
  && (
    typeof value.objective === 'string'
    || typeof value.plainDefinition === 'string'
    || Array.isArray(value.prerequisiteIds)
    || Array.isArray(value.recommendedStages)
  ),
)

const findCurriculumNodes = (moduleExports) => {
  const found = new Map()
  const visited = new Set()

  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 4 || visited.has(value)) return
    visited.add(value)

    if (looksLikeCurriculumNode(value)) {
      found.set(value.id, value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1))
      return
    }

    Object.values(value).forEach((child) => visit(child, depth + 1))
  }

  visit(moduleExports)
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id))
}

const issues = []
const addIssue = (condition, message) => {
  if (!condition) issues.push(message)
}

let questions
try {
  const questionModule = loadTypeScriptModule(questionFile)
  questions = questionModule.questions
  if (!Array.isArray(questions)) throw new Error('questions 导出不是数组')
} catch (error) {
  console.error(`无法读取题库：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

const chapterCounts = countBy(questions, (question) => question.chapterId)
const difficultyCounts = countBy(questions, (question) => question.difficulty)

console.log(`课程审计模式：${strict ? 'strict' : 'baseline'}`)
console.log('\n题库概览')
console.log(`- 总题数：${questions.length}`)
console.log(`- 章节：${JSON.stringify(chapterCounts)}`)
console.log(`- 难度：${JSON.stringify(difficultyCounts)}`)

addIssue(questions.length >= 100, `题目总数低于 100：${questions.length}`)
expectedChapterIds.forEach((chapterId) => {
  addIssue((chapterCounts[chapterId] ?? 0) > 0, `章节 ${chapterId} 没有题目`)
})
addIssue(
  Object.keys(chapterCounts).every((chapterId) => expectedChapterIds.includes(chapterId)),
  '题库包含未登记章节',
)

const totalDifficulty = ['easy', 'medium', 'hard']
  .reduce((sum, difficulty) => sum + (difficultyCounts[difficulty] ?? 0), 0)
addIssue(totalDifficulty === questions.length, '存在 easy / medium / hard 之外的难度值')
addIssue(percentage(difficultyCounts.easy ?? 0, questions.length) >= 0.30, 'easy 占比低于 30%')
addIssue(percentage(difficultyCounts.easy ?? 0, questions.length) <= 0.45, 'easy 占比高于 45%')
addIssue(percentage(difficultyCounts.medium ?? 0, questions.length) >= 0.25, 'medium 占比低于 25%')
addIssue(percentage(difficultyCounts.medium ?? 0, questions.length) <= 0.40, 'medium 占比高于 40%')
addIssue(percentage(difficultyCounts.hard ?? 0, questions.length) >= 0.20, 'hard 占比低于 20%')
addIssue(percentage(difficultyCounts.hard ?? 0, questions.length) <= 0.35, 'hard 占比高于 35%')

console.log('\n课程字段填充率')
for (const field of enrichmentFields) {
  const filled = questions.filter((question) => isFilled(question[field])).length
  const ratio = percentage(filled, questions.length)
  console.log(`- ${field}: ${filled}/${questions.length} (${formatPercentage(ratio)})`)
  addIssue(filled === questions.length, `${field} 填充率未达到 100%`)
}

const validChoiceQuestions = questions.filter((question) => (
  Array.isArray(question.options)
  && question.options.length > 0
  && Number.isInteger(question.correctIndex)
  && question.correctIndex >= 0
  && question.correctIndex < question.options.length
))
const uniqueLongestCorrect = validChoiceQuestions.filter((question) => {
  const lengths = question.options.map((option) => String(option).length)
  const longestLength = Math.max(...lengths)
  return lengths[question.correctIndex] === longestLength
    && lengths.filter((length) => length === longestLength).length === 1
}).length
const uniqueLongestRatio = percentage(uniqueLongestCorrect, validChoiceQuestions.length)

console.log('\n答案长度线索')
console.log(
  `- 正确答案为唯一最长项：${uniqueLongestCorrect}/${validChoiceQuestions.length} (${formatPercentage(uniqueLongestRatio)})`,
)
addIssue(uniqueLongestRatio <= 0.35, '正确答案为唯一最长项的比例高于 35%')

const invalidStageQuestions = questions.filter((question) => (
  isFilled(question.stage) && !knownStages.includes(question.stage)
))
const invalidFormatQuestions = questions.filter((question) => (
  isFilled(question.format) && !knownFormats.includes(question.format)
))
const incompleteMisconceptionMaps = questions.filter((question) => {
  if (!Array.isArray(question.options) || !Number.isInteger(question.correctIndex)) return true
  if (!question.misconceptionMap || typeof question.misconceptionMap !== 'object') return true
  return question.options.some((_, index) => (
    index !== question.correctIndex && !isFilled(question.misconceptionMap[index])
  ))
})

addIssue(invalidStageQuestions.length === 0, `${invalidStageQuestions.length} 题使用未知 stage`)
addIssue(invalidFormatQuestions.length === 0, `${invalidFormatQuestions.length} 题使用未知 format`)
addIssue(
  incompleteMisconceptionMaps.length === 0,
  `${incompleteMisconceptionMaps.length} 题未覆盖全部错误选项的 misconceptionMap`,
)

let curriculumNodes = []
let curriculumAvailable = false

if (fs.existsSync(curriculumFile)) {
  try {
    curriculumNodes = findCurriculumNodes(loadTypeScriptModule(curriculumFile))
    curriculumAvailable = true
  } catch (error) {
    issues.push(`curriculum.ts 无法读取：${error instanceof Error ? error.message : String(error)}`)
  }
} else {
  issues.push('缺少 src/data/curriculum.ts')
}

console.log('\n课程节点与阶段覆盖（静态选择题）')
console.log(`- 发现课程节点：${curriculumNodes.length}/${expectedCurriculumNodeCount}`)

addIssue(
  curriculumAvailable && curriculumNodes.length === expectedCurriculumNodeCount,
  `课程节点应为 ${expectedCurriculumNodeCount} 个，当前为 ${curriculumNodes.length}`,
)

const curriculumIds = new Set(curriculumNodes.map((node) => node.id))
const unknownConceptQuestions = questions.filter((question) => (
  isFilled(question.conceptId) && !curriculumIds.has(question.conceptId)
))
addIssue(
  !curriculumAvailable || unknownConceptQuestions.length === 0,
  `${unknownConceptQuestions.length} 题引用了 curriculum.ts 中不存在的 conceptId`,
)

const orphanNodes = curriculumNodes.filter((node) => (
  !questions.some((question) => question.conceptId === node.id)
))
const missingRecommendedStages = []

if (!curriculumAvailable) {
  console.log(`- 孤儿节点：待计算（curriculum.ts 尚未提供，预期审计 ${expectedCurriculumNodeCount} 个节点）`)
} else if (curriculumNodes.length === 0) {
  console.log('- 孤儿节点：无法计算（未识别到课程节点导出）')
} else {
  const header = ['concept', 'total', ...knownStages]
  console.log(header.join('\t'))

  for (const node of curriculumNodes) {
    const linked = questions.filter((question) => question.conceptId === node.id)
    const stageCounts = countBy(linked, (question) => question.stage)
    console.log([
      node.id,
      linked.length,
      ...knownStages.map((stage) => stageCounts[stage] ?? 0),
    ].join('\t'))

    const requiredStages = Array.isArray(node.recommendedStages) ? node.recommendedStages : []
    requiredStages.forEach((stage) => {
      if ((stageCounts[stage] ?? 0) === 0) missingRecommendedStages.push(`${node.id}:${stage}`)
    })
  }

  console.log(`- 孤儿节点：${orphanNodes.length}/${curriculumNodes.length}`)
  if (orphanNodes.length) console.log(`  ${orphanNodes.map((node) => node.id).join(', ')}`)
}

addIssue(!curriculumAvailable || orphanNodes.length === 0, `存在 ${orphanNodes.length} 个无题目关联的课程节点`)
addIssue(
  !curriculumAvailable || missingRecommendedStages.length === 0,
  `静态题库中还有 ${missingRecommendedStages.length} 个 concept/stage 推荐组合没有题目（自适应活动由 validate:tutor 另行校验）`,
)

console.log('\n验收结果')
if (issues.length === 0) {
  console.log('- 通过：全部课程审计阈值满足。')
} else {
  console.log(`- 未满足项：${issues.length}`)
  issues.forEach((issue) => console.log(`  - ${issue}`))
}

if (strict && issues.length > 0) {
  console.error('\nStrict 模式失败。')
  process.exitCode = 1
} else if (issues.length > 0) {
  console.log('\nBaseline 模式仅报告遗留缺陷，退出码保持为 0。')
}
