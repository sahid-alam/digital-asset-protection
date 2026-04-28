import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api from '../api/client'

interface AppContextValue {
  refreshKey: number
  triggerRefresh: () => void
  isRefreshing: boolean
  rowCount: number
  setRowCount: (n: number) => void
  pendingCount: number
  setPendingCount: (n: number) => void
  latency: number | null
  crawlerStatus: 'IDLE' | 'SCANNING'
  setCrawlerStatus: (s: 'IDLE' | 'SCANNING') => void
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [rowCount, setRowCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [latency, setLatency] = useState<number | null>(null)
  const [crawlerStatus, setCrawlerStatus] = useState<'IDLE' | 'SCANNING'>('IDLE')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => setIsRefreshing(false), 500)
  }, [])

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // Ping /health every 30s for latency
  useEffect(() => {
    async function ping() {
      const t0 = Date.now()
      try {
        await api.get('/health', { timeout: 5000 })
        setLatency(Date.now() - t0)
      } catch {
        setLatency(null)
      }
    }
    ping()
    const id = setInterval(ping, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <AppContext.Provider
      value={{
        refreshKey,
        triggerRefresh,
        isRefreshing,
        rowCount,
        setRowCount,
        pendingCount,
        setPendingCount,
        latency,
        crawlerStatus,
        setCrawlerStatus,
        paletteOpen,
        openPalette,
        closePalette,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
