import { createContext, useContext, useState } from 'react';
import { getCurrentMonth } from './utils.js';

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(getCurrentMonth);
  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
