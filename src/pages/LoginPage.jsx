import { useState } from 'react'
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setMessage('Đăng nhập chưa khả dụng.')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(460px, 0.95fr)' } }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: { md: 5, xl: 7 }, background: 'linear-gradient(145deg, #E8F1FB, #F7FAFD 72%)', borderRight: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
          <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#FFFFFF', borderRadius: 2.5 }}><AcUnitOutlinedIcon /></Box>
          <Box><Typography sx={{ fontWeight: 800, letterSpacing: '-0.025em' }}>KHO TƯƠI</Typography><Typography variant="caption" color="text.secondary">Giám sát bảo quản</Typography></Box>
        </Box>
        <Box sx={{ maxWidth: 550, mb: 6 }}>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 2 }}>QUẢN LÝ KHO BẢO QUẢN</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.1, mt: 2, mb: 3 }}>Nắm rõ điều kiện bảo quản ở từng phòng.</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.7 }}>Theo dõi số đo thiết bị, nhận biết điều kiện ngoài ngưỡng và xem lịch sử trên cùng một giao diện.</Typography>
          <Stack spacing={1.6} sx={{ mt: 5 }}>
            {['Theo dõi theo phòng kho', 'Nhận biết số đo ngoài ngưỡng', 'Xem lịch sử cảm biến'].map((item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} /><Typography>{item}</Typography></Box>
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary">Kho Tươi · Ứng dụng quản lý thiết bị bảo quản thực phẩm tươi sống</Typography>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2, sm: 4 }, minHeight: '100vh' }}>
        <Box sx={{ width: '100%', maxWidth: 470 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.2, mb: 5 }}><AcUnitOutlinedIcon color="primary" /><Typography sx={{ fontWeight: 800 }}>KHO TƯƠI</Typography></Box>
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
              <Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', bgcolor: '#E3EEFA', color: 'primary.main', borderRadius: 2, mb: 3 }}><LockOutlinedIcon /></Box>
              <Typography variant="h4" sx={{ fontSize: 31 }}>Đăng nhập</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Sử dụng tài khoản được cấp để truy cập hệ thống.</Typography>
              {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.3}>
                  <TextField label="Số điện thoại" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="username" required fullWidth inputProps={{ inputMode: 'tel' }} />
                  <TextField
                    label="Mật khẩu"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((current) => !current)} edge="end">{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }}
                  />
                  <Button type="submit" variant="contained" fullWidth size="large">Đăng nhập</Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
