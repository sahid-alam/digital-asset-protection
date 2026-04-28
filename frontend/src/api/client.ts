import axios from 'axios'

const baseURL = import.meta.env.PROD
  ? 'https://dapsbackend-production.up.railway.app'
  : (import.meta.env.VITE_API_URL || '')

const api = axios.create({
  baseURL,
  timeout: 10000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API]', error.response?.status, error.config?.url, error.message)
    return Promise.reject(error)
  }
)

export default api
