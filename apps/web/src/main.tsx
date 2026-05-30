import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OpenFeature } from '@openfeature/web-sdk'
import './index.css'
import { createFlagProvider } from '@/lib/flags'
import './i18n'
import { App } from './app'

OpenFeature.setProvider(createFlagProvider())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
