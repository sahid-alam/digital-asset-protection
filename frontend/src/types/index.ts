export interface Asset {
  id: string
  filename: string
  asset_type: 'image' | 'document'
  storage_url: string
  owner_email?: string
  created_at: string
  fingerprint_id: string
}

export interface Infringement {
  id: string
  asset_id: string
  source_url: string
  platform?: string
  confidence_score: number
  clip_score?: number
  phash_distance?: number
  vision_api_hit: boolean
  status: 'pending' | 'valid' | 'false_positive' | 'dmca_sent'
  detected_at: string
}

export interface ScanJob {
  job_id: string
  asset_id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  matches_found: number
}

export interface AnalyticsSummary {
  total_assets: number
  total_infringements: number
  pending_count: number
  valid_count: number
  false_positive_count: number
  dmca_sent_count: number
  avg_confidence_score: number
  high_confidence_count: number
  last_scan_at: string | null
  platform_breakdown: Record<string, number>
}
