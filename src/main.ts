import {createElement} from 'react'
import {createRoot} from 'react-dom/client'
import '@/style.css'
import App from '@/App'
import {initializeTheme} from '@/utils/theme'

initializeTheme()
createRoot(document.getElementById('app')!).render(createElement(App))
