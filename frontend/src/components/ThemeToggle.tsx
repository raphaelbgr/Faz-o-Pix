'use client'

import { useEffect, useState } from 'react'

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get theme from localStorage or system
    const stored = localStorage.getItem('faz-o-pix-theme')
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored as 'light' | 'dark')
      if (stored === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Check system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(isDark ? 'dark' : 'light')
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('faz-o-pix-theme', newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="fixed top-4 right-4 z-50 glass-card p-3 rounded-full">
        <div className="w-5 h-5"></div>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 glass-card p-3 rounded-full 
                 text-[hsl(var(--foreground))] hover:text-[hsl(var(--pix-primary))]
                 transition-all duration-300 hover:scale-110 cursor-pointer"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      {/* Using emoji icons instead of lucide-react */}
      <span className="text-xl">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  )
}