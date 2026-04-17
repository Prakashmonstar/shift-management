// client/src/data/useStore.js
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchUsers, fetchAgents, fetchWeekSchedule,
  fetchLeaves, fetchShiftRequests,
} from './store'

const AUTO_REFRESH_MS = 30000 // 30 seconds

export function useStore(user) {
  const [agents,        setAgents]        = useState([])
  const [users,         setUsers]         = useState([])
  const [leaves,        setLeaves]        = useState([])
  const [requests,      setRequests]      = useState([])
  const [scheduleCache, setScheduleCache] = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  // Auto-refresh state — shows countdown + last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState(null)
  const [nextRefreshIn,   setNextRefreshIn]   = useState(AUTO_REFRESH_MS / 1000)

  const mounted        = useRef(true)
  const refreshInterval = useRef(null)
  const countdownInterval = useRef(null)

  // ── Load everything ─────────────────────────────────────────
  const loadAll = useCallback(async (silent = false) => {
    if (!user) return
    try {
      if (!silent) setLoading(true)
      const [u, a, l, r] = await Promise.all([
        fetchUsers(), fetchAgents(), fetchLeaves(), fetchShiftRequests()
      ])
      if (!mounted.current) return
      setUsers(u); setAgents(a); setLeaves(l); setRequests(r)
      setLastRefreshTime(new Date())
      setNextRefreshIn(AUTO_REFRESH_MS / 1000)
      setError('')
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      if (mounted.current && !silent) setLoading(false)
    }
  }, [user])

  // ── Load only leaves + requests (used for background refresh) ─
  const refreshLeavesAndRequests = useCallback(async () => {
    if (!user || !mounted.current) return
    try {
      const [l, r] = await Promise.all([fetchLeaves(), fetchShiftRequests()])
      if (mounted.current) {
        setLeaves(l); setRequests(r)
        setLastRefreshTime(new Date())
        setNextRefreshIn(AUTO_REFRESH_MS / 1000)
      }
    } catch (e) { /* silent — don't break UI on background refresh */ }
  }, [user])

  // ── Individual refresh helpers ───────────────────────────────
  const refreshLeaves   = useCallback(async () => {
    const l = await fetchLeaves()
    if (mounted.current) setLeaves(l)
  }, [])

  const refreshRequests = useCallback(async () => {
    const r = await fetchShiftRequests()
    if (mounted.current) setRequests(r)
  }, [])

  const refreshUsers = useCallback(async () => {
    const [u, a] = await Promise.all([fetchUsers(), fetchAgents()])
    if (mounted.current) { setUsers(u); setAgents(a) }
  }, [])

  const refresh = useCallback(() => loadAll(false), [loadAll])

  // ── Load schedule for a week ─────────────────────────────────
  const loadSchedule = useCallback(async (weekKey) => {
    try {
      const data = await fetchWeekSchedule(weekKey)
      if (mounted.current)
        setScheduleCache(prev => ({ ...prev, [weekKey]: data }))
      return data
    } catch (e) {
      console.error('loadSchedule:', e.message)
      return { status: 'draft', shifts: {} }
    }
  }, [])

  // ── Auto-refresh every 30s ───────────────────────────────────
  useEffect(() => {
    if (!user) return
    // Auto refresh interval
    refreshInterval.current = setInterval(() => {
      refreshLeavesAndRequests()
    }, AUTO_REFRESH_MS)

    // Countdown timer (updates every second)
    countdownInterval.current = setInterval(() => {
      if (mounted.current) setNextRefreshIn(prev => prev <= 1 ? AUTO_REFRESH_MS / 1000 : prev - 1)
    }, 1000)

    return () => {
      clearInterval(refreshInterval.current)
      clearInterval(countdownInterval.current)
    }
  }, [user, refreshLeavesAndRequests])

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true
    loadAll(false)
    return () => { mounted.current = false }
  }, [loadAll])

  return {
    agents, users, leaves, requests, scheduleCache,
    loading, error,
    lastRefreshTime, nextRefreshIn,
    loadSchedule, refresh,
    refreshLeaves, refreshRequests, refreshUsers,
    setScheduleCache,
    pendingLeaves:   leaves.filter(l => l.status === 'pending').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
  }
}
