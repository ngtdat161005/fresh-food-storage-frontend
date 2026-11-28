import { useEffect, useState } from 'react'
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SensorIcon from './SensorIcon.jsx'
import { fetchRoomDevices } from '../services/storageApi.js'
import { deviceStatus } from '../utils/format.js'
import { shell } from '../theme.js'

// Cảm biến trước, thiết bị điều khiển sau; trong mỗi nhóm giữ thứ tự backend trả về.
function sortDevices(devices) {
  return [...devices].sort((a, b) => Number(Boolean(b.isSensor)) - Number(Boolean(a.isSensor)))
}

function DeviceItem({ device, selected, onClick }) {
  const status = deviceStatus(device)
  return (
    <Button
      fullWidth
      onClick={onClick}
      sx={{
        minHeight: 34, py: 0.5, pl: 4.5, pr: 1, justifyContent: 'flex-start', gap: 1, fontWeight: selected ? 700 : 500,
        color: selected ? 'primary.main' : 'text.secondary', bgcolor: selected ? shell.selected : 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', color: 'inherit' }}><SensorIcon kind={device.kind} unit={device.unit} /></Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.name}</Box>
      <Box title={status.label} sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: status.dot }} />
    </Button>
  )
}

export default function Sidebar({
  rooms, selectedRoomId, selectedDeviceId, alertRoomIds, currentDevices, currentDevicesError,
  apiMode, baseUrl, onSelectRoom, onSelectDevice,
}) {
  const [expanded, setExpanded] = useState(() => new Set(selectedRoomId ? [selectedRoomId] : []))
  const [lists, setLists] = useState({})

  // Phòng đang xem luôn được mở danh sách thiết bị.
  useEffect(() => {
    if (!selectedRoomId) return
    setExpanded((current) => current.has(selectedRoomId) ? current : new Set(current).add(selectedRoomId))
  }, [selectedRoomId])

  // Phòng khác chỉ tải danh sách thiết bị khi được mở ra (GET /storage-rooms/{id}/devices).
  function loadDevices(roomId) {
    setLists((current) => ({ ...current, [roomId]: { devices: [], loading: true, error: '' } }))
    fetchRoomDevices(baseUrl, roomId)
      .then((devices) => setLists((current) => ({ ...current, [roomId]: { devices, loading: false, error: '' } })))
      .catch((error) => setLists((current) => ({ ...current, [roomId]: { devices: [], loading: false, error: error.message } })))
  }

  function toggle(roomId) {
    const opening = !expanded.has(roomId)
    setExpanded((current) => {
      const next = new Set(current)
      if (opening) next.add(roomId)
      else next.delete(roomId)
      return next
    })
  }

  // Tải thiết bị cho các phòng đang mở mà chưa có danh sách (trừ phòng đang xem, đã có từ dashboard).
  useEffect(() => {
    if (!apiMode) return
    expanded.forEach((roomId) => {
      if (roomId !== selectedRoomId && !lists[roomId]) loadDevices(roomId)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode, expanded, selectedRoomId])

  function devicesOf(room) {
    if (!apiMode) return { devices: room.devices ?? [], loading: false, error: '' }
    if (room.id === selectedRoomId) return { devices: currentDevices, loading: false, error: currentDevicesError }
    return lists[room.id] ?? { devices: [], loading: true, error: '' }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 1.5, py: 2.5, bgcolor: shell.sidebar, overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3, px: 1, mb: 4 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#FFFFFF' }}>
          <AcUnitOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>KHO TƯƠI</Typography>
          <Typography variant="caption" color="text.secondary">Giám sát bảo quản</Typography>
        </Box>
      </Box>

      <Typography variant="overline" color="text.secondary" sx={{ px: 1, mb: 0.5, letterSpacing: 1.5 }}>PHÒNG BẢO QUẢN</Typography>
      <Stack spacing={0.5}>
        {rooms.map((room) => {
          const isOpen = expanded.has(room.id)
          const roomSelected = room.id === selectedRoomId && !selectedDeviceId
          const { devices, loading, error } = devicesOf(room)
          return (
            <Box key={room.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', borderRadius: 2.5, bgcolor: roomSelected ? shell.selected : 'transparent' }}>
                <Button
                  fullWidth
                  onClick={() => onSelectRoom(room.id)}
                  sx={{ px: 1.2, justifyContent: 'flex-start', textAlign: 'left', gap: 1.1, color: room.id === selectedRoomId ? 'text.primary' : 'text.secondary' }}
                >
                  <Box sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: alertRoomIds.has(room.id) ? 'error.main' : room.id === selectedRoomId ? 'primary.main' : '#8FA6BD' }} />
                  <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{room.name}</Box>
                </Button>
                <IconButton size="small" aria-label={isOpen ? `Thu gọn thiết bị ${room.name}` : `Mở danh sách thiết bị ${room.name}`} onClick={() => toggle(room.id)} sx={{ mr: 0.5 }}>
                  {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <Stack spacing={0.25} sx={{ py: 0.5 }}>
                  {loading && <Box sx={{ pl: 4.5, py: 0.8 }}><CircularProgress size={16} /></Box>}
                  {!loading && error && <Typography variant="body2" color="error.main" sx={{ pl: 4.5, py: 0.5 }}>Không tải được thiết bị.</Typography>}
                  {!loading && !error && devices.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ pl: 4.5, py: 0.5 }}>Chưa có thiết bị.</Typography>}
                  {sortDevices(devices).map((device) => (
                    <DeviceItem
                      key={device.id}
                      device={device}
                      selected={room.id === selectedRoomId && device.id === selectedDeviceId}
                      onClick={() => onSelectDevice(room.id, device.id)}
                    />
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
