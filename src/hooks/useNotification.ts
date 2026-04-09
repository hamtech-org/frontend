import { toast } from 'react-toastify';

interface NotificationOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
}

export const useNotification = () => {
  const notify = (message: string, options: NotificationOptions = {}): void => {
    const { type = 'info' } = options;
    toast[type](message);
  };

  return { notify };
};
