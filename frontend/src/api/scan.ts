import api from './client'
import type { ScanJob } from '../types'

export async function triggerScan(assetId: string): Promise<ScanJob> {
  const res = await api.post<ScanJob>(`/scan/${assetId}`)
  return res.data
}

export async function getScanStatus(jobId: string): Promise<ScanJob> {
  const res = await api.get<ScanJob>(`/scan/status/${jobId}`)
  return res.data
}
