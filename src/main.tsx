import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global safety error logger for browser debug
window.addEventListener('error', (e) => {
  console.warn('Yassa Tube Global caught error:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.warn('Yassa Tube Unhandled rejection:', e.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
