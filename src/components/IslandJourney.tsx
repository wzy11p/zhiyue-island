import {
  Anchor,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Compass,
  Feather,
  LockKeyhole,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  TowerControl,
  TriangleAlert,
  Waypoints,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { journeyIslands } from '../data/journey'
import { getJourneySnapshot } from '../services/journey'
import type { Question, StudyState } from '../types'
import '../styles/island-journey.css'

interface IslandJourneyProps {
  state: StudyState
  questions: Question[]
  onStartNode: (nodeId: string) => void
  onReview: () => void
  onNavigateCoach: () => void
}

type JourneySnapshot = ReturnType<typeof getJourneySnapshot>
type JourneyNode = JourneySnapshot['nodes'][number]
type JourneyIsland = (typeof journeyIslands)[number]
type OperationalStatus = 'complete' | 'current' | 'available' | 'locked'
type VisibleStatus = OperationalStatus | 'fragile'

const islandIconMap: Record<JourneyIsland['icon'], LucideIcon> = {
  compass: Compass,
  network: Network,
  bridge: Waypoints,
  agent: Bot,
  quill: Feather,
  lighthouse: TowerControl,
}

const statusLabels: Record<VisibleStatus, string> = {
  complete: '已通关',
  current: '当前位置',
  available: '可挑战',
  locked: '未解锁',
  fragile: '需复习',
}

const nodeKindLabels: Record<JourneyNode['kind'], string> = {
  recall: '概念登录',
  distinguish: '辨析海湾',
  application: '迁移试炼',
  boss: '岛屿首领',
  shortcut: '捷径挑战',
  lighthouse: '终点灯塔',
}

function StatusIcon({ status, size = 15 }: { status: VisibleStatus; size?: number }) {
  if (status === 'complete') return <CheckCircle2 size={size} aria-hidden="true" />
  if (status === 'current') return <Anchor size={size} aria-hidden="true" />
  if (status === 'available') return <CircleDot size={size} aria-hidden="true" />
  if (status === 'fragile') return <TriangleAlert size={size} aria-hidden="true" />
  return <LockKeyhole size={size} aria-hidden="true" />
}

function toOperationalStatus(node: JourneyNode, isRecommended: boolean): OperationalStatus {
  if (node.status === 'completed') return 'complete'
  if (node.status === 'in-progress' || isRecommended) return 'current'
  if (node.status === 'available') return 'available'
  return 'locked'
}

function AnimatedBoat({ position }: { position: { x: number; y: number } }) {
  const left = Math.max(5, Math.min(94, position.x - 4.5))
  const top = Math.max(8, Math.min(92, position.y + 7))

  return (
    <span className="ij-boat" style={{ left: `${left}%`, top: `${top}%` }} aria-hidden="true">
      <span className="ij-boat__wake ij-boat__wake--one" />
      <span className="ij-boat__wake ij-boat__wake--two" />
      <span className="ij-boat__float">
        <svg viewBox="0 0 80 66" focusable="false">
          <g className="ij-boat__hull">
            <path className="ij-boat__hull-fill" d="M13 44c10 4 42 4 55 0-4 12-14 17-29 17S18 56 13 44Z" />
            <path className="ij-boat__hull-line" d="M14 45c13 3 39 3 53 0" />
          </g>
          <path className="ij-boat__mast" d="M40 10v37" />
          <g className="ij-boat__sail ij-boat__sail--left">
            <path d="M37 14 18 39h19Z" />
          </g>
          <g className="ij-boat__sail ij-boat__sail--right">
            <path d="m43 12 20 27H43Z" />
          </g>
          <path className="ij-boat__flag" d="M41 10c8-5 11 2 17-1-3 8-10 5-17 7Z" />
        </svg>
      </span>
    </span>
  )
}

function SeaMotion() {
  const waveClusters = [
    { id: 'north', x: 820, y: 178, scale: 0.9 },
    { id: 'west', x: 430, y: 590, scale: 0.78 },
    { id: 'center', x: 930, y: 555, scale: 0.72 },
    { id: 'east', x: 1240, y: 450, scale: 0.86 },
    { id: 'south', x: 470, y: 840, scale: 0.64 },
    { id: 'far-east', x: 1320, y: 875, scale: 0.7 },
  ]

  return (
    <svg className="ij-sea-motion" viewBox="0 0 1586 992" preserveAspectRatio="none" aria-hidden="true">
      {waveClusters.map(({ id, x, y, scale }, index) => (
        <g transform={`translate(${x} ${y}) scale(${scale})`} key={id}>
          <g className={`ij-wave-cluster ij-wave-cluster--${index + 1}`}>
            <path d="M0 18 C22 3 45 3 67 18 S112 33 134 18" />
            <path d="M19 42 C36 31 55 31 73 42 S108 53 126 42" />
            <path d="M48 64 C61 56 75 56 88 64 S114 72 127 64" />
          </g>
        </g>
      ))}

    </svg>
  )
}

const mapHotspotPositions: Record<number, { x: number; y: number }> = {
  1: { x: 28, y: 79 },
  2: { x: 28, y: 51 },
  3: { x: 62, y: 54 },
  4: { x: 69, y: 80 },
  5: { x: 87, y: 38 },
  6: { x: 56, y: 20 },
}

const journeyRoutePath = [
  'M 28 79',
  'C 44 80, 17 63, 28 51',
  'C 39 40, 49 60, 62 54',
  'C 52 67, 56 79, 69 80',
  'C 84 78, 76 51, 87 38',
  'C 77 27, 67 25, 56 20',
].join(' ')

export function IslandJourney({
  state,
  questions,
  onStartNode,
  onReview,
  onNavigateCoach,
}: IslandJourneyProps) {
  const rawId = useId()
  const panelId = `journey-panel-${rawId.replace(/:/g, '')}`
  const snapshot = useMemo(() => getJourneySnapshot(state, questions), [questions, state])
  const orderedIslands = useMemo(
    () => [...journeyIslands].sort((left, right) => left.order - right.order),
    [],
  )
  const recommendedId = snapshot.recommendedNode?.id

  const islandModels = useMemo(() => orderedIslands.map((island) => {
    const islandNodeIds = new Set<string>(island.nodeIds)
    const nodes = snapshot.nodes
      .filter((node) => islandNodeIds.has(node.id))
      .sort((left, right) => left.order - right.order)
    const completedCount = nodes.filter((node) => node.status === 'completed').length
    const allComplete = nodes.length > 0 && completedCount === nodes.length
    const recommendedHere = nodes.some((node) => node.id === recommendedId)
    const hasInProgress = nodes.some((node) => node.status === 'in-progress')
    const hasAvailable = nodes.some((node) => node.status === 'available')
    const hasFragile = nodes.some((node) => node.hasFragileMastery)
    const status: OperationalStatus = allComplete
      ? 'complete'
      : recommendedHere || hasInProgress
        ? 'current'
        : hasAvailable
          ? 'available'
          : 'locked'
    const lockReason = status === 'locked'
      ? nodes.find((node) => node.lockReason)?.lockReason
      : undefined

    return {
      island,
      nodes,
      completedCount,
      status,
      hasFragile,
      lockReason,
    }
  }), [orderedIslands, recommendedId, snapshot.nodes])

  const stormNode = useMemo(() => {
    const shortcuts = snapshot.nodes.filter((node) => node.kind === 'shortcut')
    return shortcuts.find((node) => node.id === recommendedId)
      ?? shortcuts.find((node) => node.status === 'in-progress')
      ?? shortcuts.find((node) => node.status === 'available')
      ?? shortcuts.find((node) => node.status === 'cooldown')
      ?? shortcuts.find((node) => node.status !== 'completed' && node.status !== 'unavailable')
      ?? shortcuts.at(-1)
  }, [recommendedId, snapshot.nodes])

  const defaultSelection = snapshot.recommendedNode?.islandId ?? orderedIslands[0]?.id ?? ''
  const [selectedKey, setSelectedKey] = useState(defaultSelection)
  const [announcement, setAnnouncement] = useState('')
  const selectedIsland = islandModels.find(({ island }) => island.id === selectedKey)
  const selectedStorm = selectedKey === 'storm-challenge' ? stormNode : undefined
  const currentIsland = islandModels.find(({ status }) => status === 'current')
    ?? islandModels.find(({ status }) => status === 'available')
    ?? islandModels.at(-1)
  const routePath = journeyRoutePath
  const routeProgress = orderedIslands.length > 1
    ? Math.round((islandModels.filter(({ status }) => status === 'complete').length / (orderedIslands.length - 1)) * 100)
    : 0
  const stormStatus = stormNode
    ? toOperationalStatus(stormNode, stormNode.id === recommendedId)
    : 'locked'

  const selectIsland = (model: (typeof islandModels)[number]) => {
    setSelectedKey(model.island.id)
    const fragileCopy = model.hasFragile ? '，有知识点需要复习' : ''
    const lockCopy = model.status === 'locked' && model.lockReason ? `，${model.lockReason}` : ''
    setAnnouncement(`${model.island.title}，${statusLabels[model.status]}${fragileCopy}${lockCopy}`)
  }

  const selectStorm = () => {
    if (!stormNode) return
    setSelectedKey('storm-challenge')
    setAnnouncement(`风暴挑战，${statusLabels[stormStatus]}${stormNode.lockReason ? `，${stormNode.lockReason}` : ''}`)
  }

  const startNode = (node: JourneyNode) => {
    const status = toOperationalStatus(node, node.id === recommendedId)
    if (status === 'locked') {
      setAnnouncement(node.lockReason ?? '该关卡尚未解锁')
      return
    }
    setAnnouncement(`开始${node.title}`)
    onStartNode(node.id)
  }

  const getQuickStartNode = (model: (typeof islandModels)[number]) => {
    return model.nodes.find((node) => node.id === recommendedId)
      ?? model.nodes.find((node) => node.status === 'in-progress')
      ?? model.nodes.find((node) => node.status === 'available')
  }

  const activateIsland = (model: (typeof islandModels)[number]) => {
    const quickStartNode = getQuickStartNode(model)
    if (quickStartNode) {
      startNode(quickStartNode)
      return
    }

    selectIsland(model)
  }

  const renderIslandButton = (model: (typeof islandModels)[number], mode: 'map' | 'mobile') => {
    const Icon = islandIconMap[model.island.icon]
    const selected = selectedKey === model.island.id
    const statusCopy = model.hasFragile
      ? `${statusLabels[model.status]}，${statusLabels.fragile}`
      : statusLabels[model.status]
    const quickStartNode = getQuickStartNode(model)
    const directStart = Boolean(quickStartNode)
    const actionCopy = directStart
      ? `点按开始${quickStartNode?.title ?? '本岛关卡'}`
      : model.status === 'locked' ? '点按查看解锁条件' : '点按查看关卡'
    const mapPosition = mapHotspotPositions[model.island.order] ?? model.island.position

    return (
      <button
        className={`ij-island-button ij-island-button--${mode} is-${model.status}${directStart ? ' is-direct' : ''}${model.hasFragile ? ' has-fragile' : ''}${selected ? ' is-selected' : ''}`}
        type="button"
        key={`${mode}-${model.island.id}`}
        style={mode === 'map'
          ? { left: `${mapPosition.x}%`, top: `${mapPosition.y}%`, '--island-accent': model.island.accent } as React.CSSProperties
          : { '--island-accent': model.island.accent } as React.CSSProperties}
        onClick={() => activateIsland(model)}
        aria-current={model.status === 'current' ? 'step' : undefined}
        aria-expanded={directStart ? undefined : selected}
        aria-controls={directStart ? undefined : panelId}
        aria-label={`${model.island.title}，${statusCopy}，${model.completedCount}/${model.nodes.length} 关已完成，${actionCopy}${model.lockReason ? `，${model.lockReason}` : ''}`}
        title={directStart ? `开始${quickStartNode?.title}` : model.status === 'locked' ? model.lockReason : model.island.description}
      >
        <span className="ij-island-button__number" aria-hidden="true">
          {String(model.island.order).padStart(2, '0')}
        </span>
        <span className="ij-island-button__icon" aria-hidden="true"><Icon size={mode === 'map' ? 26 : 22} /></span>
        <span className="ij-island-button__copy">
          <strong>{model.island.shortTitle}</strong>
          <small>
            {directStart
              ? <><Play size={13} fill="currentColor" aria-hidden="true" /> 点按开局</>
              : <><StatusIcon status={model.status} size={13} /> {model.status === 'complete' ? '查看关卡' : statusLabels[model.status]}</>}
          </small>
        </span>
        {model.hasFragile && (
          <span className="ij-fragile-flag"><TriangleAlert size={12} aria-hidden="true" /> 需复习</span>
        )}
        {mode === 'mobile' && (directStart
          ? <Play className="ij-island-button__chevron" size={18} fill="currentColor" aria-hidden="true" />
          : <ChevronRight className="ij-island-button__chevron" size={18} aria-hidden="true" />)}
      </button>
    )
  }

  return (
    <section className="island-journey" aria-labelledby={`${panelId}-title`}>
      <p className="ij-sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <header className="ij-header">
        <div>
          <h1 id={`${panelId}-title`}>知识群岛航线</h1>
          <p>点击发光岛屿直接开局。每座岛从概念、辨析到迁移逐层推进。</p>
        </div>
        <div className="ij-stats" aria-label={`已完成 ${snapshot.completedNodes} 个关卡，共 ${snapshot.totalNodes} 个，获得 ${snapshot.totalStars} 颗星`}>
          <span><Check size={16} aria-hidden="true" /><b>{snapshot.completedNodes}</b>/{snapshot.totalNodes}</span>
          <span><Sparkles size={16} aria-hidden="true" /><b>{snapshot.totalStars}</b> 星</span>
          <span><Waves size={16} aria-hidden="true" /><b>{state.streakDays}</b> 天</span>
        </div>
      </header>

      <div className="ij-legend" aria-label="航线状态图例">
        {(['complete', 'current', 'available', 'locked', 'fragile'] as VisibleStatus[]).map((status) => (
          <span className={`is-${status}`} key={status}><StatusIcon status={status} /> {statusLabels[status]}</span>
        ))}
      </div>

      <div className="ij-map-stage" role="group" aria-label="知识群岛地图，点击发光岛屿开始闯关">
        <picture className="ij-map-picture">
          <img
            className="ij-map-art"
            src="/assets/island-world-v2.png"
            srcSet="/assets/island-world-v2-640.png 640w, /assets/island-world-v2-960.png 960w, /assets/island-world-v2.png 1585w"
            sizes="min(94vw, 1460px)"
            alt=""
            draggable="false"
            decoding="async"
          />
        </picture>
        <span className="ij-map-wash" aria-hidden="true" />
        <SeaMotion />
        <svg className="ij-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="ij-route__edge" d={routePath} pathLength="100" />
          <path className="ij-route__base" d={routePath} pathLength="100" />
          <path className="ij-route__progress" d={routePath} pathLength="100" style={{ strokeDasharray: `${Math.min(100, routeProgress)} 100` }} />
        </svg>

        {islandModels.map((model) => renderIslandButton(model, 'map'))}

        {stormNode && (
          <button
            className={`ij-storm-button is-${stormStatus}${['current', 'available'].includes(stormStatus) ? ' is-direct' : ''}${stormNode.hasFragileMastery ? ' has-fragile' : ''}${selectedKey === 'storm-challenge' ? ' is-selected' : ''}`}
            type="button"
            onClick={() => ['current', 'available'].includes(stormStatus) ? startNode(stormNode) : selectStorm()}
            aria-current={stormStatus === 'current' ? 'step' : undefined}
            aria-expanded={['current', 'available'].includes(stormStatus) ? undefined : selectedKey === 'storm-challenge'}
            aria-controls={['current', 'available'].includes(stormStatus) ? undefined : panelId}
            aria-label={`风暴挑战，${statusLabels[stormStatus]}，${['current', 'available'].includes(stormStatus) ? '点按直接挑战' : '点按查看详情'}${stormNode.hasFragileMastery ? '，需复习' : ''}${stormNode.lockReason ? `，${stormNode.lockReason}` : ''}`}
            title={['current', 'available'].includes(stormStatus) ? '直接开始风暴挑战' : stormNode.lockReason ?? '查看风暴挑战'}
          >
            <span className="ij-storm-button__cloud" aria-hidden="true"><Zap size={28} /></span>
            <span><strong>风暴挑战</strong><small>{['current', 'available'].includes(stormStatus)
              ? <><Play size={13} fill="currentColor" aria-hidden="true" /> 点按开局</>
              : <><StatusIcon status={stormStatus} size={13} /> {statusLabels[stormStatus]}</>}</small></span>
          </button>
        )}

        {currentIsland && <AnimatedBoat position={currentIsland.island.position} />}
      </div>

      <div className="ij-mobile-banner" aria-hidden="true">
        <picture>
          <img
            src="/assets/island-world-v2-960.png"
            srcSet="/assets/island-world-v2-640.png 640w, /assets/island-world-v2-960.png 960w"
            sizes="100vw"
            alt=""
            draggable="false"
            decoding="async"
          />
        </picture>
        <SeaMotion />
        <span><Anchor size={18} /> 地图全景已收起，按航线向下探索</span>
      </div>

      <ol className="ij-mobile-route" aria-label="移动端学习航线">
        {islandModels.map((model) => <li key={model.island.id}>{renderIslandButton(model, 'mobile')}</li>)}
        {stormNode && (
          <li className="ij-mobile-storm">
            <button
              className={`ij-storm-list-button is-${stormStatus}${['current', 'available'].includes(stormStatus) ? ' is-direct' : ''}${stormNode.hasFragileMastery ? ' has-fragile' : ''}`}
              type="button"
              onClick={() => ['current', 'available'].includes(stormStatus) ? startNode(stormNode) : selectStorm()}
              aria-current={stormStatus === 'current' ? 'step' : undefined}
              aria-expanded={['current', 'available'].includes(stormStatus) ? undefined : selectedKey === 'storm-challenge'}
              aria-controls={['current', 'available'].includes(stormStatus) ? undefined : panelId}
              aria-label={`风暴挑战，${statusLabels[stormStatus]}，${['current', 'available'].includes(stormStatus) ? '点按直接挑战' : '点按查看详情'}`}
            >
              <span><Zap size={23} aria-hidden="true" /></span>
              <span><strong>风暴挑战</strong><small>{['current', 'available'].includes(stormStatus) ? '点按开局' : `${stormNode.title} · ${statusLabels[stormStatus]}`}</small></span>
              {['current', 'available'].includes(stormStatus)
                ? <Play size={18} fill="currentColor" aria-hidden="true" />
                : <ChevronRight size={18} aria-hidden="true" />}
            </button>
          </li>
        )}
      </ol>

      <article className={`ij-inspector${selectedStorm ? ' is-storm' : ''}`} id={panelId} aria-live="polite">
        {selectedIsland ? (
          <>
            <div className="ij-inspector__intro">
              <span className={`ij-inspector__mark is-${selectedIsland.status}`} aria-hidden="true">
                {(() => {
                  const Icon = islandIconMap[selectedIsland.island.icon]
                  return <Icon size={25} />
                })()}
              </span>
              <div>
                <span className="ij-inspector__meta">
                  第 {selectedIsland.island.order} 站 · {statusLabels[selectedIsland.status]}
                  {selectedIsland.hasFragile && <> · <b>需复习</b></>}
                </span>
                <h2>{selectedIsland.island.title}</h2>
                <p>{selectedIsland.island.description}</p>
              </div>
            </div>

            {selectedIsland.status === 'locked' && (
              <p className="ij-lock-reason"><LockKeyhole size={16} aria-hidden="true" /> {selectedIsland.lockReason ?? '完成上一座岛屿后解锁'}</p>
            )}

            <div className="ij-node-list" aria-label={`${selectedIsland.island.title}关卡`}>
              {selectedIsland.nodes.map((node) => {
                const nodeStatus = toOperationalStatus(node, node.id === recommendedId)
                const visibleStatus: VisibleStatus = node.hasFragileMastery ? 'fragile' : nodeStatus
                const locked = nodeStatus === 'locked'
                return (
                  <button
                    className={`ij-node-button is-${nodeStatus}${node.hasFragileMastery ? ' has-fragile' : ''}`}
                    type="button"
                    key={node.id}
                    onClick={() => startNode(node)}
                    aria-current={nodeStatus === 'current' ? 'step' : undefined}
                    aria-disabled={locked ? 'true' : undefined}
                    title={locked ? node.lockReason : `开始${node.title}`}
                  >
                    <span className="ij-node-button__status"><StatusIcon status={visibleStatus} size={17} /></span>
                    <span><small>{nodeKindLabels[node.kind]} · {node.questionIds.length} 题</small><strong>{node.title}</strong></span>
                    <span className="ij-node-button__reward">+{node.rewardXp} XP</span>
                    {locked ? <LockKeyhole size={16} aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            <div className="ij-inspector__actions">
              <button type="button" className="ij-quiet-button" onClick={onNavigateCoach}><Bot size={17} aria-hidden="true" /> 让 AI 私教先讲明白</button>
              {selectedIsland.hasFragile && (
                <button type="button" className="ij-review-button" onClick={onReview}><RotateCcw size={17} aria-hidden="true" /> 复习薄弱点</button>
              )}
            </div>
          </>
        ) : selectedStorm ? (
          <>
            <div className="ij-inspector__intro">
              <span className={`ij-inspector__mark is-${stormStatus}`} aria-hidden="true"><Zap size={25} /></span>
              <div>
                <span className="ij-inspector__meta">综合迁移 · {statusLabels[stormStatus]}</span>
                <h2>风暴挑战</h2>
                <p>{selectedStorm.description}</p>
              </div>
            </div>
            {stormStatus === 'locked' && (
              <p className="ij-lock-reason"><LockKeyhole size={16} aria-hidden="true" /> {selectedStorm.lockReason ?? '完成对应岛屿的前置关卡后解锁'}</p>
            )}
            <div className="ij-storm-summary">
              <span><b>{selectedStorm.questionIds.length}</b> 道迁移题</span>
              <span><b>{Math.round(selectedStorm.completion.minimumAccuracy * 100)}%</b> 目标正确率</span>
              <span><b>+{selectedStorm.rewardXp}</b> XP</span>
            </div>
            <button
              className="ij-storm-start"
              type="button"
              aria-disabled={stormStatus === 'locked' ? 'true' : undefined}
              onClick={() => startNode(selectedStorm)}
            >
              {stormStatus === 'locked' ? <LockKeyhole size={18} /> : <Zap size={18} />}
              {stormStatus === 'locked' ? '查看解锁条件' : '驶入风暴'}
            </button>
          </>
        ) : (
          <div className="ij-inspector__empty"><Compass size={24} aria-hidden="true" /> 选择一座岛屿查看关卡</div>
        )}
      </article>

    </section>
  )
}
