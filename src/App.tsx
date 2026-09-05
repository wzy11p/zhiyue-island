import { Heart, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ChapterMap } from './components/ChapterMap'
import { Dashboard } from './components/Dashboard'
import { FlashcardCenter } from './components/FlashcardCenter'
import { ImportCenter } from './components/ImportCenter'
import { KnowledgeBase } from './components/KnowledgeBase'
import { MistakeNotebook } from './components/MistakeNotebook'
import { ProgressReport } from './components/ProgressReport'
import { QuizSession } from './components/QuizSession'
import { getJourneyNode } from './data/journey'
import { questions } from './data/questionBank'
import { useStudyState } from './hooks/useStudyState'
import { getJourneySnapshot, resolveJourneyQuestionIds } from './services/journey'
import type {
  Difficulty,
  JourneySessionResult,
  NavigationView,
  QuizSessionConfig,
} from './types'

const TutorSession = lazy(() => import('./components/TutorSession').then((module) => ({ default: module.TutorSession })))

function App() {
  const {
    state,
    answerQuestion,
    refillHearts,
    addImport,
    addCustomFlashcard,
    updateCustomFlashcard,
    deleteCustomFlashcard,
    reviewFlashcard,
    recordTutorAttempt,
    recordJourneyResult,
    resetProgress,
  } = useStudyState()
  const [activeView, setActiveView] = useState<NavigationView>('home')
  const [returnView, setReturnView] = useState<NavigationView>('home')
  const [session, setSession] = useState<QuizSessionConfig | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  const navigate = (view: NavigationView) => {
    setActiveView(view)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startLearn = (chapterId?: string, difficulty: Difficulty = 'easy', hellCoachEnabled = true) => {
    if (state.hearts <= 0) {
      setActiveView('home')
      setNotice('爱心用完了。点击“恢复爱心后继续”，准备好再开始。')
      return
    }
    const key = sessionKey + 1
    setSessionKey(key)
    setReturnView(activeView)
    setSession({
      key,
      mode: 'learn',
      chapterId,
      difficulty,
      hellCoachEnabled: difficulty === 'hard' ? hellCoachEnabled : false,
    })
  }

  const startReview = (questionIds?: string[]) => {
    const ids = questionIds ?? Object.values(state.wrongAnswers)
      .filter((record) => record.status === 'active')
      .map((record) => record.questionId)
    const key = sessionKey + 1
    setSessionKey(key)
    setReturnView(activeView)
    setSession({ key, mode: 'review', questionIds: ids })
  }

  const startJourneyNode = (nodeId: string) => {
    const node = getJourneyNode(nodeId)
    const snapshot = getJourneySnapshot(state, questions)
    const nodeSnapshot = snapshot.nodes.find((item) => item.id === nodeId)
    if (!node || !nodeSnapshot) {
      setNotice('这条航线暂时不存在，请重新选择一座岛。')
      return
    }
    if (node.kind === 'lighthouse') {
      setNotice('主航线已经点亮。接下来可以复习薄弱点，或等待新的知识岛加入。')
      return
    }
    if (['locked', 'cooldown', 'unavailable'].includes(nodeSnapshot.status)) {
      setNotice(nodeSnapshot.lockReason ?? '这道关卡暂时还不能挑战。')
      return
    }
    if (state.hearts <= 0) {
      setNotice('爱心用完了。恢复爱心后再继续航行。')
      return
    }

    const questionIds = resolveJourneyQuestionIds(node, questions, state.completedQuestionIds)
    if (!questionIds.length) {
      setNotice('这一关的题池还没有准备好。你可以先去 AI 私教学习概念。')
      return
    }

    const key = sessionKey + 1
    const difficulty = node.questionQuery?.difficulties.at(-1) ?? 'easy'
    setSessionKey(key)
    setReturnView('home')
    setNotice(null)
    setSession({
      key,
      mode: 'learn',
      chapterId: node.chapterId,
      difficulty,
      hellCoachEnabled: ['boss', 'shortcut'].includes(node.kind),
      questionIds,
      journeyNodeId: node.id,
    })
  }

  const completeJourneyNode = (result: JourneySessionResult) => {
    const outcome = recordJourneyResult(result)
    const node = getJourneyNode(result.nodeId)
    setNotice(outcome.passed
      ? `${node?.title ?? '关卡'}已通关，获得 ${outcome.stars} 星${outcome.firstCompletion ? '和首次通关奖励' : ''}。`
      : `${node?.title ?? '关卡'}还差一点：本轮 ${Math.round(result.accuracy * 100)}%，回到岛上即可再次挑战。`)
  }

  if (session) {
    return (
      <QuizSession
        key={session.key}
        config={session}
        questions={questions}
        state={state}
        onAnswer={answerQuestion}
        onComplete={completeJourneyNode}
        onRefillHearts={refillHearts}
        onExit={() => {
          setSession(null)
          setActiveView(returnView)
        }}
      />
    )
  }

  return (
    <AppShell activeView={activeView} state={state} onNavigate={navigate} onRefillHearts={refillHearts}>
      {notice && (
        <div className="global-notice" role="status">
          <Heart size={17} fill="currentColor" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示"><X size={16} /></button>
        </div>
      )}

      {activeView === 'home' && (
        <Dashboard
          state={state}
          questions={questions}
          onStartNode={startJourneyNode}
          onReview={() => startReview()}
          onNavigateCoach={() => navigate('coach')}
        />
      )}
      {activeView === 'coach' && (
        <Suspense fallback={<div className="panel tutor-loading" role="status">正在铺开你的知识路线……</div>}>
          <TutorSession state={state} onRecordAttempt={recordTutorAttempt} />
        </Suspense>
      )}
      {activeView === 'path' && <ChapterMap state={state} questions={questions} onStart={startLearn} />}
      {activeView === 'knowledge' && <KnowledgeBase />}
      {activeView === 'flashcards' && (
        <FlashcardCenter
          state={state}
          questions={questions}
          onAdd={addCustomFlashcard}
          onUpdate={updateCustomFlashcard}
          onDelete={deleteCustomFlashcard}
          onReview={reviewFlashcard}
        />
      )}
      {activeView === 'mistakes' && (
        <MistakeNotebook
          state={state}
          questions={questions}
          onReview={startReview}
          onGoLearn={() => navigate('path')}
        />
      )}
      {activeView === 'progress' && <ProgressReport state={state} questions={questions} onReset={resetProgress} />}
      {activeView === 'import' && <ImportCenter state={state} onImport={addImport} />}
    </AppShell>
  )
}

export default App
