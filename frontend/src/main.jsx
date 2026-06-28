import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

async function start() {
  // perform a quick dev-only backend health check so developers see connectivity issues early
  if (import.meta.env.DEV) {
    try {
      await checkBackendHealth(1500);
    } catch {
      // health check handles UI + logging
    }
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

start();
