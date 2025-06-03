// src/app/plants/[plantId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/store/authStore';
import { usePlants, Plant } from '@/app/store/plantStore';
import PlantMonitorPanel from '@/app/components/PlantMonitorPanel';// Ajuste o caminho

export default function PlantDetailPage() {
  const params = useParams(); // Hook para acessar parâmetros da rota
  const router = useRouter();
  const { isAuthenticated, currentUser, hydrated: authHydrated } = useAuth();
  const { plants, hydrated: plantsHydrated } = usePlants();

  const [selectedPlant, setSelectedPlant] = useState<Plant | null | undefined>(undefined); // undefined: loading, null: not found

  const plantId = typeof params?.plantId === 'string' ? params.plantId : null;

  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (plantsHydrated && plantId) {
      const foundPlant = plants.find(p => p.id === plantId);
      setSelectedPlant(foundPlant || null); // Define como null se não encontrada
    }
  }, [isAuthenticated, router, authHydrated, plants, plantId, plantsHydrated]);

  if (!authHydrated || !plantsHydrated || selectedPlant === undefined) {
    return <p style={{ textAlign: 'center', marginTop: '50px' }}>Carregando dados da planta...</p>;
  }

  if (!isAuthenticated) {
    // Já deve ter sido redirecionado, mas como fallback:
    return null;
  }

  if (!selectedPlant) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
        <h2>Planta não encontrada</h2>
        <p>A planta que você está tentando acessar não foi encontrada ou não existe.</p>
        <Link href="/plants" legacyBehavior>
          <a style={{ color: '#007bff', textDecoration: 'underline' }}>Voltar para Minhas Plantas</a>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/plants" legacyBehavior>
          <a style={{ color: '#007bff', textDecoration: 'none' }}>
            &larr; Voltar para Minhas Plantas
          </a>
        </Link>
      </div>
      <PlantMonitorPanel
        plantName={selectedPlant.name}
        plantEsp32Identifier={selectedPlant.esp32Identifier}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}