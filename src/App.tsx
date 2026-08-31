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
import { questions } from './data/questionBank'
import { useStudyState } from './hooks/useStudyState'
import type { Difficulty, NavigationView, QuizSessionConfig } from './types'

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

  if (session) {
    return (
      <QuizSession
        key={session.key}
        config={session}
        questions={questions}
        state={state}
        onAnswer={answerQuestion}
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
          onStart={startLearn}
          onReview={() => startReview()}
          onNavigatePath={() => navigate('path')}
          onNavigateCoach={() => navigate('coach')}
          onNavigateImport={() => navigate('import')}
          onRefillHearts={refillHearts}
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
