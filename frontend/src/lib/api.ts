import axios from 'axios'
import { toast } from 'react-hot-toast'

// Use same-origin proxy — all /api/* requests go through Next.js
// which forwards to the backend. This avoids cross-origin cookie issues.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else {
      toast.error('Ocorreu um erro. Tente novamente.')
    }
    return Promise.reject(error)
  }
)
