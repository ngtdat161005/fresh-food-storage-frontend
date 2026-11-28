import { authHeaders } from './devAuth.js'

// rooms, devices: đã khớp backend (/api/storage-rooms...).
// alerts, command: backend chưa có (nhiệm vụ cảnh báo và nhiệm vụ 10), hiện trả 404.
const paths = {
  rooms: '/storage-rooms',
  devices: (roomId) => `/storage-rooms/${encodeURIComponent(roomId)}/devices`,
  alerts: (roomId) => `/storage-rooms/${encodeURIComponent(roomId)}/alerts?status=open`,
  command: (deviceId) => `/devices/${encodeURIComponent(deviceId)}/commands`,
}

function unwrapArray(payload, keys) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') throw new Error('Dữ liệu trả về không hợp lệ.')
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key]
    if (payload[key] && typeof payload[key] === 'object') {
      try { return unwrapArray(payload[key], keys) } catch { /* thử trường tiếp theo */ }
    }
  }
  throw new Error('Danh sách trả về không đúng định dạng.')
}

function optionalNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...options.headers },
  })
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}).`)
  if (response.status === 204) return null
  const body = await response.text()
  if (!body) return null
  try { return JSON.parse(body) } catch { return { status: body } }
}

export function normalizeRoom(raw) {
  const limits = raw.thresholds ?? raw.limits ?? {}
  const temperature = limits.temperature ?? {}
  const humidity = limits.humidity ?? {}
  return {
    id: String(raw.id ?? raw.roomId ?? raw.ma_phong_kho ?? raw.ma_phong),
    name: raw.name ?? raw.ten_phong_kho ?? raw.ten_phong ?? 'Phòng kho',
    warehouse: raw.warehouseName ?? raw.ten_nha_kho ?? (typeof raw.warehouse === 'string' ? raw.warehouse : raw.warehouse?.name) ?? 'Nhà kho',
    product: raw.product ?? raw.loai_thuc_pham ?? 'Thực phẩm tươi sống',
    minTemp: optionalNumber(raw.minTemp ?? temperature.min),
    maxTemp: optionalNumber(raw.maxTemp ?? temperature.max),
    minHumidity: optionalNumber(raw.minHumidity ?? humidity.min),
    maxHumidity: optionalNumber(raw.maxHumidity ?? humidity.max),
    deviceCount: optionalNumber(raw.deviceCount ?? raw.so_luong_thiet_bi),
    activeDeviceCount: optionalNumber(raw.activeDeviceCount ?? raw.so_luong_thiet_bi_dang_hoat_dong),
  }
}

export function normalizeDevice(raw) {
  const kindText = String(raw.kind ?? raw.type ?? raw.ten_phan_loai ?? raw.ten_loai_thiet_bi ?? raw.deviceType ?? raw.name ?? raw.ten_thiet_bi ?? '')
  const kind = /quạt|fan/i.test(kindText) ? 'fan' : /máy nén|compressor/i.test(kindText) ? 'compressor' : 'other'
  const status = String(raw.status ?? raw.trang_thai_hoat_dong ?? '').toUpperCase()
  const online = raw.online === true || ['ONLINE', 'HOAT_DONG', 'ACTIVE'].includes(status)
  const rawPower = raw.powerState ?? raw.power_state ?? raw.trang_thai_bat_tat ?? raw.isOn
  const powerText = String(rawPower).toUpperCase()
  const powerState = rawPower === true || ['ON', 'BAT', 'BẬT'].includes(powerText) ? 'on'
    : rawPower === false || ['OFF', 'TAT', 'TẮT'].includes(powerText) ? 'off' : 'unknown'
  const unit = raw.unit ?? raw.don_vi_do ?? null
  return {
    id: String(raw.id ?? raw.deviceId ?? raw.ma_thiet_bi),
    name: raw.name ?? raw.ten_thiet_bi ?? 'Thiết bị',
    kind,
    type: raw.type ?? raw.ten_phan_loai ?? null,
    unit,
    // Backend: có đơn vị đo là cảm biến, không có là thiết bị điều khiển.
    isSensor: unit != null && unit !== '',
    status: status || null,
    online,
    powerState,
    controllable: raw.controllable ?? raw.co_the_dieu_khien ?? (kind === 'fan' || kind === 'compressor'),
  }
}

export function normalizeAlert(raw) {
  const status = String(raw.status ?? raw.trang_thai_xu_ly ?? '').toUpperCase()
  if (['CLOSED', 'RESOLVED', 'DA_XU_LY', 'ĐÃ_XỬ_LÝ'].includes(status)) return null
  return {
    id: String(raw.id ?? raw.alertId ?? raw.ma_canh_bao),
    message: raw.message ?? raw.noi_dung ?? raw.mo_ta ?? 'Có cảnh báo cần kiểm tra trong phòng.',
    severity: raw.severity ?? raw.muc_do ?? 'warning',
    createdAt: raw.createdAt ?? raw.thoi_gian_phat ?? null,
  }
}

export async function fetchRooms(baseUrl, signal) {
  const payload = await requestJson(baseUrl, paths.rooms, { signal })
  return unwrapArray(payload, ['rooms', 'items', 'data', 'results'])
    .map(normalizeRoom)
    .filter((room) => room.id !== 'undefined')
}

export async function fetchRoomDevices(baseUrl, roomId, signal) {
  const payload = await requestJson(baseUrl, paths.devices(roomId), { signal })
  return unwrapArray(payload, ['devices', 'items', 'data', 'results'])
    .map(normalizeDevice)
    .filter((device) => device.id !== 'undefined')
}

export async function fetchRoomAlerts(baseUrl, roomId, signal) {
  const payload = await requestJson(baseUrl, paths.alerts(roomId), { signal })
  return unwrapArray(payload, ['alerts', 'items', 'data', 'results'])
    .map(normalizeAlert)
    .filter(Boolean)
}

export async function sendDeviceCommand(baseUrl, deviceId, command) {
  return requestJson(baseUrl, paths.command(deviceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
}
