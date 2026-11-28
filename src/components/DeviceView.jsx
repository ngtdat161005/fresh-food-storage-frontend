import { useCallback, useEffect, useRef, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ReadingChart from './ReadingChart.jsx'
import SensorIcon from './SensorIcon.jsx'
import { fetchDeviceDetail, fetchDeviceReadings } from '../services/deviceApi.js'
import { dateTime, deviceStatus, formatValue } from '../utils/format.js'

// Rule có ngưỡng giá trị đo (rule pin yếu không dùng để vẽ ngưỡng).
const VALUE_RULES = ['CANH_BAO_NGOAI_KHOANG', 'BAT_KHI_VUOT_NGUONG_TREN']
const HOUR = 60 * 60 * 1000
const RANGES = [{ label: '1 giờ', ms: HOUR }, { label: '24 giờ', ms: 24 * HOUR }, { label: '7 ngày', ms: 7 * 24 * HOUR }]

// Ô datetime-local dùng giờ địa phương dạng YYYY-MM-DDTHH:mm.
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultRange(ms = 24 * HOUR) {
  const end = new Date()
  return { start: toLocalInput(new Date(end.getTime() - ms)), end: toLocalInput(end) }
}

function valueBounds(rules) {
  const rule = rules.find((item) => VALUE_RULES.includes(item.action) && (item.min != null || item.max != null))
  return { min: rule?.min ?? null, max: rule?.max ?? null }
}

function InfoItem({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>{label}</Typography>
      <Typography sx={{ mt: 0.3, fontWeight: 600, overflowWrap: 'anywhere' }}>{children ?? '—'}</Typography>
    </Box>
  )
}

const POWER = {
  on: { label: 'Đang bật', color: 'success', variant: 'filled' },
  off: { label: 'Đang tắt', color: 'default', variant: 'filled' },
  unknown: { label: 'Chưa rõ', color: 'default', variant: 'outlined' },
}

// Bật/tắt thiết bị điều khiển. device lấy từ danh sách thiết bị của phòng (hỏi lại mỗi 5 giây),
// nên trạng thái bật/tắt chỉ đổi khi backend báo thiết bị đã đổi.
function ControlPanel({ device, error, apiMode, pendingCommand, feedback, onCommand }) {
  const busy = Boolean(device) && pendingCommand?.deviceId === device.id
  const power = POWER[device?.powerState] ?? POWER.unknown
  const blocked = !apiMode || Boolean(error) || !device?.online || busy
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.2 }}>
          <PowerSettingsNewIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }}>Điều khiển</Typography>
          <Typography variant="body2" color="text.secondary">Trạng thái hiện tại</Typography>
          <Chip label={power.label} color={power.color} variant={power.variant} />
        </Box>
        {feedback && feedback.deviceId === device?.id && <Alert severity={feedback.severity} sx={{ mt: 2 }} role="status">{feedback.message}</Alert>}
        {!apiMode && <Alert severity="info" sx={{ mt: 2 }}>Đang dùng dữ liệu mẫu, không có kết nối điều khiển.</Alert>}
        {apiMode && (error || !device) && <Alert severity="warning" sx={{ mt: 2 }}>Chưa tải được trạng thái thiết bị.</Alert>}
        {device && !device.controllable
          ? <Typography color="text.secondary" sx={{ mt: 2 }}>Thiết bị này không hỗ trợ điều khiển từ ứng dụng.</Typography>
          : <>
            {device && !device.online && <Alert severity="warning" sx={{ mt: 2 }}>Thiết bị đang mất kết nối, chưa thể gửi lệnh.</Alert>}
            <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, maxWidth: 420 }}>
              <Button variant={device?.powerState === 'on' ? 'outlined' : 'contained'} disabled={blocked || device?.powerState === 'on'} onClick={() => onCommand(device, 'on')} sx={{ flex: 1 }}>Bật</Button>
              <Button variant={device?.powerState === 'off' ? 'outlined' : 'contained'} disabled={blocked || device?.powerState === 'off'} onClick={() => onCommand(device, 'off')} sx={{ flex: 1 }}>Tắt</Button>
            </Stack>
            {busy
              ? <Typography variant="body2" color="warning.main" sx={{ mt: 1.5 }}>Đang chờ thiết bị xác nhận…</Typography>
              : <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Lệnh cần xác nhận trước khi gửi. Trạng thái chỉ đổi khi thiết bị xác nhận; quá 15 giây không có xác nhận sẽ báo lỗi.</Typography>}
          </>}
      </CardContent>
    </Card>
  )
}

export default function DeviceView({
  apiMode, baseUrl, deviceId, fallback, onBack,
  controlDevice, controlError, pendingCommand, feedback, onCommand,
}) {
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [form, setForm] = useState(() => ({ ...defaultRange(), limit: 200 }))
  const [records, setRecords] = useState([])
  const [recordsState, setRecordsState] = useState({ loading: false, error: '', limit: 200 })
  const requestRef = useRef(null)

  const loadRecords = useCallback(async ({ start, end, limit }) => {
    const startDate = start ? new Date(start) : null
    // Ô "Đến" chỉ có đến phút: lấy trọn phút đó để không bỏ sót bản ghi vừa ghi.
    const endDate = end ? new Date(new Date(end).getTime() + 59_999) : null
    const max = Math.min(1000, Math.max(1, Number(limit) || 200))
    if (startDate && endDate && startDate >= endDate) {
      setRecordsState({ loading: false, error: 'Thời điểm bắt đầu phải trước thời điểm kết thúc.', limit: max })
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setRecordsState({ loading: true, error: '', limit: max })
    try {
      let next
      if (apiMode) {
        next = await fetchDeviceReadings(baseUrl, deviceId, { start: startDate, end: endDate, limit: max }, controller.signal)
      } else {
        next = (fallback?.readings ?? [])
          .filter((item) => (!startDate || Date.parse(item.recordedAt) >= startDate) && (!endDate || Date.parse(item.recordedAt) <= endDate))
          .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
          .slice(0, max)
      }
      if (!controller.signal.aborted) {
        setRecords(next)
        setRecordsState({ loading: false, error: '', limit: max })
      }
    } catch (error) {
      if (!controller.signal.aborted) setRecordsState({ loading: false, error: error.message, limit: max })
    }
  }, [apiMode, baseUrl, deviceId, fallback])

  // Đổi thiết bị: tải chi tiết, nếu là cảm biến thì tải luôn bản ghi 24 giờ gần nhất.
  useEffect(() => {
    const controller = new AbortController()
    const range = { ...defaultRange(), limit: 200 }
    setDetail(null)
    setDetailError('')
    setRecords([])
    setForm(range)
    const load = apiMode ? fetchDeviceDetail(baseUrl, deviceId, controller.signal) : Promise.resolve(fallback)
    load
      .then((next) => {
        if (controller.signal.aborted) return
        if (!next) throw new Error('Không tìm thấy thiết bị.')
        setDetail(next)
        if (next.isSensor) loadRecords(range)
      })
      .catch((error) => { if (!controller.signal.aborted) setDetailError(error.message) })
    return () => { controller.abort(); requestRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode, baseUrl, deviceId])

  function applyRange(ms) {
    const next = { ...form, ...defaultRange(ms) }
    setForm(next)
    loadRecords(next)
  }

  if (detailError) {
    return <>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>Quay lại phòng</Button>
      <Alert severity="error">{detailError}</Alert>
    </>
  }
  if (!detail) return <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>

  const status = deviceStatus(detail)
  const bounds = valueBounds(detail.rules ?? [])
  const latest = detail.latest ?? records[0] ?? null
  const reachedLimit = records.length >= recordsState.limit

  return (
    <>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>Quay lại phòng</Button>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: { xs: 2.2, md: 3 } } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#E3EEFA', color: 'primary.main' }}>
                <SensorIcon kind={detail.kind} unit={detail.unit} fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.5 }}>{detail.isSensor ? 'CẢM BIẾN' : 'THIẾT BỊ ĐIỀU KHIỂN'}</Typography>
                <Typography variant="h4" sx={{ lineHeight: 1.15 }}>{detail.name}</Typography>
                {detail.type && <Typography color="text.secondary" sx={{ mt: 0.3 }}>{detail.type}</Typography>}
              </Box>
            </Box>
            <Stack alignItems="flex-end" spacing={0.8}>
              <Chip label={status.label} color={status.color} variant="outlined" />
              {detail.isSensor && <Typography variant="h4" sx={{ color: bounds && latest && ((bounds.min != null && latest.value < bounds.min) || (bounds.max != null && latest.value > bounds.max)) ? 'error.main' : 'text.primary' }}>
                {latest ? formatValue(latest.value, detail.unit) : '—'}
              </Typography>}
              {detail.isSensor && latest && <Typography variant="body2" color="text.secondary">Lúc {dateTime(latest.recordedAt)}</Typography>}
            </Stack>
          </Box>
          <Box sx={{ mt: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
            <InfoItem label="Mã thiết bị">{detail.id}</InfoItem>
            <InfoItem label="Phòng">{detail.roomName}</InfoItem>
            <InfoItem label="Vị trí trong phòng">{detail.position}</InfoItem>
            <InfoItem label="Đơn vị đo">{detail.unit || 'Không đo'}</InfoItem>
            <InfoItem label="Địa chỉ MAC">{detail.mac}</InfoItem>
            <InfoItem label="Feed Adafruit">{detail.feedKey}</InfoItem>
            <InfoItem label="Pin">{Number.isFinite(detail.battery) ? `${detail.battery} %` : null}</InfoItem>
            <InfoItem label="Hoạt động lần cuối">{detail.lastSeen ? dateTime(detail.lastSeen) : null}</InfoItem>
          </Box>
        </CardContent>
      </Card>

      {!detail.isSensor && <ControlPanel
        device={controlDevice}
        error={controlError}
        apiMode={apiMode}
        pendingCommand={pendingCommand}
        feedback={feedback}
        onCommand={onCommand}
      />}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 2.2 } }}>
          <Typography variant="h6">Rule đang áp dụng</Typography>
          {(detail.rules ?? []).length === 0
            ? <Typography color="text.secondary" sx={{ mt: 1.5 }}>Chưa gán rule.</Typography>
            : <TableContainer sx={{ mt: 1.5 }}>
              <Table size="small" aria-label="Rule đang áp dụng cho thiết bị">
                <TableHead><TableRow><TableCell>Tên rule</TableCell><TableCell>Xử lý</TableCell><TableCell align="right">Giới hạn dưới</TableCell><TableCell align="right">Giới hạn trên</TableCell></TableRow></TableHead>
                <TableBody>
                  {detail.rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{rule.action}</TableCell>
                      <TableCell align="right">{rule.min ?? '—'}</TableCell>
                      <TableCell align="right">{rule.max ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>}
        </CardContent>
      </Card>

      {detail.isSensor && <Card>
        <CardContent sx={{ p: { xs: 2.2, md: 3 }, '&:last-child': { pb: 3 } }}>
          <Typography variant="h6">Lịch sử số đo</Typography>
          <Box
            component="form"
            onSubmit={(event) => { event.preventDefault(); loadRecords(form) }}
            sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}
          >
            <TextField size="small" type="datetime-local" label="Từ" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="datetime-local" label="Đến" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="number" label="Tối đa" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} inputProps={{ min: 1, max: 1000 }} sx={{ width: 110 }} />
            <Button type="submit" variant="contained" disabled={recordsState.loading}>Xem</Button>
            <Stack direction="row" spacing={0.5}>
              {RANGES.map((range) => <Button key={range.label} size="small" variant="outlined" onClick={() => applyRange(range.ms)}>{range.label}</Button>)}
            </Stack>
          </Box>

          {recordsState.error && <Alert severity="error" sx={{ mt: 2 }}>{recordsState.error}</Alert>}
          <Box sx={{ mt: 2.5 }}>
            {recordsState.loading
              ? <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
              : <ReadingChart readings={records} min={bounds.min} max={bounds.max} unit={detail.unit} label={detail.name} />}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {records.length} bản ghi{reachedLimit ? ` (đạt giới hạn ${recordsState.limit}; có thể còn bản ghi cũ hơn, hãy thu hẹp khoảng thời gian)` : ''}
          </Typography>
          {records.length > 0 && <TableContainer sx={{ mt: 1, maxHeight: 420 }}>
            <Table size="small" stickyHeader aria-label={`Bản ghi của ${detail.name}`}>
              <TableHead><TableRow><TableCell>Thời điểm</TableCell><TableCell align="right">Giá trị</TableCell></TableRow></TableHead>
              <TableBody>
                {records.map((item) => {
                  const alarm = (bounds.min != null && item.value < bounds.min) || (bounds.max != null && item.value > bounds.max)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{dateTime(item.recordedAt, true)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: alarm ? 'error.main' : 'text.primary' }}>{formatValue(item.value, detail.unit)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>}
        </CardContent>
      </Card>}
    </>
  )
}
