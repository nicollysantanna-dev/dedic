import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { listenForInstallPrompt } from '@/features/install/install-prompt'
import '@/styles/globals.css'

// O convite de instalação pode chegar antes da tela inicial carregar.
listenForInstallPrompt()

const root = document.getElementById('root')

if (!root) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
