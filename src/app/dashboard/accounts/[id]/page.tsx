import { Suspense } from 'react';
import AccountDetailsClient from './AccountDetailsClient';

export default function AccountDetailsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading account details...</div>}>
      <AccountDetailsClient accountId={params.id} />
    </Suspense>
  );
}