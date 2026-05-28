import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { store } from '@/store/store';
import { SocketProvider } from '@/contexts/SocketContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TooltipProvider } from '@/components/ui';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/index.css';

import { initializeAmplify } from '@/config/amplify';

initializeAmplify();

if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    console.warn('[unhandledrejection]', reason);
  });
  window.addEventListener('error', (event) => {
    console.warn('[window.error]', event.error ?? event.message);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter>
      <TooltipProvider>
        <ThemeProvider>
          <SocketProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </SocketProvider>
        </ThemeProvider>
      </TooltipProvider>
    </BrowserRouter>
  </Provider>,
);
