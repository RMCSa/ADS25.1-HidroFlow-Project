// src/store/plantStore.ts
import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getStoredPlants, storePlants as savePlantsToStorage, Plant } from '../lib/localStorageUtils'; // Ajuste o caminho

// Exportar Plant para que outros módulos possam usá-la
export type { Plant };

interface PlantState {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  removePlant: (plantId: string) => void;
  updatePlant: (updatedPlant: Plant) => void;
  setPlants: (plants: Plant[]) => void; // Para carregar do storage
  loadPlantsFromStorage: () => void; // Ação para carregar
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set, get) => ({
      plants: [],
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      addPlant: (plant) => {
        const currentPlants = get().plants;
        const updatedPlants = [...currentPlants, plant];
        set({ plants: updatedPlants });
        // savePlantsToStorage(updatedPlants); // O middleware persist já faz isso
      },
      removePlant: (plantId) => {
        const currentPlants = get().plants;
        const updatedPlants = currentPlants.filter((p) => p.id !== plantId);
        set({ plants: updatedPlants });
        // savePlantsToStorage(updatedPlants);
      },
      updatePlant: (updatedPlant) => {
        const currentPlants = get().plants;
        const updatedPlants = currentPlants.map((p) =>
          p.id === updatedPlant.id ? updatedPlant : p
        );
        set({ plants: updatedPlants });
        // savePlantsToStorage(updatedPlants);
      },
      setPlants: (plants) => set({ plants }),
      loadPlantsFromStorage: () => {
        // Esta ação pode ser chamada em um useEffect no nível do App/_layout
        // para garantir que os dados do localStorage sejam carregados na store
        // se o persist middleware não o fizer automaticamente ao iniciar.
        // Normalmente, o persist já lida com a reidratação.
        // Se precisar de carregamento manual em algum ponto:
        if (typeof window !== 'undefined') { // Apenas client-side
            const plantsFromStorage = getStoredPlants();
            set({ plants: plantsFromStorage, _hasHydrated: true });
        }
      },
    }),
    {
      name: 'hidroflow-plants-storage', // Chave no localStorage
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
      partialize: (state) => ({ plants: state.plants }), // Apenas persistir 'plants'
    }
  )
);

// Hook customizado para hidratação, similar ao useAuth
export function usePlants() {
    const store = usePlantStore();
    const [clientHydrated, setClientHydrated] = React.useState(false);

    React.useEffect(() => {
        const unsub = usePlantStore.persist.onFinishHydration(() => setClientHydrated(true));
        if (usePlantStore.persist.hasHydrated()) {
            setClientHydrated(true);
        }
        return () => unsub();
    }, []);

    return {
        plants: clientHydrated ? store.plants : [], // Retorna array vazio se não hidratado
        addPlant: store.addPlant,
        removePlant: store.removePlant,
        updatePlant: store.updatePlant,
        loadPlantsFromStorage: store.loadPlantsFromStorage, // Se precisar chamar manualmente
        hydrated: clientHydrated,
    };
}