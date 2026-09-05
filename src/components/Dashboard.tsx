import type { Question, StudyState } from '../types'
import { IslandJourney } from './IslandJourney'

interface DashboardProps {
  state: StudyState
  questions: Question[]
  onStartNode: (nodeId: string) => void
  onReview: () => void
  onNavigateCoach: () => void
}

/**
 * V2 deliberately makes the learning journey the home screen. The former
 * dashboard tools remain available through persistent navigation, while the
 * first view now answers one question only: where should I continue?
 */
export function Dashboard({
  state,
  questions,
  onStartNode,
  onReview,
  onNavigateCoach,
}: DashboardProps) {
  return (
    <div className="page journey-dashboard-page">
      <IslandJourney
        state={state}
        questions={questions}
        onStartNode={onStartNode}
        onReview={onReview}
        onNavigateCoach={onNavigateCoach}
      />
    </div>
  )
}
