import {
  BarChart3,
  BookOpenCheck,
  BookOpenText,
  Bot,
  Flame,
  FolderInput,
  GalleryVerticalEnd,
  Heart,
  Home,
  Map,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { NavigationView, StudyState } from '../types'
import { Brand } from './Brand'

interface AppShellProps {
  activeView: NavigationView
  state: StudyState
  onNavigate: (view: NavigationView) => void
  onRefillHearts: () => void
  children: ReactNode
}

const navItems: Array<{
  id: NavigationView
  label: string
  mobileLabel: string
  Icon: typeof Home
}> = [
  { id: 'home', label: '今日学习', mobileLabel: '学习', Icon: Home },
  { id: 'coach', label: 'AI 私教', mobileLabel: '私教', Icon: Bot },
  { id: 'path', label: '闯关地图', mobileLabel: '闯关', Icon: Map },
  { id: 'knowledge', label: '知识脉络', mobileLabel: '脉络', Icon: BookOpenText },
  { id: 'flashcards', label: '记忆卡', mobileLabel: '卡片', Icon: GalleryVerticalEnd },
  { id: 'mistakes', label: '错题本', mobileLabel: '错题', Icon: BookOpenCheck },
  { id: 'progress', label: '学习报告', mobileLabel: '报告', Icon: BarChart3 },
  { id: 'import', label: '导入中心', mobileLabel: '导入', Icon: FolderInput },
]

function Navigation({
  activeView,
  onNavigate,
  mobile = false,
}: Pick<AppShellProps, 'activeView' | 'onNavigate'> & { mobile?: boolean }) {
  return (
    <nav className={mobile ? 'mobile-navigation' : 'side-navigation'} aria-label="主导航">
      {navItems.map(({ id, label, mobileLabel, Icon }) => (
        <button
          className={activeView === id ? 'nav-item is-active' : 'nav-item'}
          type="button"
          key={id}
          onClick={() => onNavigate(id)}
          aria-current={activeView === id ? 'page' : undefined}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
          <span>{mobile ? mobileLabel : label}</span>
        </button>
      ))}
    </nav>
  )
}

export function AppShell({ activeView, state, onNavigate, onRefillHearts, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <aside className="sidebar">
        <Brand />
        <Navigation activeView={activeView} onNavigate={onNavigate} />

        <div className="sidebar-focus-card">
          <span className="focus-icon"><Sparkles size={17} /></span>
          <div>
            <strong>今日节奏</strong>
            <p>{Math.min(state.weeklyActivity[new Date().toLocaleDateString('sv-SE')] ?? 0, state.dailyGoal)} / {state.dailyGoal} 题</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="status-strip" aria-label="学习状态">
            <span title="连续学习天数"><Flame size={18} aria-hidden="true" /> <b>{state.streakDays}</b><em>天</em></span>
            <span title="经验值"><Sparkles size={18} aria-hidden="true" /> <b>{state.xp}</b><em>XP</em></span>
            <button
              className="heart-status"
              type="button"
              onClick={state.hearts === 0 ? onRefillHearts : undefined}
              title={state.hearts === 0 ? '恢复爱心' : `剩余 ${state.hearts} 颗爱心`}
            >
              <Heart size={18} fill="currentColor" aria-hidden="true" />
              <b>{state.hearts}</b>
              {state.hearts === 0 && <RotateCcw size={13} aria-hidden="true" />}
            </button>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>

      <Navigation mobile activeView={activeView} onNavigate={onNavigate} />
    </div>
  )
}
