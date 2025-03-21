import { Suspense } from 'react';
import AccountDetailsClient from './AccountDetailsClient';
import { use } from 'react';

export default function AccountDetailsPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div>Loading account details...</div>}>
      <AccountDetailsClient accountId={resolvedParams.id} />
    </Suspense>
  );
}