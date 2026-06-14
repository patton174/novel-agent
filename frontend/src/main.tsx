import './i18n'
import { installRandomUUIDPolyfill } from './utils/randomUUID'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/agent-ui.css'
import { prefetchRouteShells } from './components/loading/prefetchRouteShells'

installRandomUUIDPolyfill()
prefetchRouteShells()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)