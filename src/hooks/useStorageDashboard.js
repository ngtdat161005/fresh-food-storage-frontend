import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRoomReadings, normalizeReading } from '../services/roomApi.js'
import { fetchRoomAlerts, fetchRoomDevices, fetchRooms } from '../services/storageApi.js'

function mergeReadings(current, incoming) {
  const byId = new Map(current.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))
  return [...byId.values()]
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
    .slice(-300)
}

export default function useStorageDashboard(baseUrl, roomId, wsUrl) {
  const [rooms, setRooms] = useState([])
  const [roomsError, setRoomsError] = useState('')
  const [readings, setReadings] = useState([])
  const [readingsError, setReadingsError] = useState('')
  const [devices, setDevices] = useState([])
  const [devicesError, setDevicesError] = useState('')
  const [alerts, setAlerts] = useState([])
  const [alertsError, setAlertsError] = useState('')
  const [connection, setConnection] = useState('idle')
  const [dataRoomId, setDataRoomId] = useState('')
  const currentRoomIdRef = useRef(roomId)
  const devicesRequestRef = useRef(null)

  useEffect(() => { currentRoomIdRef.current = roomId }, [roomId])

  useEffect(() => {
    if (!baseUrl) return undefined
    const controller = new AbortController()
    fetchRooms(baseUrl, controller.signal)
      .then((next) => { setRooms(next); setRoomsError('') })
      .catch((error) => { if (!controller.signal.aborted) setRoomsError(error.message) })
    return () => controller.abort()
  }, [baseUrl])

  const refreshDevices = useCallback(async ({ signal, skipIfBusy = false } = {}) => {
    if (!baseUrl || !roomId) return
    const inFlight = devicesRequestRef.current
    if (inFlight?.roomId === roomId) {
      if (skipIfBusy) return inFlight.promise
      try { await inFlight.promise } catch { /* vẫn thử lại sau yêu cầu trước */ }
    }

    const promise = fetchRoomDevices(baseUrl, roomId, signal)
    devicesRequestRef.current = { roomId, promise }
    try {
      const next = await promise
      if (currentRoomIdRef.current === roomId) {
        setDevices(next)
        setDevicesError('')
      }
      return next
    } catch (error) {
      if (currentRoomIdRef.current === roomId && error.name !== 'AbortError') setDevicesError(error.message)
      throw error
    } finally {
      if (devicesRequestRef.current?.promise === promise) devicesRequestRef.current = null
    }
  }, [baseUrl, roomId])

  useEffect(() => {
    if (!baseUrl || !roomId) return undefined
    let active = true
    let socket = null
    let readingCursor = null
    let socketOpen = false
    const controller = new AbortController()
    setDataRoomId(roomId)
    setReadings([])
    setDevices([])
    setAlerts([])
    setReadingsError('')
    setDevicesError('')
    setAlertsError('')
    setConnection('loading')

    async function loadReadings(incremental = false) {
      try {
        const next = await fetchRoomReadings({ baseUrl, roomId }, controller.signal, incremental ? readingCursor : null)
        if (!active) return
        setReadings((current) => incremental ? mergeReadings(current, next) : next)
        if (next.length) readingCursor = next.at(-1).recordedAt
        setReadingsError('')
        setConnection(socketOpen ? 'live' : 'polling')
      } catch (error) {
        if (!active || error.name === 'AbortError') return
        setReadingsError(error.message)
        setConnection('error')
      }
    }

    function loadDevices() {
      refreshDevices({ signal: controller.signal, skipIfBusy: true }).catch(() => {})
    }

    async function loadAlerts() {
      try {
        const next = await fetchRoomAlerts(baseUrl, roomId, controller.signal)
        if (active) { setAlerts(next); setAlertsError('') }
      } catch (error) {
        if (active && error.name !== 'AbortError') setAlertsError(error.message)
      }
    }

    loadReadings()
    loadDevices()
    loadAlerts()

    if (wsUrl) {
      try {
        socket = new WebSocket(wsUrl)
        socket.onopen = () => { socketOpen = true; if (active) setConnection('live') }
        socket.onclose = () => { socketOpen = false; if (active) setConnection('polling') }
        socket.onerror = () => { socketOpen = false; if (active) setConnection('polling') }
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            const eventRoomId = message.roomId ?? message.room_id ?? message.ma_phong
            if (eventRoomId != null && String(eventRoomId) !== String(roomId)) return
            const eventType = String(message.type ?? message.event ?? '').toLowerCase()
            if (eventType.includes('alert') || eventType.includes('canh_bao')) loadAlerts()
            if (eventType.includes('device') || eventType.includes('thiet_bi')) loadDevices()
            const point = normalizeReading(message.reading ?? message.data ?? message)
            if (!point || !active) return
            setReadings((current) => mergeReadings(current, [point]))
            readingCursor = point.recordedAt
            setReadingsError('')
            setConnection('live')
          } catch {
            // Sự kiện khác số đo được tải lại qua API riêng.
          }
        }
      } catch {
        setConnection('polling')
      }
    }

    const readingsTimer = window.setInterval(() => {
      if (!socketOpen) loadReadings(true)
    }, 60_000)
    const devicesTimer = window.setInterval(loadDevices, 5_000)
    const alertsTimer = window.setInterval(loadAlerts, 30_000)

    return () => {
      active = false
      controller.abort()
      window.clearInterval(readingsTimer)
      window.clearInterval(devicesTimer)
      window.clearInterval(alertsTimer)
      socket?.close()
    }
  }, [baseUrl, roomId, wsUrl, refreshDevices])

  return {
    rooms, roomsError, dataRoomId, readings, readingsError, devices, devicesError,
    alerts, alertsError, connection, refreshDevices,
  }
}
