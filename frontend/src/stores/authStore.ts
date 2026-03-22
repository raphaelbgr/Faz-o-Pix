import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (data: { token: string; user: User }) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
      setAuth: (data) => {
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
        })
        
        // Set token in API client headers
        if (typeof window !== 'undefined') {
          localStorage.setItem('faz-o-pix-token', data.token)
        }
      },
      
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
        
        // Clear token from storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('faz-o-pix-token')
          // Redirect to login
          window.location.href = '/login'
        }
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },
    }),
    {
      name: 'faz-o-pix-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)