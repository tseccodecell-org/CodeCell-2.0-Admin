'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TOKEN_KEY } from '@/lib/config'

const navSections = [
  {
    label: 'Management',
    items: [
      {
        to: '/challenges',
        label: 'Weekly Challenges',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        to: '/events',
        label: 'Events',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        to: '/statistics',
        label: 'Analytics',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)
    router.replace('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 fixed top-0 left-0 h-full z-10">
        <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-200">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Cell Admin</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Contest Site</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map(item => {
                  const isActive = pathname === item.to || pathname.startsWith(item.to + '/')
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className={isActive ? 'text-slate-900' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-200 pt-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 flex flex-col min-w-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
