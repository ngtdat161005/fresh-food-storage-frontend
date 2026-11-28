import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined'
import AirOutlinedIcon from '@mui/icons-material/AirOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'

// Biểu tượng theo loại: nhiệt độ, độ ẩm, áp suất, quạt, máy nén, khác.
export default function SensorIcon({ kind, unit, fontSize = 'small' }) {
  if (kind === 'temperature' || unit === '°C') return <DeviceThermostatOutlinedIcon fontSize={fontSize} />
  if (kind === 'humidity' || unit === '%') return <WaterDropOutlinedIcon fontSize={fontSize} />
  if (/hpa|pa|bar/i.test(unit ?? '')) return <SpeedOutlinedIcon fontSize={fontSize} />
  if (kind === 'fan') return <AirOutlinedIcon fontSize={fontSize} />
  if (kind === 'compressor') return <AcUnitOutlinedIcon fontSize={fontSize} />
  return <SensorsOutlinedIcon fontSize={fontSize} />
}
