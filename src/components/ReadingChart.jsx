import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const COLORS = { line: '#1565C0', fill: '#1565C0', limit: '#B26A00', band: '#2E7D32', grid: '#DDE6EF', text: '#55697E', alarm: '#C62828' }
const WIDTH = 640
const HEIGHT = 250
const PAD = { left: 52, right: 16, top: 30, bottom: 34 }

function timeLabel(value, withDate) {
  const options = withDate
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' }
  return new Intl.DateTimeFormat('vi-VN', options).format(new Date(value))
}

function fullTime(value) {
  const date = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

function valueText(value, unit) {
  return `${value.toFixed(Math.abs(value) >= 100 ? 0 : 1)} ${unit}`
}

function outOfRange(value, min, max) {
  return (Number.isFinite(min) && value < min) || (Number.isFinite(max) && value > max)
}

// Nhãn chữ có nền trắng, tự lật sang trái khi gần mép phải.
function Label({ x, y, lines, color }) {
  const w = Math.max(...lines.map((line) => line.text.length)) * 7.4 + 16
  const h = lines.length * 17 + 8
  const left = x + w + 12 > WIDTH - PAD.right ? x - w - 10 : x + 10
  const topY = Math.min(Math.max(y - h - 6, 2), HEIGHT - PAD.bottom - h)
  return (
    <g pointerEvents="none">
      <rect x={left} y={topY} width={w} height={h} rx="6" fill="#FFFFFF" stroke={color} strokeOpacity="0.5" />
      {lines.map((line, index) => (
        <text key={index} x={left + 8} y={topY + 17 + index * 17} fontSize="13" fontWeight={line.bold ? 700 : 400} fill={line.bold ? color : COLORS.text}>{line.text}</text>
      ))}
    </g>
  )
}

// Biểu đồ một đại lượng theo thời gian: nhãn giá trị mới nhất ở điểm cuối;
// rê chuột để xem giá trị tại từng thời điểm, bấm để ghim điểm đang chọn.
export default function ReadingChart({ readings, min, max, unit, label, height: boxHeight = 248 }) {
  const [active, setActive] = useState(null)
  const [pinned, setPinned] = useState(false)

  const points = readings
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))

  if (points.length === 0) {
    return (
      <Box sx={{ height: boxHeight, display: 'grid', placeItems: 'center', color: 'text.secondary', bgcolor: '#F7FAFD', borderRadius: 2 }}>
        <Typography>Chưa có bản ghi để vẽ biểu đồ.</Typography>
      </Box>
    )
  }

  const hasMin = Number.isFinite(min)
  const hasMax = Number.isFinite(max)
  const bounds = [...(hasMin ? [min] : []), ...(hasMax ? [max] : [])]
  const values = points.map((point) => point.value)
  const low = Math.min(...values, ...bounds)
  const high = Math.max(...values, ...bounds)
  const pad = Math.max((high - low) * 0.1, 0.5)
  const lower = low - pad
  const upper = high + pad
  const range = Math.max(upper - lower, 1e-6)
  const t0 = Date.parse(points[0].recordedAt)
  const t1 = Date.parse(points.at(-1).recordedAt)
  const x = (time) => PAD.left + (t1 === t0 ? 0.5 : (time - t0) / (t1 - t0)) * (WIDTH - PAD.left - PAD.right)
  const y = (value) => PAD.top + ((upper - value) / range) * (HEIGHT - PAD.top - PAD.bottom)
  const coords = points.map((point) => [x(Date.parse(point.recordedAt)), y(point.value)])
  const line = coords.map(([px, py], index) => `${index === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')
  const area = `${line} L ${coords.at(-1)[0].toFixed(1)} ${HEIGHT - PAD.bottom} L ${coords[0][0].toFixed(1)} ${HEIGHT - PAD.bottom} Z`
  const gridValues = [lower, (lower + upper) / 2, upper]
  const withDate = t1 - t0 > 20 * 60 * 60 * 1000
  const digits = range < 10 ? 1 : 0
  const gradientId = `fill-${label.replace(/\W+/g, '')}-${points.length}`
  const lastIndex = points.length - 1
  // Lưu điểm đang chọn theo thời điểm để không lệch khi có điểm mới nối vào.
  const found = active == null ? -1 : points.findIndex((point) => point.recordedAt === active)
  const selected = found >= 0 ? found : null
  const last = points[lastIndex]

  // Điểm gần nhất theo trục thời gian với vị trí con trỏ (tọa độ viewBox).
  function nearest(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const vx = ((event.clientX - rect.left) / rect.width) * WIDTH
    let best = 0
    coords.forEach(([px], index) => { if (Math.abs(px - vx) < Math.abs(coords[best][0] - vx)) best = index })
    return best
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Biểu đồ ${label.toLowerCase()} gồm ${points.length} bản ghi, mới nhất ${valueText(last.value, unit)} lúc ${fullTime(last.recordedAt)}${bounds.length ? `. Ngưỡng ${hasMin ? min : '…'} đến ${hasMax ? max : '…'} ${unit}` : ''}.`}
        onPointerMove={(event) => { if (!pinned) setActive(points[nearest(event)].recordedAt) }}
        onPointerLeave={() => { if (!pinned) setActive(null) }}
        onClick={(event) => {
          const index = nearest(event)
          if (pinned && index === selected) { setPinned(false); setActive(null) } else { setActive(points[index].recordedAt); setPinned(true) }
        }}
        sx={{ width: '100%', minWidth: 560, height: 'auto', display: 'block', cursor: 'crosshair', touchAction: 'pan-y' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={COLORS.fill} stopOpacity="0.16" />
            <stop offset="100%" stopColor={COLORS.fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} stroke={COLORS.grid} strokeDasharray="4 5" />
            <text x={PAD.left - 8} y={y(value) + 4} fill={COLORS.text} textAnchor="end" fontSize="13">{value.toFixed(digits)}</text>
          </g>
        ))}
        {hasMin && hasMax && min < max && (
          <rect x={PAD.left} y={y(max)} width={WIDTH - PAD.left - PAD.right} height={Math.max(1, y(min) - y(max))} fill={COLORS.band} opacity="0.06" />
        )}
        {hasMax && <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(max)} y2={y(max)} stroke={COLORS.limit} strokeDasharray="7 5" />}
        {hasMin && <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(min)} y2={y(min)} stroke={COLORS.limit} strokeDasharray="7 5" />}
        {points.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
        {points.length > 1 && <path d={line} fill="none" stroke={COLORS.line} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
        <text x={PAD.left} y={HEIGHT - 8} fill={COLORS.text} fontSize="13">{timeLabel(points[0].recordedAt, withDate)}</text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} fill={COLORS.text} textAnchor="end" fontSize="13">{timeLabel(last.recordedAt, withDate)}</text>

        {/* Điểm mới nhất và nhãn giá trị hiện tại */}
        <circle cx={coords[lastIndex][0]} cy={coords[lastIndex][1]} r="5" fill={outOfRange(last.value, min, max) ? COLORS.alarm : COLORS.line} stroke="#FFFFFF" strokeWidth="2" />
        {selected == null && (
          <Label x={coords[lastIndex][0]} y={coords[lastIndex][1]} color={outOfRange(last.value, min, max) ? COLORS.alarm : COLORS.line} lines={[{ text: valueText(last.value, unit), bold: true }]} />
        )}

        {/* Điểm đang chọn: đường dóng, chấm và nhãn giá trị kèm thời điểm */}
        {selected != null && (() => {
          const [sx, sy] = coords[selected]
          const point = points[selected]
          const color = outOfRange(point.value, min, max) ? COLORS.alarm : COLORS.line
          return (
            <g pointerEvents="none">
              <line x1={sx} x2={sx} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke={color} strokeOpacity="0.45" />
              <circle cx={sx} cy={sy} r={pinned ? 6 : 5} fill="#FFFFFF" stroke={color} strokeWidth="2.5" />
              <Label x={sx} y={sy} color={color} lines={[{ text: valueText(point.value, unit), bold: true }, { text: fullTime(point.recordedAt) }]} />
            </g>
          )
        })()}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
        <Typography variant="body2" sx={{ color: COLORS.line }}>━ {label} ({unit})</Typography>
        {bounds.length > 0 && <Typography variant="body2" sx={{ color: COLORS.limit }}>┄ Ngưỡng {hasMin ? min : '…'} – {hasMax ? max : '…'} {unit}</Typography>}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {pinned ? 'Đang ghim một điểm · bấm lại để bỏ ghim' : 'Rê chuột để xem giá trị · bấm để ghim'}
        </Typography>
      </Box>
    </Box>
  )
}
