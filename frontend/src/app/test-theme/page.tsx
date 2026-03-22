'use client'

import { ThemeToggle } from '@/components/ThemeToggle'

export default function TestTheme() {
  return (
    <>
      <ThemeToggle />
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Theme Test Page</h1>
        
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Glass Card</h2>
            <p className="text-foreground-muted">This should change in dark mode</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">Direct Dark Mode Test</h2>
            <p className="text-gray-600 dark:text-gray-300">
              If dark mode works, this card should be dark gray with white text in dark mode.
            </p>
          </div>

          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
            <h2 className="text-2xl font-semibold mb-2">CSS Variables Test</h2>
            <p>Background: var(--background)</p>
            <p>Foreground: var(--foreground)</p>
          </div>

          <button 
            onClick={() => {
              const isDark = document.documentElement.classList.contains('dark')
              console.log('Dark class present:', isDark)
              console.log('localStorage theme:', localStorage.getItem('faz-o-pix-theme'))
              alert(`Dark mode is ${isDark ? 'ON' : 'OFF'}\nLocalStorage: ${localStorage.getItem('faz-o-pix-theme')}`)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check Dark Mode Status
          </button>
        </div>
      </div>
    </>
  )
}