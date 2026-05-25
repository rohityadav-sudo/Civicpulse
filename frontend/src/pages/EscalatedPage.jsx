// ═══════════════════════════════════════════════════════════════
// EscalatedPage.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import IssueCard from '../components/feed/IssueCard';

export function EscalatedPage() {
  const [sort, setSort] = useState('trending');
  const [filter, setFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['escalated', sort],
    queryFn: () => api.get('/api/feed/escalated', { params: { sort } }).then(r => r.data)
  });

  const issues = (data?.issues || []).filter(i =>
    filter === 'all' ? true :
    filter === 'mla' ? i.status === 'ESCALATED_TO_MLA' :
    filter === 'mp'  ? i.status === 'ESCALATED_TO_MP' :
    filter === 'resolved' ? i.status === 'RESOLVED' : true
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '52px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800 }}>Escalated Issues</h1>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Mumbai · All Zones</p>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--red2)' }}>{data?.issues?.length || 0}</div>
            <div style={{ fontSize: 9, color: 'var(--red2)', opacity: 0.7 }}>Active</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
          {[['all','All'],['mla','→MLA'],['mp','→MP'],['resolved','Resolved']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 500,
              background: filter === val ? 'var(--red)' : 'var(--surface2)',
              color: filter === val ? '#fff' : 'var(--text2)',
              border: filter === val ? 'none' : '1px solid var(--border)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
            }}>{lbl}</button>
          ))}
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            marginLeft: 'auto', padding: '5px 10px', fontSize: 11, borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', flexShrink: 0
          }}>
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
            <option value="upvotes">Most Upvoted</option>
          </select>
        </div>
      </div>

      <div style={{ padding: '0 14px' }}>
        {isLoading ? Array.from({length:3}).map((_,i) => <div key={i} style={{height:200,borderRadius:18,marginBottom:12}} className="skeleton" />) :
         issues.length === 0 ? <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>🎉 No escalated issues right now!</div> :
         issues.map(issue => <IssueCard key={issue.id} issue={issue} onUpvote={refetch} />)
        }
      </div>
    </div>
  );
}

export default EscalatedPage;
