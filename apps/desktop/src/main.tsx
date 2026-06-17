import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (import.meta.env.DEV && typeof window !== 'undefined' && !window.electronAPI) {
  console.log('No native electronAPI detected. Injecting browser-to-express IPC mock...');
  window.electronAPI = {
    invoke: async (channel: string, ...args: any[]) => {
      const response = await fetch('http://localhost:47615/api/dev/ipc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, args }),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'IPC call failed');
      }
      return response.json();
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
      console.log(`Subscribed to event: ${channel} (mocked)`);
      return () => {};
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
