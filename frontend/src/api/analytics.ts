import api from './client'
import type { AnalyticsSummary } from '../types'

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await api.get<AnalyticsSummary>('/analytics/summary')
  return res.data
}
