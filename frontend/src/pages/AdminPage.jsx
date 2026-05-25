import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Users, BarChart2, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/api/admin/analytics/overview').then(r => r.data)
  });

  const { data: corpsData, refetch: refetchCorps } = useQuery({
    queryKey: ['corporators'],
    queryFn: () => api.get('/api/admin/reps/corporators').then(r => r.data),
    enabled: tab === 'reps'
  });

  const { data: slaData, refetch: refetchSla } = useQuery({
    queryKey: ['sla-config'],
    queryFn: () => api.get('/api/admin/sla').then(r => r.data),
    enabled: tab === 'sla'
  });

  const [newCorp, setNewCorp] = useState({ name: '', ward_id: '', party: '', phone: '', email: '', term_start: '' });
  const [addingCorp, setAddingCorp] = useState(false);

  const submitCorp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/reps/corporators', newCorp);
      toast.success('Corporator added!');
      refetchCorps();
      setAddingCorp(false);
      setNewCorp({ name: '', ward_id: '', party: '', phone: '', email: '', term_start: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add corporator');
    }
  };

  const stats = overview?.stats || {};

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '52px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={20} color="var(--purple2)" />
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700 }}>Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 14px 16px', overflowX: 'auto' }}>
        {[['overview','Overview',BarChart2],['reps','Representatives',Users],['sla','SLA Config',Settings]].map(([val,lbl,Icon]) => (
          <button key={val} onClick={() => setTab(val)} style={{
            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 500,
            background: tab === val ? 'var(--accent)' : 'transparent',
            color: tab === val ? '#fff' : 'var(--text2)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Icon size={13} /> {lbl}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 14px' }}>
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['Total Issues', stats.total, 'var(--accent2)'],
                ['Open', stats.open, 'var(--yellow2)'],
                ['Escalated', stats.escalated, 'var(--fire2)'],
                ['Resolved', stats.resolved, 'var(--green2)'],
                ['Trending', stats.trending, 'var(--red2)'],
                ['Resolution %', `${stats.resolution_rate || 0}%`, 'var(--green2)'],
              ].map(([lbl,val,color]) => (
                <div key={lbl} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, color }}>{val ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Recent Issues</h3>
            {(overview?.recent_issues || []).map(i => (
              <div key={i.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => navigate(`/issues/${i.id}`)}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{i.title}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
                  <span>{i.category}</span>
                  <span>•</span>
                  <span>{i.status}</span>
                  <span>•</span>
                  <span>🔥 {Math.round(i.trending_score || 0)}</span>
                  <span>•</span>
                  <span>👍 {i.upvote_count}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* REPS TAB */}
        {tab === 'reps' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 600 }}>Corporators</h3>
              <button onClick={() => setAddingCorp(!addingCorp)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                background: 'var(--accent)', border: 'none', borderRadius: 10,
                fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer'
              }}>
                <Plus size={14} /> Add Rep
              </button>
            </div>

            {addingCorp && (
              <form onSubmit={submitCorp} style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 14, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>Inject Corporator</h4>
                {[
                  ['name','Full Name','text',true],
                  ['ward_id','Ward ID (UUID)','text',true],
                  ['party','Party','text',false],
                  ['phone','Phone','tel',false],
                  ['email','Email','email',false],
                  ['term_start','Term Start Date','date',true],
                ].map(([field,placeholder,type,req]) => (
                  <input key={field} type={type} placeholder={placeholder} required={req}
                    value={newCorp[field]} onChange={e => setNewCorp(p => ({ ...p, [field]: e.target.value }))} />
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ flex: 1, padding: 10, background: 'var(--accent)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Save</button>
                  <button type="button" onClick={() => setAddingCorp(false)} style={{ padding: '10px 14px', background: 'var(--surface3)', border: 'none', borderRadius: 10, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            {(corpsData?.corporators || []).map(c => (
              <div key={c.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--fire),var(--yellow))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.wards?.name} · {c.party || 'Independent'}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: c.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: c.is_active ? 'var(--green2)' : 'var(--red2)' }}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
          </>
        )}

        {/* SLA TAB */}
        {tab === 'sla' && (
          <>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>SLA Configuration</h3>
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 12, color: 'var(--text2)' }}>
              Ward-specific rules override global defaults. SLA can be set in Hours, Days, or Months.
            </div>
            {(slaData?.sla_configs || []).map(s => (
              <div key={s.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.category}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.wards?.name || 'Global default'} · Escalates to {s.escalation_rep}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent2)' }}>{s.sla_value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.sla_unit}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
