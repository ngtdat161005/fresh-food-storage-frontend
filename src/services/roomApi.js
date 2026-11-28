import { authHeaders } from './devAuth.js'

// Backend trả { ..., start, end, thiet_bi: [{ ma_thiet_bi, ten_thiet_bi, don_vi_do, nguong, ban_ghi: [...] }] }.
// Trải phẳng thành một danh sách số đo; mỗi số đo mang thông tin cảm biến của nó.
function flattenSensors(payload) {
  if (!Array.isArray(payload?.thiet_bi)) return null
  return payload.thiet_bi.flatMap((sensor) => (sensor.ban_ghi ?? []).map((record) => ({
    ma_thiet_bi: sensor.ma_thiet_bi,
    ten_thiet_bi: sensor.ten_thiet_bi,
    don_vi_do: sensor.don_vi_do,
    ...record,
  })))
}

function findArray(payload) {
  const flat = flattenSensors(payload)
  if (flat) return flat
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  for (const key of ['readings', 'items', 'results', 'data']) {
    if (Array.isArray(payload[key])) return payload[key]
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = findArray(payload[key])
      if (nested.length) return nested
    }
  }
  return []
}

// Phân loại đại lượng theo đơn vị đo và tên. Đại lượng khác (ví dụ áp suất) là 'other'.
export function readingKind(unit = '', text = '') {
  const sample = `${unit} ${text}`
  if (/humidity|độ ẩm|do[_ -]?am|humid/i.test(sample) || unit.includes('%')) return 'humidity'
  if (!unit || /°c|temperature|nhiệt độ|nhiet[_ -]?do/i.test(sample)) return 'temperature'
  return 'other'
}

export function normalizeReading(raw) {
  if (!raw || typeof raw !== 'object') return null
  const value = Number(raw.value ?? raw.gia_tri ?? raw.thong_so ?? raw.gia_tri_thong_so)
  const recordedAt = raw.recordedAt ?? raw.thoi_gian_ghi ?? raw.timestamp ?? raw.created_at
  if (!Number.isFinite(value) || !recordedAt || Number.isNaN(Date.parse(recordedAt))) return null

  const unit = String(raw.unit ?? raw.don_vi_do ?? '')
  const deviceName = String(raw.deviceName ?? raw.ten_thiet_bi ?? '')
  const metric = String(raw.kind ?? raw.metric ?? raw.sensorType ?? raw.loai_cam_bien ?? raw.ten_thong_so ?? '')
  const kind = readingKind(unit, `${metric} ${deviceName}`)
  const deviceId = String(raw.deviceId ?? raw.device_id ?? raw.ma_thiet_bi ?? '—')

  return {
    // Cùng một điểm có thể đến từ REST ("+00:00") và WebSocket ("...000Z"): so theo mốc thời gian.
    id: String(raw.id ?? raw.ma_ban_ghi ?? `${Date.parse(recordedAt)}-${deviceId}`),
    deviceId,
    deviceName: deviceName || (kind === 'humidity' ? 'Cảm biến độ ẩm' : 'Cảm biến nhiệt độ'),
    kind,
    value,
    unit: unit || (kind === 'humidity' ? '%' : '°C'),
    recordedAt,
  }
}

export function normalizeReadings(payload) {
  return findArray(payload)
    .map(normalizeReading)
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
}

// Thông tin từng cảm biến, dùng để gắn đơn vị cho điểm WebSocket và lấy ngưỡng hiển thị.
export function sensorInfo(payload) {
  return (payload?.thiet_bi ?? []).map((sensor) => ({
    deviceId: String(sensor.ma_thiet_bi),
    deviceName: sensor.ten_thiet_bi ?? '',
    unit: sensor.don_vi_do ?? '',
    limits: sensor.nguong ?? [],
  }))
}

// Backend luôn trả 24 giờ gần nhất; tham số start được bỏ qua và trùng lặp được gộp ở hook.
export async function fetchRoomReadings({ baseUrl, roomId }, signal, start) {
  const query = start ? `?start=${encodeURIComponent(start)}` : ''
  const url = `${baseUrl.replace(/\/+$/, '')}/storage-rooms/${encodeURIComponent(roomId)}/readings${query}`
  const headers = { Accept: 'application/json', ...authHeaders() }

  const response = await fetch(url, { headers, signal })
  if (!response.ok) {
    throw new Error(`API trả về HTTP ${response.status}. Kiểm tra mã phòng, quyền truy cập và cấu hình CORS.`)
  }
  const payload = await response.json()
  const room = { location: payload?.vi_tri_phong_kho ?? null, description: payload?.thong_tin_phong_kho ?? null }
  return { readings: normalizeReadings(payload), sensors: sensorInfo(payload), room }
}
