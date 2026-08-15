import { createContext } from 'react';

/** Contexte isolé dans un module dédié pour éviter les re-renders de l'arbre. */
export const UserContext = createContext(null);
