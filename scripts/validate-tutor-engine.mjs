import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const curriculumFile = path.join(projectRoot, 'src/data/curriculum.ts')
const tutorFile = path.join(projectRoot, 'src/services/tutor.ts')

const stages = [
  'diagnostic',
  'recall',
  'distinguish',
  'guided',
  'independent',
  'transfer',
  'review',
]

const variantStages = new Set(['recall', 'distinguish', 'guided', 'independent', 'review'])
const expectedConceptCount = 20
const expectedActivityCount = expectedConceptCount * stages.length
const moduleCache = new Map()
const errors = []

const fail = (condition, message) => {
  if (!condition) errors.push(message)
}

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
  }).outputText.replaceAll('import.meta.env', '({})')

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

const isFilledText = (value) => typeof value === 'string' && value.trim().length > 0
const normalizeSurface = (value) => value
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s\p{P}\p{S}]/gu, '')

const validateActivity = (activity, concept, stage, label) => {
  if (!activity || typeof activity !== 'object') {
    errors.push(`${label} 未返回活动对象`)
    return
  }

  fail(isFilledText(activity.id), `${label} 缺少 id`)
  fail(activity.conceptId === concept.id, `${label} conceptId 不一致`)
  fail(activity.stage === stage, `${label} stage 不一致`)
  fail(isFilledText(activity.prompt), `${label} 缺少 prompt`)
  fail(
    activity.context === undefined || isFilledText(activity.context),
    `${label} context 存在但为空`,
  )
  fail(isFilledText(activity.expectedAnswer), `${label} 缺少 expectedAnswer`)
  fail(
    Array.isArray(activity.acceptedSignals)
      && activity.acceptedSignals.length > 0
      && activity.acceptedSignals.every(isFilledText),
    `${label} acceptedSignals 必须是非空文本数组`,
  )
  fail(isFilledText(activity.hint), `${label} 缺少 hint`)

  if (stage === 'distinguish') {
    const misconceptionIds = new Set((concept.misconceptions ?? []).map((item) => item.id))
    fail(isFilledText(activity.misconceptionId), `${label} 辨析活动缺少 misconceptionId`)
    fail(
      misconceptionIds.has(activity.misconceptionId),
      `${label} 引用了概念中不存在的 misconceptionId：${activity.misconceptionId ?? '(missing)'}`,
    )
  }
}

const validatePrerequisiteGraph = (concepts) => {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]))

  for (const concept of concepts) {
    fail(Array.isArray(concept.prerequisiteIds), `${concept.id} prerequisiteIds 不是数组`)
    for (const prerequisiteId of concept.prerequisiteIds ?? []) {
      fail(conceptById.has(prerequisiteId), `${concept.id} 引用了不存在的先修节点 ${prerequisiteId}`)
      fail(prerequisiteId !== concept.id, `${concept.id} 不能以自己为先修`)
    }
  }

  const state = new Map()
  const stack = []
  const reportedCycles = new Set()

  const visit = (conceptId) => {
    const currentState = state.get(conceptId) ?? 0
    if (currentState === 2) return
    if (currentState === 1) {
      const cycleStart = stack.indexOf(conceptId)
      const cycle = [...stack.slice(cycleStart), conceptId]
      const fingerprint = cycle.join(' -> ')
      if (!reportedCycles.has(fingerprint)) {
        errors.push(`先修图存在环：${fingerprint}`)
        reportedCycles.add(fingerprint)
      }
      return
    }

    state.set(conceptId, 1)
    stack.push(conceptId)
    const concept = conceptById.get(conceptId)
    for (const prerequisiteId of concept?.prerequisiteIds ?? []) {
      if (conceptById.has(prerequisiteId)) visit(prerequisiteId)
    }
    stack.pop()
    state.set(conceptId, 2)
  }

  concepts.forEach((concept) => visit(concept.id))
}

let curriculumConcepts
let createTutorActivity

try {
  const curriculumModule = loadTypeScriptModule(curriculumFile)
  const tutorModule = loadTypeScriptModule(tutorFile)
  curriculumConcepts = curriculumModule.curriculumConcepts
  createTutorActivity = tutorModule.createTutorActivity
} catch (error) {
  console.error(`无法加载导师引擎：${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  process.exit(1)
}

if (!Array.isArray(curriculumConcepts)) {
  console.error('curriculumConcepts 不是数组')
  process.exit(1)
}

if (typeof createTutorActivity !== 'function') {
  console.error('createTutorActivity 不是函数')
  process.exit(1)
}

fail(
  curriculumConcepts.length === expectedConceptCount,
  `课程节点应为 ${expectedConceptCount} 个，当前为 ${curriculumConcepts.length} 个`,
)

const conceptIds = curriculumConcepts.map((concept) => concept.id)
fail(
  conceptIds.every(isFilledText) && new Set(conceptIds).size === conceptIds.length,
  '课程节点 id 必须非空且唯一',
)

validatePrerequisiteGraph(curriculumConcepts)

const activities = []
const variantActivities = []

for (const concept of curriculumConcepts) {
  for (const stage of stages) {
    const label = `${concept.id}:${stage}:variant0`
    try {
      const activity = createTutorActivity(concept, stage, 0)
      activities.push(activity)
      validateActivity(activity, concept, stage, label)

      if (variantStages.has(stage)) {
        const variantLabel = `${concept.id}:${stage}:variant1`
        const variantActivity = createTutorActivity(concept, stage, 1)
        variantActivities.push(variantActivity)
        validateActivity(variantActivity, concept, stage, variantLabel)
        fail(
          variantActivity?.id !== activity?.id,
          `${variantLabel} 与 variant0 生成了相同 id`,
        )
      }
    } catch (error) {
      errors.push(`${label} 生成异常：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

fail(
  activities.length === expectedActivityCount,
  `基础活动应为 ${expectedActivityCount} 个，当前成功生成 ${activities.length} 个`,
)

const ids = activities.map((activity) => activity?.id).filter(isFilledText)
fail(new Set(ids).size === activities.length, '基础活动存在重复 id')

const surfaceOwners = new Map()
for (const activity of activities) {
  if (!activity || !isFilledText(activity.prompt)) continue
  const surface = normalizeSurface([activity.context, activity.prompt].filter(isFilledText).join('\n'))
  if (!surface) {
    errors.push(`${activity.id ?? '(missing id)'} prompt/context 归一化后为空`)
    continue
  }
  const previous = surfaceOwners.get(surface)
  if (previous) {
    errors.push(`prompt/context 重复：${previous} 与 ${activity.id}`)
  } else {
    surfaceOwners.set(surface, activity.id)
  }
}

const chapterCoverage = curriculumConcepts.reduce((coverage, concept) => {
  const chapter = concept.chapterId || '(missing)'
  coverage[chapter] ??= { concepts: 0, activities: 0 }
  coverage[chapter].concepts += 1
  coverage[chapter].activities += activities.filter((activity) => activity?.conceptId === concept.id).length
  return coverage
}, {})

const stageCoverage = stages.reduce((coverage, stage) => {
  coverage[stage] = activities.filter((activity) => activity?.stage === stage).length
  return coverage
}, {})

console.log('导师引擎覆盖')
console.log(`- 课程节点：${curriculumConcepts.length}`)
console.log(`- 基础活动：${activities.length}/${expectedActivityCount}`)
console.log(`- variant1 补充抽检：${variantActivities.length}`)

console.log('\n章节覆盖')
console.log('chapter\tconcepts\tactivities')
for (const chapter of Object.keys(chapterCoverage).sort()) {
  const coverage = chapterCoverage[chapter]
  console.log(`${chapter}\t${coverage.concepts}\t${coverage.activities}`)
}

console.log('\n阶段覆盖')
console.log('stage\tactivities')
for (const stage of stages) console.log(`${stage}\t${stageCoverage[stage]}`)

console.log('\n验收结果')
if (errors.length > 0) {
  console.error(`- 失败：${errors.length} 项`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}

console.log('- 通过：活动结构、题面唯一性、误区绑定与先修图均有效。')
