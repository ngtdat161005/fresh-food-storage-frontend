import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function timeLabel(value) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export default function ReadingChart({ readings, min, max, unit, label }) {
  const points = readings.slice(-24)

  if (points.length === 0) {
    return (
      <Box sx={{ height: 248, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
        <Typography>Chưa có bản ghi để vẽ biểu đồ.</Typography>
      </Box>
    )
  }

  const width = 640
  const height = 240
  const left = 40
  const right = 12
  const top = 18
  const bottom = 34
  const values = points.map((point) => point.value)
  const hasLimits = Number.isFinite(min) && Number.isFinite(max) && min < max
  const lower = Math.floor(Math.min(...values, ...(hasLimits ? [min] : [])) - (unit === '%' ? 3 : 1))
  const upper = Math.ceil(Math.max(...values, ...(hasLimits ? [max] : [])) + (unit === '%' ? 3 : 1))
  const range = Math.max(1, upper - lower)
  const x = (index) => left + (index / Math.max(1, points.length - 1)) * (width - left - right)
  const y = (value) => top + ((upper - value) / range) * (height - top - bottom)
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.value)}`).join(' ')
  const area = `${line} L ${x(points.length - 1)} ${height - bottom} L ${x(0)} ${height - bottom} Z`
  const gridValues = [lower, lower + range / 2, upper]

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Biểu đồ ${label.toLowerCase()} gồm ${points.length} bản ghi, từ ${Math.min(...values)} đến ${Math.max(...values)} ${unit}${hasLimits ? `. Giới hạn tham chiếu ${min} đến ${max} ${unit}` : ''}.`}
        sx={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#64D9C0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#64D9C0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#304458" strokeDasharray="4 5" />
            <text x={left - 8} y={y(value) + 4} fill="#C7D5E1" textAnchor="end" fontSize="15">{value.toFixed(1)}</text>
          </g>
        ))}
        {hasLimits && <rect
          x={left}
          y={y(max)}
          width={width - left - right}
          height={Math.max(1, y(min) - y(max))}
          fill="#64D9C0"
          opacity="0.055"
        />}
        {hasLimits && <line x1={left} x2={width - right} y1={y(max)} y2={y(max)} stroke="#F6C66B" strokeDasharray="7 5" />}
        {hasLimits && <line x1={left} x2={width - right} y1={y(min)} y2={y(min)} stroke="#F6C66B" strokeDasharray="7 5" />}
        <path d={area} fill="url(#chartFill)" />
        <path d={line} fill="none" stroke="#64D9C0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(points.at(-1).value)} r="5" fill="#64D9C0" stroke="#132235" strokeWidth="2" />
        <text x={left} y={height - 8} fill="#C7D5E1" fontSize="15">{timeLabel(points[0].recordedAt)}</text>
        <text x={width - right} y={height - 8} fill="#C7D5E1" textAnchor="end" fontSize="15">{timeLabel(points.at(-1).recordedAt)}</text>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>━ {label} đo được</Typography>
        {hasLimits && <Typography variant="body2" sx={{ color: 'warning.main' }}>┄ Giới hạn tham chiếu</Typography>}
      </Box>
    </Box>
  )
}
