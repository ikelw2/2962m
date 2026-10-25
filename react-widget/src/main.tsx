import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';

const rootElement = document.getElementById('react-widget');

if (!rootElement) throw new Error('Could not find #react-widget in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <Widget />
  </StrictMode>,
);