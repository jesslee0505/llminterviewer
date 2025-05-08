'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

interface LoginFormProps {
  initialMode?: 'login' | 'register';
}

export default function LoginForm({ initialMode = 'login' }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');

  const router = useRouter();

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
  }, [initialMode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!username || !password) {
      setMessage('Username and password are required.');
      setIsLoading(false);
      return;
    }

    if (!isLoginMode && password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const successMessage = isLoginMode ? 'Login successful! Redirecting...' : 'Account created successfully! Please log in.';

    const requestBody = { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Something went wrong.`);
      }

      setMessage(data.message || successMessage);

      if (response.ok) {
        if (isLoginMode) {
          router.push('/code');
        } else {
          setIsLoginMode(true);
          setUsername('');
          setPassword('');
          setMessage('Account created successfully! Please sign in.');
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      setMessage(error.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setMessage('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className={styles.formWrapper}>
      <h2>{isLoginMode ? 'Sign In' : 'Create Account'}</h2>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        {message && (
          <p className={`${styles.message} ${message.toLowerCase().includes('successful') || message.toLowerCase().includes('redirecting') || message.toLowerCase().includes('created') ? styles.success : styles.error}`}>
            {message}
          </p>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            required
            disabled={isLoading}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
          {!isLoginMode && password.length > 0 && password.length < 6 && (
            <p className={styles.error} style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Password must be at least 6 characters.
            </p>
          )}
        </div>
        <button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
        </button>
      </form>
      <div className={styles.toggleMode}>
        {isLoginMode ? "Don't have an account? " : "Already have an account? "}
        <button type="button" onClick={toggleMode} disabled={isLoading} className={styles.toggleButton}>
          {isLoginMode ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
