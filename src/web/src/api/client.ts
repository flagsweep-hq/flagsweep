import axios from 'axios'
import { toast } from 'sonner'

export const TOKEN_KEY = 'flagsweep_token'
export const USER_KEY = 'flagsweep_user'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/setup')
      ) {
        window.location.href = '/login'
      }
    } else {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.title ||
        'Something went wrong'
      toast.error(message, { duration: 5000 })
    }
    return Promise.reject(error)
  }
)

/** The problem-details message from a failed API call, for showing inline next to a form. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string } | undefined
    return data?.detail || data?.title || fallback
  }
  return fallback
}
