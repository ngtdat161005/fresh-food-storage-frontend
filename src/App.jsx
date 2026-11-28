import { useEffect, useMemo, useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import DeviceView from './components/DeviceView.jsx'
import RoomView from './components/RoomView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { sampleRooms } from './data/sampleData.js'
import useStorageDashboard from './hooks/useStorageDashboard.js'
import LoginPage from './pages/LoginPage.jsx'
import { readingKind } from './services/roomApi.js'
import { sendDeviceCommand } from './services/storageApi.js'
import { shell } from './theme.js'
import { ruleBounds } from './utils/format.js'

const SIDEBAR_WIDTH = 270
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
const wsUrl = import.meta.env.VITE_WS_URL ?? ''
const STALE_AFTER_MS = 2 * 60 * 1000

// Mỗi cảm biến một chuỗi số đo. Có API: danh sách cảm biến và ngưỡng lấy từ /readings,
// kể cả cảm biến không có bản ghi trong 24 giờ. Dữ liệu mẫu: suy ra từ các số đo.
function buildSeries(apiMode, readings, sensors, room) {
  if (apiMode) {
    return sensors.map((sensor) => ({
      deviceId: sensor.deviceId,
      deviceName: sensor.deviceName,
      unit: sensor.unit,
      kind: readingKind(sensor.unit, sensor.deviceName),
      ...ruleBounds(sensor.limits),
      readings: readings.filter((item) => item.deviceId === sensor.deviceId),
    }))
  }
  const byDevice = new Map()
  readings.forEach((item) => {
    if (!byDevice.has(item.deviceId)) {
      byDevice.set(item.deviceId, {
        deviceId: item.deviceId, deviceName: item.deviceName, unit: item.unit, kind: item.kind,
        min: item.kind === 'temperature' ? room.minTemp : item.kind === 'humidity' ? room.minHumidity : null,
        max: item.kind === 'temperature' ? room.maxTemp : item.kind === 'humidity' ? room.maxHumidity : null,
        readings: [],
      })
    }
    byDevice.get(item.deviceId).readings.push(item)
  })
  return [...byDevice.values()]
}

// Chế độ dữ liệu mẫu: thêm cảm biến (suy từ số đo) vào danh sách thiết bị của phòng.
function withSampleSensors(room) {
  const sensors = buildSeries(false, room.readings ?? [], [], room).map((series) => ({
    id: series.deviceId, name: series.deviceName, kind: series.kind, unit: series.unit, isSensor: true, online: true,
  }))
  return { ...room, devices: [...sensors, ...(room.devices ?? [])] }
}

function sampleDevice(room, series, deviceId) {
  const sensor = series.find((item) => item.deviceId === deviceId)
  if (sensor) {
    return {
      id: sensor.deviceId, name: sensor.deviceName, kind: sensor.kind, unit: sensor.unit, isSensor: true, status: 'HOAT_DONG',
      roomName: room.name, rules: [{ id: 'mau', name: 'Ngưỡng mẫu', action: 'CANH_BAO_NGOAI_KHOANG', min: sensor.min, max: sensor.max }],
      latest: sensor.readings.at(-1) ?? null, readings: sensor.readings,
    }
  }
  const device = room.devices?.find((item) => item.id === deviceId)
  return device ? { ...device, isSensor: false, status: device.online ? 'HOAT_DONG' : 'MAT_KET_NOI', roomName: room.name, rules: [] } : null
}

function Header({ room, deviceName, onMenu }) {
  return (
    <Box component="header" sx={{ bgcolor: shell.header, borderBottom: `1px solid ${shell.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
      <Container maxWidth="xl" sx={{ py: 1.4, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
        <IconButton aria-label="Mở menu" onClick={onMenu} sx={{ display: { xs: 'inline-flex', md: 'none' } }}><MenuIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[room?.warehouse, room?.name, deviceName].filter(Boolean).join(' / ')}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.3 }}>{deviceName ? 'Chi tiết thiết bị' : 'Giám sát phòng kho'}</Typography>
        </Box>
        <Button href="/login" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap', bgcolor: '#FFFFFF' }}>Đăng nhập</Button>
      </Container>
    </Box>
  )
}

function Dashboard() {
  const apiMode = Boolean(baseUrl)
  const [selectedRoomId, setSelectedRoomId] = useState(apiMode ? '' : sampleRooms[1].id)
  const [view, setView] = useState({ type: 'room' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [commandTarget, setCommandTarget] = useState(null)
  const [pendingCommand, setPendingCommand] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const apiState = useStorageDashboard(baseUrl, selectedRoomId, wsUrl)
  const rooms = useMemo(() => apiMode ? apiState.rooms : sampleRooms.map(withSampleSensors), [apiMode, apiState.rooms])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (apiMode && rooms.length && !rooms.some((item) => item.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id)
      setView({ type: 'room' })
    }
  }, [apiMode, rooms, selectedRoomId])

  useEffect(() => { window.scrollTo(0, 0) }, [view, selectedRoomId])

  useEffect(() => {
    if (!pendingCommand || pendingCommand.phase !== 'waiting' || pendingCommand.roomId !== selectedRoomId) return undefined
    const confirmed = apiState.devices.find((item) => item.id === pendingCommand.deviceId)
    if (confirmed?.powerState === pendingCommand.state) {
      setFeedback({ deviceId: pendingCommand.deviceId, severity: 'success', message: confirmed.name + ' đã xác nhận trạng thái ' + (pendingCommand.state === 'on' ? 'bật.' : 'tắt.') })
      setPendingCommand(null)
      return undefined
    }
    const poll = window.setInterval(() => apiState.refreshDevices().catch(() => {}), 3000)
    const remaining = Math.max(0, 15_000 - (Date.now() - pendingCommand.startedAt))
    const timeout = window.setTimeout(() => {
      setFeedback({ deviceId: pendingCommand.deviceId, severity: 'warning', message: 'Đã gửi lệnh nhưng chưa nhận được xác nhận trạng thái. Kiểm tra thiết bị trước khi thử lại.' })
      setPendingCommand(null)
    }, remaining)
    return () => { window.clearInterval(poll); window.clearTimeout(timeout) }
  }, [pendingCommand, selectedRoomId, apiState.devices, apiState.refreshDevices])

  async function confirmCommand() {
    if (!commandTarget || !apiMode) return
    const { device, state } = commandTarget
    setCommandTarget(null)
    setFeedback(null)
    setPendingCommand({ deviceId: device.id, roomId: selectedRoomId, state, phase: 'sending' })
    try {
      const result = await sendDeviceCommand(baseUrl, device.id, state === 'on' ? 'TURN_ON' : 'TURN_OFF')
      if (result?.accepted === false || String(result?.status ?? '').toLowerCase() === 'rejected') {
        throw new Error('Lệnh điều khiển bị từ chối.')
      }
      setPendingCommand({ deviceId: device.id, roomId: selectedRoomId, state, phase: 'waiting', startedAt: Date.now() })
      await apiState.refreshDevices().catch(() => {})
    } catch (error) {
      const message = String(error.message).includes('(404)') ? 'Backend chưa hỗ trợ lệnh điều khiển cho thiết bị này.' : error.message
      setFeedback({ deviceId: device.id, severity: 'error', message: message || 'Không gửi được lệnh điều khiển.' })
      setPendingCommand(null)
    }
  }

  function selectRoom(roomId) {
    setSelectedRoomId(roomId)
    setView({ type: 'room' })
    setDrawerOpen(false)
    setFeedback(null)
    setPendingCommand(null)
  }

  function selectDevice(roomId, deviceId) {
    if (roomId !== selectedRoomId) {
      setSelectedRoomId(roomId)
      setFeedback(null)
      setPendingCommand(null)
    }
    setView({ type: 'device', deviceId })
    setDrawerOpen(false)
  }

  const room = rooms.find((item) => item.id === selectedRoomId)
  const roomDataReady = !apiMode || apiState.dataRoomId === selectedRoomId
  const readings = apiMode ? roomDataReady ? apiState.readings : [] : room?.readings ?? []
  const devices = apiMode ? roomDataReady ? apiState.devices : [] : room?.devices ?? []
  const alerts = apiMode ? roomDataReady ? apiState.alerts : [] : room?.alerts ?? []
  const sensors = apiMode && roomDataReady ? apiState.sensors : []
  const series = room ? buildSeries(apiMode, readings, sensors, room) : []
  const newestReading = [...readings].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)).at(-1)
  const stale = apiMode && newestReading && now - Date.parse(newestReading.recordedAt) > STALE_AFTER_MS
  const alertRoomIds = new Set(apiMode ? alerts.length ? [selectedRoomId] : [] : sampleRooms.filter((item) => item.alerts.length).map((item) => item.id))
  const deviceId = view.type === 'device' ? view.deviceId : null
  const deviceName = deviceId
    ? devices.find((item) => item.id === deviceId)?.name ?? series.find((item) => item.deviceId === deviceId)?.deviceName ?? `Thiết bị ${deviceId}`
    : null

  if (!room) {
    return <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Kho Tươi</Typography>
      {apiState.roomsError ? <Alert severity="error">Không tải được danh sách phòng kho. {apiState.roomsError}</Alert>
        : <Alert severity="info" icon={rooms.length ? undefined : <CircularProgress size={18} />}>{rooms.length ? 'Chưa có phòng kho.' : 'Đang tải danh sách phòng kho…'}</Alert>}
    </Container>
  }

  const sidebar = (
    <Sidebar
      rooms={rooms}
      selectedRoomId={room.id}
      selectedDeviceId={deviceId}
      alertRoomIds={alertRoomIds}
      currentDevices={devices}
      currentDevicesError={apiMode ? apiState.devicesError : ''}
      apiMode={apiMode}
      baseUrl={baseUrl}
      onSelectRoom={selectRoom}
      onSelectDevice={selectDevice}
    />
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex' }}>
      <Box component="aside" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: `1px solid ${shell.border}`, display: { xs: 'none', md: 'block' }, position: 'sticky', top: 0, height: '100vh' }}>{sidebar}</Box>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { xs: 'block', md: 'none' } }} PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}>{sidebar}</Drawer>
      <Box component="main" sx={{ minWidth: 0, flex: 1 }}>
        <Header room={room} deviceName={deviceName} onMenu={() => setDrawerOpen(true)} />
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, pb: 7 }}>
          {deviceId
            ? <DeviceView
              key={deviceId}
              apiMode={apiMode}
              baseUrl={baseUrl}
              deviceId={deviceId}
              fallback={apiMode ? null : sampleDevice(room, series, deviceId)}
              onBack={() => setView({ type: 'room' })}
              controlDevice={devices.find((item) => item.id === deviceId)}
              controlError={apiMode ? apiState.devicesError : ''}
              pendingCommand={pendingCommand}
              feedback={feedback}
              onCommand={(device, state) => setCommandTarget({ device, state })}
            />
            : <RoomView
              room={room}
              roomDetail={apiMode ? apiState.roomDetail : null}
              series={series}
              readings={readings}
              devices={devices}
              alerts={alerts}
              apiMode={apiMode}
              connection={apiState.connection}
              readingsError={apiState.readingsError}
              alertsError={apiState.alertsError}
              newestReading={newestReading}
              stale={stale}
              onOpenDevice={(id) => selectDevice(room.id, id)}
            />}
        </Container>
      </Box>

      <Dialog open={Boolean(commandTarget)} onClose={() => setCommandTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Xác nhận điều khiển</DialogTitle>
        <DialogContent><Typography>Bạn muốn {commandTarget?.state === 'on' ? 'bật' : 'tắt'} {commandTarget?.device.name}?</Typography></DialogContent>
        <DialogActions><Button onClick={() => setCommandTarget(null)}>Hủy</Button><Button variant="contained" onClick={confirmCommand}>Gửi lệnh</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

export default function App() {
  return window.location.pathname === '/login' ? <LoginPage /> : <Dashboard />
}
