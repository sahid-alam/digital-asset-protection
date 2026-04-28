import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
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
