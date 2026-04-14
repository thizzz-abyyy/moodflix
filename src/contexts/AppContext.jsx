import React, { createContext, useContext, useState } from 'react';
import { loadUserData, saveUserData } from '../services/personalization';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [userData, setUserData] = useState(loadUserData);
  const [page, setPage] = useState('home');
  const [mood, setMood] = useState(null);
  
  const updateUserData = (newData) => {
    saveUserData(newData);
    setUserData(newData);
  };

  return (
    <AppContext.Provider value={{
      userData, updateUserData,
      page, setPage,
      mood, setMood
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
