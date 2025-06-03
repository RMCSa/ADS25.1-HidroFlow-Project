// src/lib/localStorageUtils.ts
const USERS_KEY = 'hidroFlowUsers';
// Defina o tipo StoredUser que inclui hashedPassword
export interface StoredUser { id: string; username: string; role: string; hashedPassword: string; }

export function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return []; // Garante execução client-side
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (e) {
    console.error("Erro ao ler usuários do localStorage", e);
    return [];
  }
}

export function storeUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Erro ao salvar usuários no localStorage", e);
  }
}

// src/lib/localStorageUtils.ts
// ... (funções de usuário existentes) ...

const PLANTS_KEY = 'hidroFlowPlants';

// Defina a interface Plant se ainda não estiver globalmente acessível
export interface Plant {
  id: string;
  name: string;
  type: string; // Tipo da planta, ex: Tomate, Samambaia
  esp32Identifier: string; // Identificador único para o ESP32 associado
}

export function getStoredPlants(): Plant[] {
  if (typeof window === 'undefined') return [];
  try {
    const plantsJson = localStorage.getItem(PLANTS_KEY);
    return plantsJson ? JSON.parse(plantsJson) : [];
  } catch (e) {
    console.error("Erro ao ler plantas do localStorage", e);
    return [];
  }
}

export function storePlants(plants: Plant[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
  } catch (e) {
    console.error("Erro ao salvar plantas no localStorage", e);
  }
}