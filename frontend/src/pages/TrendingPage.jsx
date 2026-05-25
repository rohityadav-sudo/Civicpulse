import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import IssueCard from '../components/feed/IssueCard';

export default function TrendingPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/api/feed/trending', { params: { limit: 20 } }).then(r => r.data)
  });

  const issues = data?.issues || [];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '52px 18px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={22} color="var(--red2)" />
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800 }}>Trending</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Issues gaining most civic pressure right now
          </p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--red2)' }}>{issues.length}</div>
          <div style={{ fontSize: 9, color: 'var(--red2)', opacity: 0.7 }}>Hot</div>
        </div>
      </div>

      <div style={{ padding: '0 14px' }}>
        {isLoading ? (
          Array.from({length: 4}).map((_,i) => <div key={i} style={{ height: 200, borderRadius: 18, marginBottom: 12 }} className="skeleton" />)
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <Flame size={40} color="var(--text3)" style={{ marginBottom: 12 }} />
            <div>No trending issues yet. Be the first to raise one!</div>
          </div>
        ) : (
          issues.map((issue, idx) => (
            <div key={issue.id} style={{ position: 'relative' }}>
              {idx < 3 && (
                <div style={{
                  position: 'absolute', top: 16, left: 0, zIndex: 10,
                  background: idx === 0 ? 'var(--red)' : idx === 1 ? 'var(--fire)' : 'var(--yellow)',
                  color: idx === 2 ? '#1A2235' : '#fff',
                  padding: '2px 10px', borderRadius: '0 8px 8px 0',
                  fontSize: 10, fontWeight: 700
                }}>
                  🔥 #{idx + 1}
                </div>
              )}
              <IssueCard issue={issue} onUpvote={refetch} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
