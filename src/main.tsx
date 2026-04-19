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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter>
      <TooltipProvider>
        <ThemeProvider>
          <SocketProvider>
            <App />
            <ToastContainer position="top-right" autoClose={3000} />
          </SocketProvider>
        </ThemeProvider>
      </TooltipProvider>
    </BrowserRouter>
  </Provider>,
);
