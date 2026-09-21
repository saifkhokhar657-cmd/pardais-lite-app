import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function BootScreen({ error }: { error?: string }) {
  return (
    <main className='pardais-splash' aria-label='Pardais Lite loading'>
      <div className='pardais-logo'>
        <svg viewBox='0 0 180 180' aria-hidden='true'>
          <defs>
            <linearGradient id='bootplg' x1='15%' y1='90%' x2='90%' y2='10%'>
              <stop offset='0' stopColor='#3677ff'/><stop offset='48%' stopColor='#8b4dff'/><stop offset='100%' stopColor='#ff43c8'/>
            </linearGradient>
            <filter id='bootplglow'><feGaussianBlur stdDeviation='6' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
          </defs>
          <path d='M43 142V35h58c29 0 47 16 47 40 0 25-18 41-47 41H67v26H43Zm24-48h32c15 0 24-7 24-19 0-12-9-19-24-19H67v38Z' fill='none' stroke='url(#bootplg)' strokeWidth='13' strokeLinejoin='round' filter='url(#bootplglow)'/>
          <path d='M104 88l49-27-18 31 17 6-25 4-16 18 6-18-19-7 18-2 8-20Z' fill='#fff' filter='url(#bootplglow)'/>
        </svg>
        <div className='pardais-logo-wordmark'><b>PARDAIS</b><span>LITE</span></div>
      </div>
      {!error ? <div className='splash-loading'><i/><i/><i/><i/><i/></div> : (
        <div style={{ position:'absolute', left:24, right:24, bottom:32, textAlign:'center', color:'#ffb8ee', fontSize:12, lineHeight:1.45 }}>
          App could not load. Please refresh.
          <button type='button' onClick={() => window.location.reload()} style={{ display:'block', margin:'10px auto 0', padding:'9px 18px', borderRadius:12, background:'#e34bd2', color:'#fff', fontWeight:700 }}>Refresh</button>
          <div style={{ marginTop:8, color:'#756b82', fontSize:9, wordBreak:'break-word' }}>{error}</div>
        </div>
      )}
    </main>
  );
}

async function loadFirebaseRuntimeConfig() {
  if ((window as any).__PARDAIS_FIREBASE_CONFIG__) return;
  const apiBase = 'https://api.pardaislite.soulverseapps.com';
  const response = await fetch(`${apiBase}/firebase-config.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Firebase runtime config request failed (${response.status})`);
  const config = await response.json();
  (window as any).__PARDAIS_FIREBASE_CONFIG__ = config;
}

function Bootstrap() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadFirebaseRuntimeConfig()
      .then(() => import('./App'))
      .then(mod => { if (active) setApp(() => mod.default); })
      .catch(err => {
        console.error('Pardais Lite bootstrap error', err);
        if (active) setError(String(err?.message || err || 'Unknown startup error'));
      });
    return () => { active = false; };
  }, []);

  if (error) return <BootScreen error={error} />;
  if (!App) return <BootScreen />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>
);
