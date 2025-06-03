// src/app/(auth)/login/page.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hashPassword } from '@/app/lib/authUtils';
import { getStoredUsers, StoredUser } from '@/app/lib/localStorageUtils';
import { useAuthStore } from '@/app/store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const loginUserToStore = useAuthStore((state) => state.loginUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [storedUsers, setStoredUsers] = useState<StoredUser[]>([]);

  useEffect(() => {
    // Se já estiver autenticado, redireciona para a página de plantas
    if (isAuthenticated) {
      router.push('/plants');
    }
    // Carregar usuários do localStorage no lado do cliente
    setStoredUsers(getStoredUsers());
  }, [isAuthenticated, router]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Nome de usuário e senha são obrigatórios.');
      return;
    }

    try {
      const userToLogin = storedUsers.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );

      if (!userToLogin) {
        setError('Nome de usuário ou senha inválidos.');
        return;
      }

      const inputPasswordHash = await hashPassword(password);

      if (inputPasswordHash === userToLogin.hashedPassword) {
        const { hashedPassword, ...userForStore } = userToLogin; // Não armazena o hash no estado global
        loginUserToStore(userForStore);
        router.push('/plants'); // Redireciona após login bem-sucedido
      } else {
        setError('Nome de usuário ou senha inválidos.');
      }
    } catch (e) {
      console.error('Erro no login:', e);
      setError('Falha no login. Tente novamente.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>Login no HidroFlow</h2>
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
        <div style={{ marginBottom: '15px' }}>
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
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Login
        </button>
      </form>
      <p style={{ marginTop: '15px', textAlign: 'center' }}>
        Não tem uma conta? <Link href="/register" style={{ color: '#007bff' }}>Cadastre-se aqui</Link>
      </p>
    </div>
  );
}