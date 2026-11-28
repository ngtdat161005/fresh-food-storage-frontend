import { authHeaders } from './devAuth.js'
import { readingKind } from './roomApi.js'

async function getJson(baseUrl, path, signal) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
    signal,
  })
  if (!response.ok) {
    let detail = ''
    try { detail = (await response.json())?.detail ?? '' } catch { /* không có nội dung JSON */ }
    if (response.status === 404) throw new Error('Không tìm thấy thiết bị hoặc bạn không có quyền xem.')
    throw new Error(`Không tải được dữ liệu (${response.status}${typeof detail === 'string' && detail ? `: ${detail}` : ''}).`)
  }
  return response.json()
}

function optionalNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeRecord(raw) {
  const value = Number(raw?.gia_tri_thong_so ?? raw?.value)
  const recordedAt = raw?.thoi_gian_ghi ?? raw?.recordedAt
  if (!Number.isFinite(value) || !recordedAt || Number.isNaN(Date.parse(recordedAt))) return null
  return { id: String(Date.parse(recordedAt)), value, recordedAt }
}

// GET /api/devices/{id}: thông tin thiết bị, rule đang gán, bản ghi mới nhất (cảm biến).
export async function fetchDeviceDetail(baseUrl, deviceId, signal) {
  const raw = await getJson(baseUrl, `/devices/${encodeURIComponent(deviceId)}`, signal)
  const unit = raw.don_vi_do ?? null
  const label = `${raw.ten_phan_loai ?? ''} ${raw.ten_thiet_bi ?? ''}`
  const kind = unit ? readingKind(unit, label) : /quạt|fan/i.test(label) ? 'fan' : /máy nén|compressor/i.test(label) ? 'compressor' : 'other'
  return {
    id: String(raw.ma_thiet_bi),
    kind,
    name: raw.ten_thiet_bi ?? 'Thiết bị',
    type: raw.ten_phan_loai ?? null,
    unit,
    isSensor: unit != null && unit !== '',
    mac: raw.dia_chi_mac ?? null,
    feedKey: raw.feed_key ?? null,
    position: raw.vi_tri_trong_phong ?? null,
    status: raw.trang_thai_hoat_dong ?? null,
    battery: optionalNumber(raw.dung_luong_pin),
    lastSeen: raw.thoi_gian_hoat_dong_lan_cuoi ?? null,
    roomId: raw.ma_phong_kho != null ? String(raw.ma_phong_kho) : null,
    roomName: raw.ten_phong_kho ?? null,
    rules: (raw.thiet_lap_rule ?? []).map((rule) => ({
      id: String(rule.ma_rule),
      name: rule.ten_rule ?? '',
      action: rule.ma_xu_ly ?? '',
      min: optionalNumber(rule.gioi_han_duoi),
      max: optionalNumber(rule.gioi_han_tren),
    })),
    latest: normalizeRecord(raw.ban_ghi_moi_nhat),
  }
}

// GET /api/devices/{id}/readings?start&end&limit: bản ghi mới trước, cũ sau.
// start, end là đối tượng Date; gửi dạng ISO có hậu tố Z để tránh lỗi dấu + trong URL.
export async function fetchDeviceReadings(baseUrl, deviceId, { start, end, limit = 200 } = {}, signal) {
  const params = new URLSearchParams()
  if (start) params.set('start', start.toISOString())
  if (end) params.set('end', end.toISOString())
  params.set('limit', String(limit))
  const raw = await getJson(baseUrl, `/devices/${encodeURIComponent(deviceId)}/readings?${params}`, signal)
  return (raw.ban_ghi ?? []).map(normalizeRecord).filter(Boolean)
}
