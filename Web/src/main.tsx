import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import './index.css';
import App from './App.tsx';

if (Capacitor.isNativePlatform()) {
  void StatusBar.hide().catch(() => {
    /* روی وب یا اگر پلاگین در دسترس نباشد نادیده گرفته می‌شود */
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
