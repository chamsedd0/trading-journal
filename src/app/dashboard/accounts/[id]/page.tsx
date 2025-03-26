'use client';

import { Suspense } from 'react';
import AccountDetailsClient from './AccountDetailsClient';
import { useParams } from 'next/navigation';

export default function AccountDetailsPage() {
  const params = useParams();
  const accountId = params?.id as string;
  
  return (
    <Suspense fallback={<div>Loading account details...</div>}>
      <AccountDetailsClient accountId={accountId} />
    </Suspense>
  );
}