import React, { createContext, useContext } from 'react';
import { useCliente } from '../hooks/useCliente';

type ClientContextType = ReturnType<typeof useCliente>;

const ClientContext = createContext<ClientContextType | null>(null);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientData = useCliente();

  return (
    <ClientContext.Provider value={clientData}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = (): ClientContextType => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext debe ser usado dentro de ClientProvider');
  }
  return context;
};
