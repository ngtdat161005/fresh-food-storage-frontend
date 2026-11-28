import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ReadingChart from './ReadingChart.jsx'
import SensorIcon from './SensorIcon.jsx'
import { dateTime, deviceStatus, formatValue, limitText } from '../utils/format.js'

const CONNECTION = {
  live: { label: 'Thời gian thực', color: 'success' },
  polling: { label: 'Cập nhật mỗi 60 giây', color: 'default' },
  loading: { label: 'Đang tải', color: 'default' },
  error: { label: 'Mất kết nối', color: 'error' },
  sample: { label: 'Dữ liệu mẫu', color: 'default' },
}

function outOfRange(value, min, max) {
  return Number.isFinite(value) && ((Number.isFinite(min) && value < min) || (Number.isFinite(max) && value > max))
}

function InfoItem({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>{label}</Typography>
      <Typography sx={{ mt: 0.3, fontWeight: 600 }}>{children}</Typography>
    </Box>
  )
}

function RoomInfo({ room, roomDetail, devices, connection, newestReading }) {
  const total = room.deviceCount ?? devices.length
  const active = room.activeDeviceCount ?? devices.filter((device) => device.online).length
  const state = CONNECTION[connection] ?? CONNECTION.loading
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: { xs: 2.2, md: 3 } } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.5 }}>THÔNG TIN PHÒNG KHO</Typography>
            <Typography variant="h4" sx={{ mt: 0.3 }}>{room.name}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{room.warehouse} · {room.product}</Typography>
          </Box>
          <Chip label={state.label} color={state.color} variant={state.color === 'default' ? 'outlined' : 'filled'} />
        </Box>
        <Box sx={{ mt: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
          <InfoItem label="Mã phòng">{room.id}</InfoItem>
          <InfoItem label="Vị trí">{roomDetail?.location || '—'}</InfoItem>
          <InfoItem label="Thiết bị hoạt động">{Number.isFinite(total) ? `${active ?? 0} / ${total}` : '—'}</InfoItem>
          <InfoItem label="Số đo mới nhất">{newestReading ? dateTime(newestReading.recordedAt) : '—'}</InfoItem>
        </Box>
        {roomDetail?.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{roomDetail.description}</Typography>}
      </CardContent>
    </Card>
  )
}

// Một cảm biến: giá trị hiện tại, ngưỡng, trạng thái và biểu đồ 24 giờ trong cùng một thẻ.
function SensorChartCard({ sensor, device, onOpen }) {
  const latest = sensor.readings.at(-1)
  const alarm = latest && outOfRange(latest.value, sensor.min, sensor.max)
  const status = device ? deviceStatus(device) : null
  return (
    <Card sx={{ borderColor: alarm ? 'error.main' : undefined }}>
      <CardContent sx={{ p: { xs: 2.2, md: 2.6 }, '&:last-child': { pb: 2.6 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
          <Box sx={{ mt: 0.3, display: 'flex', color: 'primary.main' }}><SensorIcon kind={sensor.kind} unit={sensor.unit} /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.3 }}>{sensor.deviceName}</Typography>
              {status && <Chip size="small" label={status.label} color={status.color} variant="outlined" />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ngưỡng: {limitText(sensor.min, sensor.max, sensor.unit)} · {sensor.readings.length} bản ghi
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ color: alarm ? 'error.main' : 'text.primary', whiteSpace: 'nowrap' }}>
              {latest ? formatValue(latest.value, sensor.unit) : '—'}
            </Typography>
            <Typography variant="caption" color={latest ? 'text.secondary' : 'warning.main'}>
              {latest ? dateTime(latest.recordedAt) : 'Không có dữ liệu trong 24 giờ'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <ReadingChart readings={sensor.readings} min={sensor.min} max={sensor.max} unit={sensor.unit} label={sensor.deviceName} />
        </Box>
        <Box sx={{ mt: 0.5, textAlign: 'right' }}>
          <Button size="small" onClick={onOpen}>Chi tiết và lịch sử</Button>
        </Box>
      </CardContent>
    </Card>
  )
}

function RecentReadings({ readings }) {
  const recent = [...readings].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)).slice(0, 8)
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 2.2 } }}>
        <Typography variant="h6">Bản ghi gần đây</Typography>
        {recent.length === 0 && <Typography color="text.secondary" sx={{ mt: 2 }}>Chưa có bản ghi.</Typography>}
        {recent.length > 0 && <TableContainer sx={{ mt: 1.5 }}>
          <Table size="small" aria-label="Các bản ghi cảm biến gần đây">
            <TableHead><TableRow><TableCell>Thời điểm</TableCell><TableCell>Cảm biến</TableCell><TableCell align="right">Giá trị</TableCell></TableRow></TableHead>
            <TableBody>
              {recent.map((item) => (
                <TableRow key={`${item.deviceId}-${item.id}`}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime(item.recordedAt)}</TableCell>
                  <TableCell>{item.deviceName}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatValue(item.value, item.unit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>}
      </CardContent>
    </Card>
  )
}

export default function RoomView({
  room, roomDetail, series, readings, devices, alerts, apiMode, connection, readingsError, alertsError,
  newestReading, stale, onOpenDevice,
}) {
  return (
    <>
      <RoomInfo room={room} roomDetail={roomDetail} devices={devices} connection={apiMode ? connection : 'sample'} newestReading={newestReading} />

      {apiMode && readingsError && <Alert severity="error" sx={{ mb: 2 }} role="alert">Mất kết nối dữ liệu cảm biến. Số đo bên dưới có thể đã cũ.</Alert>}
      {stale && <Alert severity="warning" sx={{ mb: 2 }} role="alert">{`Số đo đã cũ: bản ghi mới nhất lúc ${dateTime(newestReading.recordedAt)}. Hãy kiểm tra kết nối thiết bị.`}</Alert>}
      {apiMode && alertsError && <Alert severity="warning" sx={{ mb: 2 }}>Chưa tải được cảnh báo từ hệ thống. Không thể xác nhận phòng đang an toàn.</Alert>}
      {alerts.length > 0 && <Alert severity="error" icon={<WarningAmberRoundedIcon />} sx={{ mb: 3 }} role="alert">
        <Typography sx={{ fontWeight: 800 }}>Cảnh báo cần kiểm tra</Typography>
        {alerts.map((alert) => <Typography key={alert.id} variant="body2">{alert.message}</Typography>)}
      </Alert>}

      <Typography variant="h6" sx={{ mb: 1.5 }}>Số đo 24 giờ gần nhất</Typography>
      {series.length === 0 && <Alert severity="info" sx={{ mb: 3 }}>{apiMode && connection === 'loading' ? 'Đang tải số đo…' : 'Phòng chưa có cảm biến.'}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {series.map((sensor) => (
          <SensorChartCard
            key={sensor.deviceId}
            sensor={sensor}
            device={devices.find((device) => device.id === sensor.deviceId)}
            onOpen={() => onOpenDevice(sensor.deviceId)}
          />
        ))}
      </Box>

      <RecentReadings readings={readings} />
    </>
  )
}
