import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator && import.meta.env.PROD) registerSW({ immediate: true });

// best-effort portrait lock (works in installed PWAs on Android; iOS relies on the manifest + CSS overlay)
try {
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  o?.lock?.('portrait').catch(() => {});
} catch {
  /* unsupported */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
