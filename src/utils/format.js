// Backend trả thời gian UTC; hiển thị theo giờ Việt Nam.
export function dateTime(value, withSeconds = false) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Chưa có dữ liệu'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    ...(withSeconds && { second: '2-digit' }),
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

export function formatValue(value, unit) {
  if (!Number.isFinite(value)) return '—'
  const digits = Math.abs(value) >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${unit ?? ''}`.trim()
}

export function limitText(min, max, unit) {
  const hasMin = Number.isFinite(min)
  const hasMax = Number.isFinite(max)
  if (hasMin && hasMax) return `${min} – ${max} ${unit}`
  if (hasMax) return `≤ ${max} ${unit}`
  if (hasMin) return `≥ ${min} ${unit}`
  return 'Chưa có ngưỡng'
}

// Trạng thái hoạt động của thiết bị (cột trang_thai_hoat_dong).
const STATUS = {
  HOAT_DONG: { label: 'Hoạt động', color: 'success', dot: '#2E7D32' },
  MAT_KET_NOI: { label: 'Mất kết nối', color: 'warning', dot: '#B26A00' },
  NGUNG_SU_DUNG: { label: 'Ngừng sử dụng', color: 'default', dot: '#8A9BAD' },
}

export function deviceStatus(device) {
  if (device?.status && STATUS[device.status]) return STATUS[device.status]
  return device?.online ? STATUS.HOAT_DONG : STATUS.MAT_KET_NOI
}

// Ngưỡng hiển thị: rule đầu tiên có ít nhất một cận.
export function ruleBounds(rules = []) {
  const rule = rules.find((item) => item.gioi_han_duoi != null || item.gioi_han_tren != null || item.min != null || item.max != null)
  if (!rule) return { min: null, max: null }
  const min = rule.gioi_han_duoi ?? rule.min
  const max = rule.gioi_han_tren ?? rule.max
  return { min: min == null ? null : Number(min), max: max == null ? null : Number(max) }
}
