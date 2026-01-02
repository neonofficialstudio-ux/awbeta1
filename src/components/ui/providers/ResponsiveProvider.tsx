
import React, { createContext, useContext } from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  device: string;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const responsive = useResponsive();

  return (
    <ResponsiveContext.Provider value={responsive}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useGlobalResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useGlobalResponsive must be used within a ResponsiveProvider');
  }
  return context;
};
