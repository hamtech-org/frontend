import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { store } from '@/store/store';
import { SocketProvider } from '@/contexts/SocketContext';
import { TooltipProvider } from '@/components/ui';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/index.css';

import { initializeAmplify } from '@/config/amplify';

initializeAmplify();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TooltipProvider>
          <SocketProvider>
            <App />
            <ToastContainer position="top-right" autoClose={3000} />
          </SocketProvider>
        </TooltipProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
