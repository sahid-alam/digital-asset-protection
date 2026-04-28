import api from './client'
import type { Infringement } from '../types'

export async function listInfringements(params?: {
  asset_id?: string
  status?: string
}): Promise<Infringement[]> {
  const res = await api.get<Infringement[]>('/infringements/', { params: { limit: 500, ...params } })
  return res.data
}

export async function getInfringement(id: string): Promise<Infringement> {
  const res = await api.get<Infringement>(`/infringements/${id}`)
  return res.data
}

export async function patchInfringement(
  id: string,
  data: Partial<Pick<Infringement, 'status'>>
): Promise<Infringement> {
  const res = await api.patch<Infringement>(`/infringements/${id}`, data)
  return res.data
}

export async function getDmca(id: string): Promise<Blob> {
  const res = await api.get(`/infringements/${id}/dmca`, { responseType: 'blob' })
  return res.data
}
