import { useContext } from 'react';
import { UserContext } from './userContextInstance.js';

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser() doit être appelé à l\'intérieur de <UserProvider>');
  }
  return ctx;
}
