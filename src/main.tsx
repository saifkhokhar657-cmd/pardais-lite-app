import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Pardais Lite UI error', error, info); }
  render() {
    if (this.state.error) return (
      <main style={{ minHeight: '100vh', background: '#030019', color: '#fff', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <h1>Pardais Lite</h1>
          <p style={{ color: '#b7b0c0', lineHeight: 1.5 }}>The app could not load this screen.</p>
          <button style={{ marginTop: 16, border: 0, borderRadius: 14, padding: '12px 22px', background: '#e34bd2', color: '#fff', fontWeight: 700 }} onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
