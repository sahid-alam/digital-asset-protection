import api from './client'
import type { Asset } from '../types'

export async function uploadAsset(file: File, ownerEmail?: string): Promise<Asset> {
  const form = new FormData()
  form.append('file', file)
  if (ownerEmail) form.append('owner_email', ownerEmail)
  const res = await api.post<Asset>('/assets/upload', form)
  return res.data
}

export async function listAssets(): Promise<Asset[]> {
  const res = await api.get<Asset[]>('/assets/')
  return res.data
}

export async function getAsset(id: string): Promise<Asset> {
  const res = await api.get<Asset>(`/assets/${id}`)
  return res.data
}
