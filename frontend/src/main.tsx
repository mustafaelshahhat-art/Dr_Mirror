import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initSentry } from './shared/lib/sentry';
import './styles/globals.css';

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
