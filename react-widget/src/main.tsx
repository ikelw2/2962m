import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import { Widget } from './Widget'
// import App from './App'


const rootElement = document.getElementById('react-widget')

if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <Widget />
    </StrictMode>
  )
} else {
  console.error("Could not find the #react-widget element in index.html")
}