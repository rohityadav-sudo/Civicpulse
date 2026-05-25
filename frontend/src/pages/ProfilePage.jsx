// ─── ProfilePage.jsx ─────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Shield, BarChart2 } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import IssueCard from '../components/feed/IssueCard';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['myIssues'],
    queryFn: () => api.get('/api/feed/home', { params: { user_id: user?.id } }).then(r => r.data)
  });

  const isRep = ['CORPORATOR','MLA','MP'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '52px 18px 20px' }}>
        {/* Avatar & name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: '#fff'
          }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{user?.email || user?.phone}</div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(59,130,246,0.12)', fontSize: 10, fontWeight: 600, color: 'var(--accent2)'
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {isRep && (
            <button onClick={() => navigate('/dashboard')} style={{
              flex: 1, padding: 12, background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent2)', fontSize: 13, fontWeight: 600
            }}>
              <BarChart2 size={16} /> My Dashboard
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/admin')} style={{
              flex: 1, padding: 12, background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 8, color: 'var(--purple2)', fontSize: 13, fontWeight: 600
            }}>
              <Shield size={16} /> Admin Panel
            </button>
          )}
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            padding: 12, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red2)', fontSize: 13, fontWeight: 600
          }}>
            <LogOut size={16} />
          </button>
        </div>

        <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>My Issues</h3>
        {(data?.issues || []).map(issue => <IssueCard key={issue.id} issue={issue} />)}
      </div>
    </div>
  );
}

export default ProfilePage;
