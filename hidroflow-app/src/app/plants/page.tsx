// src/app/plants/page.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/store/authStore';
import { usePlants, Plant } from '@/app/store/plantStore';

// Um componente simples para o formulário de cadastro de planta
const PlantForm = ({ onSubmit, plantToEdit }: {
    onSubmit: (plantData: Omit<Plant, 'id'> | Plant) => void;
    plantToEdit?: Plant | null;
}) => {
    const [name, setName] = useState(plantToEdit?.name || '');
    const [type, setType] = useState(plantToEdit?.type || '');
    const [esp32Identifier, setEsp32Identifier] = useState(plantToEdit?.esp32Identifier || '');
    const [error, setError] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !type.trim() || !esp32Identifier.trim()) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        if (plantToEdit) {
            onSubmit({ id: plantToEdit.id, name, type, esp32Identifier });
        } else {
            onSubmit({ name, type, esp32Identifier });
        }
        // Limpar formulário se não for edição
        if (!plantToEdit) {
            setName('');
            setType('');
            setEsp32Identifier('');
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h3>{plantToEdit ? 'Editar Planta' : 'Cadastrar Nova Planta'}</h3>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="plantName">Nome da Planta:</label>
                <input id="plantName" type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="plantType">Tipo (ex: Tomate, Horta Vertical):</label>
                <input id="plantType" type="text" value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="esp32Identifier">Identificador do ESP32 (para MQTT):</label>
                <input id="esp32Identifier" type="text" value={esp32Identifier} onChange={e => setEsp32Identifier(e.target.value)} style={{ width: '100%', padding: '8px' }} />
            </div>
            <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                {plantToEdit ? 'Salvar Alterações' : 'Cadastrar Planta'}
            </button>
        </form>
    );
};


export default function PlantManagementPage() {
  const { currentUser, isAuthenticated, hydrated: authHydrated } = useAuth();
  const { plants, addPlant, removePlant, updatePlant, hydrated: plantsHydrated, loadPlantsFromStorage } = usePlants();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  useEffect(() => {
    // Proteção de rota e carregamento inicial de plantas
    if (authHydrated && !isAuthenticated) {
      router.push('/login');
    }
    // Carrega plantas do localStorage se ainda não foi feito pela store (apenas uma vez)
    if (authHydrated && isAuthenticated && !plantsHydrated) {
        // A store do Zustand com persist já deve lidar com isso na reidratação.
        // Mas se for necessário um carregamento explícito:
        // loadPlantsFromStorage(); // Descomente se a store não estiver populando automaticamente
    }
  }, [isAuthenticated, router, authHydrated, plantsHydrated, loadPlantsFromStorage]);


  if (!authHydrated || (isAuthenticated && !plantsHydrated)) {
    return <p>Carregando dados...</p>; // Ou um spinner
  }
  if (!isAuthenticated) {
    return null; // Ou redireciona (já tratado no useEffect)
  }

  const handleRegisterPlant = (plantData: Omit<Plant, 'id'> | Plant) => {
    if ('id' in plantData) { // Editando
        updatePlant(plantData as Plant);
        setEditingPlant(null);
    } else { // Novo cadastro
        const newPlant: Plant = {
            id: crypto.randomUUID(),
            name: plantData.name,
            type: plantData.type,
            esp32Identifier: plantData.esp32Identifier,
        };
        addPlant(newPlant);
    }
    setShowForm(false); // Fecha o formulário após submissão
  };

  const handleDeletePlant = (plantId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta planta?')) {
      removePlant(plantId);
    }
  };

  const handleEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setShowForm(true);
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Olá, {currentUser?.username}! Suas Plantas</h1>
      <button
        onClick={() => { setShowForm(!showForm); setEditingPlant(null); }}
        style={{ marginBottom: '20px', padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        {showForm && !editingPlant ? 'Cancelar Cadastro' : 'Adicionar Nova Planta'}
      </button>

      {showForm && <PlantForm onSubmit={handleRegisterPlant} plantToEdit={editingPlant} />}

      {plants.length === 0 && !showForm && (
        <p>Você ainda não cadastrou nenhuma planta.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {plants.map((plant) => (
          <div key={plant.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>{plant.name}</h3>
            <p><strong>Tipo:</strong> {plant.type}</p>
            <p><strong>ID ESP32:</strong> {plant.esp32Identifier}</p>
            <div style={{ marginTop: '10px' }}>
              <Link href={`/plants/${plant.id}`} legacyBehavior>
                <a style={{ marginRight: '10px', padding: '8px 12px', backgroundColor: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
                  Ver/Gerenciar
                </a>
              </Link>
              <button
                onClick={() => handleEditPlant(plant)}
                style={{ marginRight: '10px', padding: '8px 12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
              >
                Editar
              </button>
              <button
                onClick={() => handleDeletePlant(plant.id)}
                style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}