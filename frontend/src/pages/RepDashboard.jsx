import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function RepDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rep-dashboard'],
    queryFn: () => api.get('/api/feed/home').then(r => r.data)
  });

  const updateStatus = async (issueId, status) => {
    try {
      await api.patch(`/api/issues/${issueId}/status`, { status });
      toast.success(`Issue marked as ${status}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const issues = data?.issues || [];
  const open = issues.filter(i => i.status === 'OPEN' || i.status === 'ASSIGNED');
  const escalated = issues.filter(i => i.status?.includes('ESCALATED'));
  const resolved = issues.filter(i => i.status === 'RESOLVED');

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '52px 18px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Representative Dashboard</div>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700 }}>
          {user?.role === 'CORPORATOR' ? 'Ward Issues' : user?.role === 'MLA' ? 'Constituency Issues' : 'MP Dashboard'}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '0 14px 16px' }}>
        {[
          ['Open', open.length, 'var(--yellow2)', 'rgba(245,158,11,0.12)'],
          ['Escalated', escalated.length, 'var(--fire2)', 'rgba(249,115,22,0.12)'],
          ['Resolved', resolved.length, 'var(--green2)', 'rgba(16,185,129,0.12)'],
        ].map(([lbl, val, color, bg]) => (
          <div key={lbl} style={{ background: bg, border: `1px solid ${color.replace('var(','').replace(')','') === '--fire2' ? 'rgba(249,115,22,0.2)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Issue list with action buttons */}
      <div style={{ padding: '0 14px' }}>
        <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Open Issues — Action Required
        </h3>

        {isLoading ? Array.from({length:3}).map((_,i) => <div key={i} style={{height:120,borderRadius:14,marginBottom:10}} className="skeleton" />) :
         open.length === 0 ? <div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>✅ All issues resolved!</div> :
         open.map(issue => {
           const now = Date.now();
           const deadline = new Date(issue.sla_deadline).getTime();
           const hoursLeft = Math.floor((deadline - now) / (1000 * 60 * 60));
           const isUrgent = hoursLeft < 24 && hoursLeft > 0;
           const isOverdue = hoursLeft <= 0;

           return (
             <div key={issue.id} style={{
               background: 'var(--surface2)',
               border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.4)' : isUrgent ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
               borderRadius: 14, padding: '12px', marginBottom: 10
             }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                 <div style={{ flex: 1, marginRight: 8 }}>
                   <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{issue.title}</div>
                   <div style={{ fontSize: 10, color: 'var(--text3)' }}>{issue.wards?.name} · {issue.category}</div>
                 </div>
                 <div style={{ textAlign: 'right', flexShrink: 0 }}>
                   {isOverdue ? (
                     <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--red2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                       <AlertTriangle size={10} /> Overdue
                     </div>
                   ) : isUrgent ? (
                     <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fire2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                       <Clock size={10} /> {hoursLeft}h left
                     </div>
                   ) : (
                     <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                       {formatDistanceToNow(new Date(issue.sla_deadline), { addSuffix: true })}
                     </div>
                   )}
                 </div>
               </div>

               <div style={{ display: 'flex', gap: 6 }}>
                 <button onClick={() => updateStatus(issue.id, 'IN_PROGRESS')} style={{
                   flex: 1, padding: '7px 0', background: 'rgba(245,158,11,0.12)',
                   border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8,
                   fontSize: 11, fontWeight: 600, color: 'var(--yellow2)', cursor: 'pointer'
                 }}>In Progress</button>
                 <button onClick={() => updateStatus(issue.id, 'RESOLVED')} style={{
                   flex: 1, padding: '7px 0', background: 'rgba(16,185,129,0.12)',
                   border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8,
                   fontSize: 11, fontWeight: 600, color: 'var(--green2)', cursor: 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                 }}><CheckCircle size={12} /> Resolve</button>
                 <button onClick={() => navigate(`/issues/${issue.id}`)} style={{
                   padding: '7px 10px', background: 'var(--surface3)',
                   border: '1px solid var(--border)', borderRadius: 8,
                   fontSize: 11, color: 'var(--text2)', cursor: 'pointer'
                 }}>View</button>
               </div>
             </div>
           );
         })
        }
      </div>
    </div>
  );
}
