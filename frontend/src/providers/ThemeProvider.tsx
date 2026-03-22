'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize theme on mount
    const stored = localStorage.getItem('faz-o-pix-theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Check system preference if no stored preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemTheme) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('faz-o-pix-theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('faz-o-pix-theme', 'light')
      }
    }
  }, [])

  return <>{children}</>
}