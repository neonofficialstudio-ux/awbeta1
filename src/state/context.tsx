
import React, { createContext, useContext, useReducer } from 'react';
import { AppState } from './state.types';
import { Action } from './actions';
import { appReducer, initialState } from './reducer';
import { normalizeState } from './normalizers';

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({
  state: normalizeState(initialState), // Ensure context default is also normalized
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Use normalized initial state to guarantee integrity from boot
    const [state, dispatch] = useReducer(appReducer, normalizeState(initialState));
    
    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
