import { useEffect, useState } from 'react'
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined'
import AirOutlinedIcon from '@mui/icons-material/AirOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew'
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ReadingChart from './components/ReadingChart.jsx'
import { sampleRooms } from './data/sampleData.js'
import useStorageDashboard from './hooks/useStorageDashboard.js'
import LoginPage from './pages/LoginPage.jsx'
import { sendDeviceCommand } from './services/storageApi.js'

const SIDEBAR_WIDTH = 254
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
const wsUrl = import.meta.env.VITE_WS_URL ?? ''
const STALE_AFTER_MS = 2 * 60 * 1000

function dateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Chưa có dữ liệu'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function getSeries(readings, kind) {
  const matching = readings.filter((item) => item.kind === kind)
  const deviceId = matching.at(-1)?.deviceId
  return matching.filter((item) => item.deviceId === deviceId)
}

function limitText(min, max, unit) {
  return Number.isFinite(min) && Number.isFinite(max) ? min + '–' + max + ' ' + unit : 'Chưa có ngưỡng'
}

function MetricCard({ icon, label, reading, min, max, unit }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
          <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
        </Box>
        <Typography variant="h4" sx={{ mt: 1.2, color: 'text.primary', fontSize: { xs: 27, md: 30 } }}>
          {reading ? reading.value.toFixed(1) + ' ' + unit : '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>Giới hạn: {limitText(min, max, unit)}</Typography>
      </CardContent>
    </Card>
  )
}

function Sidebar({ rooms, selectedRoomId, alertRoomIds, onSelectRoom }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3, px: 1, mb: 5 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#08232B' }}>
          <AcUnitOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>KHO TƯƠI</Typography>
          <Typography variant="caption" color="text.secondary">Giám sát bảo quản</Typography>
        </Box>
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.4, letterSpacing: 1.5 }}>KHÔNG GIAN LÀM VIỆC</Typography>
      <Button startIcon={<HubOutlinedIcon />} fullWidth sx={{ mt: 0.7, justifyContent: 'flex-start', bgcolor: 'rgba(100,217,192,0.12)', color: 'primary.main', px: 1.4 }}>
        Tổng quan
      </Button>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.4, mt: 4, mb: 1, letterSpacing: 1.5 }}>PHÒNG BẢO QUẢN</Typography>
      <Stack spacing={0.5}>
        {rooms.map((room) => (
          <Button
            key={room.id}
            fullWidth
            onClick={() => onSelectRoom(room.id)}
            sx={{ px: 1.4, justifyContent: 'flex-start', textAlign: 'left', gap: 1.1, color: selectedRoomId === room.id ? 'text.primary' : 'text.secondary', bgcolor: selectedRoomId === room.id ? 'rgba(255,255,255,0.075)' : 'transparent' }}
          >
            <Box sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: alertRoomIds.has(room.id) ? 'error.main' : selectedRoomId === room.id ? 'primary.main' : '#637A91' }} />
            {room.name}
          </Button>
        ))}
      </Stack>
    </Box>
  )
}

function DeviceControls({ devices, error, apiMode, pendingCommand, feedback, onCommand }) {
  const controls = devices.filter((device) => device.controllable)
  return (
    <Card sx={{ mt: 2.2 }}>
      <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <PowerSettingsNewIcon color="primary" />
          <Typography variant="h6">Thiết bị điều khiển</Typography>
        </Box>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>Chưa tải được trạng thái thiết bị.</Alert>}
        {feedback && <Alert severity={feedback.severity} sx={{ mb: 2 }} role="status">{feedback.message}</Alert>}
        {!apiMode && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Không có kết nối điều khiển.</Typography>}
        {controls.length === 0 && !error && <Typography color="text.secondary">Chưa có thiết bị điều khiển trong phòng.</Typography>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {controls.map((device) => {
            const busy = pendingCommand?.deviceId === device.id
            return (
              <Box key={device.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: 'text.secondary' }}>{device.kind === 'fan' ? <AirOutlinedIcon /> : <AcUnitOutlinedIcon />}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 750 }}>{device.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{device.id}</Typography>
                  </Box>
                  <Chip size="small" label={!device.online ? 'Mất kết nối' : device.powerState === 'on' ? 'Đang bật' : device.powerState === 'off' ? 'Đang tắt' : 'Chưa rõ'} color={!device.online ? 'warning' : 'default'} variant="outlined" />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button size="small" variant={device.powerState === 'on' ? 'outlined' : 'contained'} disabled={!apiMode || Boolean(error) || !device.online || busy || device.powerState === 'on'} onClick={() => onCommand(device, 'on')} sx={{ flex: 1 }}>Bật</Button>
                  <Button size="small" variant={device.powerState === 'off' ? 'outlined' : 'contained'} disabled={!apiMode || Boolean(error) || !device.online || busy || device.powerState === 'off'} onClick={() => onCommand(device, 'off')} sx={{ flex: 1 }}>Tắt</Button>
                </Stack>
                {busy && <Typography variant="body2" color="warning.main" sx={{ mt: 1.2 }}>Đang chờ thiết bị xác nhận…</Typography>}
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

function RecentReadings({ readings }) {
  const recent = [...readings].reverse().slice(0, 6)
  return (
    <Card sx={{ mt: 2.2 }}>
      <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 2.2 } }}>
        <Typography variant="h6">Bản ghi gần đây</Typography>
        {recent.length === 0 && <Typography color="text.secondary" sx={{ mt: 2 }}>Chưa có bản ghi.</Typography>}
        <Stack spacing={1.2} sx={{ display: { xs: 'flex', md: 'none' }, mt: 2 }}>
          {recent.map((item) => (
            <Box key={item.id} sx={{ p: 1.6, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, minWidth: 0 }}>{item.deviceName}</Typography>
                <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{item.value.toFixed(1)} {item.unit}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.deviceId} · {dateTime(item.recordedAt)}</Typography>
            </Box>
          ))}
        </Stack>
        {recent.length > 0 && <TableContainer sx={{ display: { xs: 'none', md: 'block' }, mt: 2 }}>
          <Table size="small" aria-label="Các bản ghi cảm biến gần đây">
            <TableHead><TableRow><TableCell>Thời điểm</TableCell><TableCell>Thiết bị</TableCell><TableCell align="right">Giá trị</TableCell></TableRow></TableHead>
            <TableBody>
              {recent.map((item) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime(item.recordedAt)}</TableCell>
                  <TableCell>{item.deviceName} · {item.deviceId}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{item.value.toFixed(1)} {item.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>}
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const apiMode = Boolean(baseUrl)
  const [selectedRoomId, setSelectedRoomId] = useState(apiMode ? '' : sampleRooms[1].id)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [commandTarget, setCommandTarget] = useState(null)
  const [pendingCommand, setPendingCommand] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const apiState = useStorageDashboard(baseUrl, selectedRoomId, wsUrl)
  const rooms = apiMode ? apiState.rooms : sampleRooms

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (apiMode && rooms.length && !rooms.some((item) => item.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id)
    }
  }, [apiMode, rooms, selectedRoomId])

  useEffect(() => {
    if (!pendingCommand || pendingCommand.phase !== 'waiting' || pendingCommand.roomId !== selectedRoomId) return undefined
    const confirmed = apiState.devices.find((item) => item.id === pendingCommand.deviceId)
    if (confirmed?.powerState === pendingCommand.state) {
      setFeedback({ severity: 'success', message: confirmed.name + ' đã xác nhận trạng thái ' + (pendingCommand.state === 'on' ? 'bật.' : 'tắt.') })
      setPendingCommand(null)
      return undefined
    }
    const poll = window.setInterval(() => apiState.refreshDevices().catch(() => {}), 3000)
    const remaining = Math.max(0, 15_000 - (Date.now() - pendingCommand.startedAt))
    const timeout = window.setTimeout(() => {
      setFeedback({ severity: 'warning', message: 'Đã gửi lệnh nhưng chưa nhận được xác nhận trạng thái. Kiểm tra thiết bị trước khi thử lại.' })
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
      setFeedback({ severity: 'error', message: error.message || 'Không gửi được lệnh điều khiển.' })
      setPendingCommand(null)
    }
  }

  const room = rooms.find((item) => item.id === selectedRoomId)
  const roomDataReady = !apiMode || apiState.dataRoomId === selectedRoomId
  const readings = apiMode ? roomDataReady ? apiState.readings : [] : room?.readings ?? []
  const devices = apiMode ? roomDataReady ? apiState.devices : [] : room?.devices ?? []
  const alerts = apiMode ? roomDataReady ? apiState.alerts : [] : room?.alerts ?? []
  const temperatureReadings = getSeries(readings, 'temperature')
  const humidityReadings = getSeries(readings, 'humidity')
  const latestTemperature = temperatureReadings.at(-1)
  const latestHumidity = humidityReadings.at(-1)
  const newestReading = readings.at(-1)
  const stale = apiMode && newestReading && now - Date.parse(newestReading.recordedAt) > STALE_AFTER_MS
  const alertRoomIds = new Set(apiMode ? alerts.length ? [selectedRoomId] : [] : sampleRooms.filter((item) => item.alerts.length).map((item) => item.id))

  if (!room) {
    return <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Kho Tươi</Typography>
      {apiState.roomsError ? <Alert severity="error">Không tải được danh sách phòng kho. {apiState.roomsError}</Alert>
        : <Alert severity="info" icon={rooms.length ? undefined : <CircularProgress size={18} />}>{rooms.length ? 'Chưa có phòng kho.' : 'Đang tải danh sách phòng kho…'}</Alert>}
    </Container>
  }

  const sidebar = <Sidebar rooms={rooms} selectedRoomId={room.id} alertRoomIds={alertRoomIds} onSelectRoom={(id) => { setSelectedRoomId(id); setDrawerOpen(false); setFeedback(null); setPendingCommand(null) }} />

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex' }}>
      <Box component="aside" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'block' }, position: 'sticky', top: 0, height: '100vh', bgcolor: '#0E1B2B' }}>{sidebar}</Box>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { xs: 'block', md: 'none' } }} PaperProps={{ sx: { width: SIDEBAR_WIDTH, bgcolor: '#0E1B2B' } }}>{sidebar}</Drawer>
      <Box component="main" sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(14,27,43,0.82)' }}>
          <Container maxWidth="xl" sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <IconButton aria-label="Mở menu" onClick={() => setDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minWidth: 44, minHeight: 44 }}><MenuIcon /></IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700 }}>KHO TRUNG TÂM / TỔNG QUAN</Typography>
              <Typography variant="h6" sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.3 }}>Giám sát bảo quản</Typography>
            </Box>
            <Button href="/login" variant="outlined" size="small" sx={{ borderColor: 'divider', color: 'text.primary', whiteSpace: 'nowrap', minWidth: { xs: 78, sm: 90 } }}>Đăng nhập</Button>
          </Container>
        </Box>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, pb: 7 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.5 }}>THEO DÕI ĐIỀU KIỆN BẢO QUẢN</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{room.name}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.7 }}>{room.warehouse} · {room.product} · Mã phòng {room.id}</Typography>
          </Box>

          {apiMode && apiState.readingsError && <Alert severity="error" sx={{ mb: 2 }} role="alert">Mất kết nối dữ liệu cảm biến. Số đo bên dưới có thể đã cũ.</Alert>}
          {stale && <Alert severity="warning" sx={{ mb: 2 }} role="alert">{'Số đo đã cũ: bản ghi mới nhất lúc ' + dateTime(newestReading.recordedAt) + '. Hãy kiểm tra kết nối thiết bị.'}</Alert>}
          {apiMode && !newestReading && !apiState.readingsError && <Alert severity="info" sx={{ mb: 2 }}>{apiState.connection === 'loading' ? 'Đang tải số đo…' : 'Chưa có số đo từ thiết bị.'}</Alert>}
          {apiMode && apiState.alertsError && <Alert severity="warning" sx={{ mb: 2 }}>Chưa tải được cảnh báo từ hệ thống. Không thể xác nhận phòng đang an toàn.</Alert>}
          {alerts.length > 0 && <Alert severity="error" icon={<WarningAmberRoundedIcon />} sx={{ mb: 3 }} role="alert">
            <Typography sx={{ fontWeight: 800 }}>Cảnh báo cần kiểm tra</Typography>
            {alerts.map((alert) => <Typography key={alert.id} variant="body2">{alert.message}</Typography>)}
          </Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2.2, mb: 3 }}>
            <MetricCard icon={<DeviceThermostatOutlinedIcon />} label="Nhiệt độ mới nhất" reading={latestTemperature} min={room.minTemp} max={room.maxTemp} unit="°C" />
            <MetricCard icon={<WaterDropOutlinedIcon />} label="Độ ẩm mới nhất" reading={latestHumidity} min={room.minHumidity} max={room.maxHumidity} unit="%" />
            <Card sx={{ height: '100%' }}><CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Thiết bị điều khiển</Typography><SensorsOutlinedIcon sx={{ color: 'text.secondary' }} /></Box>
              <Typography variant="h4" sx={{ mt: 1.2 }}>{String(devices.filter((device) => device.controllable).length).padStart(2, '0')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>{apiMode && apiState.connection === 'live' ? 'Dữ liệu thời gian thực' : 'Theo dõi theo phòng'}</Typography>
            </CardContent></Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }, gap: 2.2 }}>
            {[
              { kind: 'temperature', label: 'Nhiệt độ', readings: temperatureReadings, min: room.minTemp, max: room.maxTemp, unit: '°C' },
              { kind: 'humidity', label: 'Độ ẩm', readings: humidityReadings, min: room.minHumidity, max: room.maxHumidity, unit: '%' },
            ].map((series) => (
              <Card key={series.kind}><CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 3 } }}>
                <Typography variant="h6">Diễn biến {series.label.toLowerCase()}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, mb: 2 }}>{series.readings.at(-1)?.deviceName || 'Chưa có cảm biến'} · {series.readings.length} bản ghi</Typography>
                <ReadingChart readings={series.readings} min={series.min} max={series.max} unit={series.unit} label={series.label} />
              </CardContent></Card>
            ))}
          </Box>

          <DeviceControls devices={devices} error={apiMode ? apiState.devicesError : ''} apiMode={apiMode} pendingCommand={pendingCommand} feedback={feedback} onCommand={(device, state) => setCommandTarget({ device, state })} />
          <RecentReadings readings={[...temperatureReadings, ...humidityReadings].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))} />
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
