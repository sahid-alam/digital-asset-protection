import axios from 'axios'

const rawBase = import.meta.env.VITE_API_URL || ''
// Upgrade http → https to prevent mixed-content blocking on Vercel
const baseURL = rawBase.replace(/^http:\/\//, 'https://')

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
