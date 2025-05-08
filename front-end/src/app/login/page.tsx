'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';
import styles from './login.module.css';
import BlobBackgroundLayout from '../../components/BlobBackgroundLayout';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode = modeParam === 'register' ? 'register' : 'login';

  return (
    <div className={styles.loginPageContainer}>
      <LoginForm initialMode={initialMode} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <BlobBackgroundLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginPageContent />
      </Suspense>
    </BlobBackgroundLayout>
  );
}