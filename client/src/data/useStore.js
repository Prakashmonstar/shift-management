// client/src/data/useStore.js
// Central async data hook — fetches from MongoDB API and caches in state
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchUsers, fetchAgents, fetchWeekSchedule, fetchLeaves,
  fetchShiftRequests, getCurrentWeekKey,
} from './store'

export function useStore(user) {
  const [agents,   setAgents]   = useState([])
  const [users,    setUsers]    = useState([])
  const [leaves,   setLeaves]   = useState([])
  const [requests, setRequests] = useState([])
  const [scheduleCache, setScheduleCache] = useState({}) // weekKey → { status, shifts }
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const mounted = useRef(true)

  const safe = (fn) => (...args) => { if (mounted.current) fn(...args) }

  const loadAll = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const [u, a, l, r] = await Promise.all([
        fetchUsers(),
        fetchAgents(),
        fetchLeaves(),
        fetchShiftRequests(),
      ])
      if (!mounted.current) return
      setUsers(u)
      setAgents(a)
      setLeaves(l)
      setRequests(r)
      setError('')
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [user])

  const loadSchedule = useCallback(async (weekKey) => {
    try {
      const data = await fetchWeekSchedule(weekKey)
      if (mounted.current) {
        setScheduleCache(prev => ({ ...prev, [weekKey]: data }))
      }
      return data
    } catch (e) {
      console.error('loadSchedule error:', e.message)
      return { status: 'draft', shifts: {} }
    }
  }, [])

  const refreshLeaves   = useCallback(async () => {
    const l = await fetchLeaves();   if (mounted.current) setLeaves(l)
  }, [])

  const refreshRequests = useCallback(async () => {
    const r = await fetchShiftRequests(); if (mounted.current) setRequests(r)
  }, [])

  const refreshUsers    = useCallback(async () => {
    const [u, a] = await Promise.all([fetchUsers(), fetchAgents()])
    if (mounted.current) { setUsers(u); setAgents(a) }
  }, [])

  const refresh = useCallback(async () => {
    await loadAll()
  }, [loadAll])

  useEffect(() => {
    mounted.current = true
    loadAll()
    return () => { mounted.current = false }
  }, [loadAll])

  return {
    agents, users, leaves, requests, scheduleCache,
    loading, error,
    loadSchedule, refresh, refreshLeaves, refreshRequests, refreshUsers,
    setScheduleCache,
    // Computed
    pendingLeaves:   leaves.filter(l => l.status === 'pending').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
  }
}
