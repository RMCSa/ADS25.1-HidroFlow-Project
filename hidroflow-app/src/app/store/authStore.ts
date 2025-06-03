// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import React from 'react'; // Importar React para useEffect e useState no hook customizado

export interface User { // Usuário para o estado global (sem hashedPassword)
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  _hasHydrated: boolean; // Flag para controlar hidratação
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      _hasHydrated: false, // Inicializa como não hidratado
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      loginUser: (user) => set({ currentUser: user, isAuthenticated: true }),
      logoutUser: () => set({ currentUser: null, isAuthenticated: false }),
    }),
    {
      name: 'hidroflow-auth-session', // Chave no localStorage para a sessão
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => { // Chamado quando a store é reidratada
        if (state) state.setHasHydrated(true);
      },
      partialize: (state) => ({ // Apenas persistir estes campos
         currentUser: state.currentUser,
         isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook customizado para aguardar a hidratação antes de usar o estado persistido
// Isso é útil em Next.js para evitar mismatches entre SSR e client-side
export function useAuth() {
  const store = useAuthStore();
  // Usa um estado local para rastrear se a hidratação via onFinishHydration ocorreu.
  const [clientHydrated, setClientHydrated] = React.useState(false);

  React.useEffect(() => {
    // onFinishHydration é chamado quando a store terminou de se reidratar.
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setClientHydrated(true);
    });
    // Verifica se já hidratou (caso onFinishHydration já tenha disparado antes do useEffect)
    if (useAuthStore.persist.hasHydrated()) {
      setClientHydrated(true);
    }
    return () => {
      unsub(); // Limpa a inscrição ao desmontar
    };
  }, []);

  // Retorna o estado da store apenas se estiver hidratado do lado do cliente,
  // caso contrário, retorna um estado padrão para evitar o uso de dados de localStorage no SSR.
  return {
    currentUser: clientHydrated ? store.currentUser : null,
    isAuthenticated: clientHydrated ? store.isAuthenticated : false,
    loginUser: store.loginUser,
    logoutUser: store.logoutUser,
    hydrated: clientHydrated, // Flag para o componente saber se pode usar os dados
  };
}