// src/app/(auth)/register/page.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Para navegação Next.js
import { hashPassword } from '@/app/lib/authUtils'; // Ajuste o caminho se necessário
import { getStoredUsers, storeUsers, StoredUser } from '@/app/lib/localStorageUtils'; // Ajuste o caminho

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const [storedUsers, setStoredUsers] = useState<StoredUser[]>([]);

  useEffect(() => {
    // Carregar usuários do localStorage no lado do cliente
    setStoredUsers(getStoredUsers());
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const existingUser = storedUsers.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );
      if (existingUser) {
        setError('Nome de usuário já existe. Por favor, escolha outro.');
        return;
      }

      const hashedPassword = await hashPassword(password);
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        username,
        hashedPassword,
        role: 'admin', // Definir um papel padrão, ex: 'admin' ou 'user'
      };

      const updatedUsers = [...storedUsers, newUser];
      storeUsers(updatedUsers); // Salva no localStorage
      setStoredUsers(updatedUsers); // Atualiza o estado local

      setSuccess('Cadastro realizado com sucesso! Você já pode fazer login.');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      // router.push('/login'); // Opcional: redirecionar para login
    } catch (e) {
      console.error('Erro no cadastro:', e);
      setError('Falha no cadastro. Tente novamente.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>Cadastre-se no HidroFlow</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="username">Nome de Usuário:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="confirmPassword">Confirmar Senha:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cadastrar
        </button>
      </form>
      <p style={{ marginTop: '15px', textAlign: 'center' }}>
        Já tem uma conta? <Link href="/login" style={{ color: '#007bff' }}>Faça login aqui</Link>
      </p>
    </div>
  );
}