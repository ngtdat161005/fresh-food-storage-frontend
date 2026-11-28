import { createTheme } from '@mui/material/styles'

// Nền trang trắng; header và thanh bên dùng xanh nhạt (shell) để tách khỏi vùng nội dung.
export const shell = {
  sidebar: '#b5d6fc',
  header: '#F1F7FD',
  border: '#D3E2F1',
  selected: '#fafafa',
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2681e9' },
    secondary: { main: '#5B7A99' },
    background: { default: '#7ca9fe', paper: '#FFFFFF' },
    text: { primary: '#10263D', secondary: '#55697E' },
    success: { main: '#2E7D32' },
    warning: { main: '#B26A00' },
    error: { main: '#C62828' },
    divider: '#c0ddfb',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 750, letterSpacing: '-0.03em' },
    h5: { fontWeight: 740, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 40 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #DDE6EF',
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(16, 38, 61, 0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#55697E' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: 320 },
        '*:focus-visible': { outline: '2px solid #1565C0', outlineOffset: 3 },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { scrollBehavior: 'auto !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
  },
})

export default theme
