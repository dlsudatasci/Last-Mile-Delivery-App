import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ClaimsTable from '@/components/ClaimsTable';

export default async function ClaimsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('compensationClaims').orderBy('createdAt', 'desc').limit(200).get();
  const claims = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const pending = claims.filter(c => (c as Record<string,unknown>).status === 'pending_validation').length;
  const paid = claims.filter(c => (c as Record<string,unknown>).status === 'paid').length;

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Compensation Claims</h1>
            <p className="page-subtitle">{pending} pending · {paid} paid · {claims.length} total</p>
          </div>
          <ClaimsTable claims={claims as Parameters<typeof ClaimsTable>[0]['claims']} />
        </div>
      </main>
    </div>
  );
}
