import { useState, useCallback, createContext, useContext } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type='info', dur=3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, {id, msg, type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), dur + 350);
  }, []);
  return { toasts, push };
}

export const ToastContext = createContext(null);
export const useToastContext = () => useContext(ToastContext);
