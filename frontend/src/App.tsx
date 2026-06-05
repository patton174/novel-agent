import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { ThemeProvider } from 'styled-components'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EditorPage from './pages/EditorPage'
import { theme } from './styles/theme'
import { AppToastHost } from './components/ui/AppToastHost'
import { migrateLegacyAuthStorage } from './utils/auth'
import { primeFingerprint } from './security/fingerprint'
import { ensureSessionAndHeartbeat } from './security/heartbeat'

function App() {
  useEffect(() => {
    migrateLegacyAuthStorage()
    primeFingerprint()
    void ensureSessionAndHeartbeat()
  }, [])

  return (
    <ThemeProvider theme={theme}>
    <AppToastHost />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/editor/:chapterId?" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  )
}

export default App