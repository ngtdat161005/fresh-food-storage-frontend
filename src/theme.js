import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#64D9C0' },
    secondary: { main: '#91A8C3' },
    background: { default: '#0B1524', paper: '#132235' },
    text: { primary: '#F4F8FC', secondary: '#A9BDCF' },
    success: { main: '#64D9C0' },
    warning: { main: '#F6C66B' },
    error: { main: '#FF8F89' },
    divider: 'rgba(192, 215, 233, 0.13)',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 750, letterSpacing: '-0.035em' },
    h5: { fontWeight: 740, letterSpacing: '-0.025em' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 42 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(192, 215, 233, 0.13)',
          backgroundImage: 'none',
          boxShadow: '0 18px 48px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: 320 },
        '*:focus-visible': { outline: '2px solid #89E7D3', outlineOffset: 3 },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { scrollBehavior: 'auto !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
  },
})

export default theme
