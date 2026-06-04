import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EditorPage from './pages/EditorPage'
import { theme } from './styles/theme'
import { AppToastHost } from './components/ui/AppToastHost'

function App() {
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