import axios from 'axios'
import { toast } from 'react-hot-toast'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:63292/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
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