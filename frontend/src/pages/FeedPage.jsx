import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import IssueCard from '../components/feed/IssueCard';

const FILTERS = ['All', 'Trending', 'Escalated', 'Near Me', 'Resolved'];
const SORT_MAP = { 'All': 'newest', 'Trending': 'trending', 'Escalated': 'escalated', 'Resolved': 'newest' };

export default function FeedPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed', activeFilter],
    queryFn: () => api.get('/api/feed/home', {
      params: {
        sort: SORT_MAP[activeFilter] || 'newest',
        status: activeFilter === 'Resolved' ? 'RESOLVED' : undefined
      }
    }).then(r => r.data)
  });

  const issues = (data?.issues || []).filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '52px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{greeting}, {user?.name?.split(' ')[0]}</div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Your Ward Feed
          </h1>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--fire), var(--yellow))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff'
        }}>
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>

      {/* Search */}
      <div style={{
        margin: '0 18px 14px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <Search size={14} color="var(--text3)" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search issues in your ward…"
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, outline: 'none', padding: 0 }}
        />
        <button onClick={() => navigate('/create?voice=1')} style={{
          width: 28, height: 28, background: 'var(--accent)',
          border: 'none', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Mic size={14} color="white" />
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px', overflowX: 'auto' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
            whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', border: 'none',
            background: activeFilter === f ? 'var(--accent)' : 'var(--surface2)',
            color: activeFilter === f ? '#fff' : 'var(--text2)',
            outline: activeFilter === f ? 'none' : '1px solid var(--border)'
          }}>
            {f === 'Trending' ? '🔥 Trending' : f}
          </button>
        ))}
      </div>

      {/* Issues list */}
      <div style={{ padding: '0 14px' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 180, borderRadius: 18, marginBottom: 12 }} className="skeleton" />
          ))
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏙️</div>
            <div>No issues found. Be the first to raise one!</div>
          </div>
        ) : (
          issues.map(issue => (
            <IssueCard key={issue.id} issue={issue} onUpvote={refetch} />
          ))
        )}
      </div>
    </div>
  );
}
