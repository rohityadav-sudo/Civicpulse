import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ThumbsUp, MessageSquare, Share2, MapPin, Flame, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const STATUS_STEPS = ['OPEN','ASSIGNED','IN_PROGRESS','ESCALATED_TO_MLA','RESOLVED'];
const STATUS_LABEL = { OPEN:'Raised', ASSIGNED:'Assigned', IN_PROGRESS:'In Progress', ESCALATED_TO_MLA:'Escalated', ESCALATED_TO_MP:'Escalated→MP', RESOLVED:'Resolved' };

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [comment, setComment] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => api.get(`/api/issues/${id}`).then(r => {
      setUpvoted(r.data.issue.user_has_upvoted);
      setUpvoteCount(r.data.issue.upvote_count);
      return r.data;
    })
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.get(`/api/issues/${id}/comments`).then(r => r.data)
  });

  const issue = data?.issue;
  const comments = commentsData?.comments || [];

  const handleUpvote = async () => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    const was = upvoted;
    setUpvoted(!was); setUpvoteCount(c => was ? c - 1 : c + 1);
    try { await api.post(`/api/issues/${id}/upvote`); }
    catch { setUpvoted(was); setUpvoteCount(c => was ? c + 1 : c - 1); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/api/issues/${id}/comments`, { body: comment.trim() });
      setComment('');
      refetchComments();
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.share?.({ title: issue?.title, url }) || navigator.clipboard.writeText(url);
    api.post(`/api/issues/${id}/share`, { platform: 'COPY_LINK' }).catch(() => {});
    toast.success('Link copied!');
  };

  const currentStepIndex = STATUS_STEPS.indexOf(issue?.status);

  if (isLoading) return (
    <div style={{ padding: '60px 14px' }}>
      {[240, 60, 100, 120].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 16, marginBottom: 12 }} className="skeleton" />
      ))}
    </div>
  );

  if (!issue) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Issue not found</div>;

  const isEscalated = !!issue.escalated_at;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header image */}
      <div style={{ height: 200, background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}>
        {issue.issue_media?.[0]?.cdn_url ? (
          <img src={issue.issue_media[0].cdn_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.3 }}>
            🏙️
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, var(--bg))' }} />
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <button onClick={() => navigate(-1)} style={{
            width: 34, height: 34, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)'
          }}>
            <ArrowLeft size={16} />
          </button>
          <button onClick={handleShare} style={{
            width: 34, height: 34, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)'
          }}>
            <Share2 size={15} />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px 0' }}>
        {/* Escalation strip */}
        {isEscalated && (
          <div style={{
            padding: '10px 12px', marginBottom: 12,
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 32, height: 32, background: 'rgba(249,115,22,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fire2)' }}>
                {issue.escalated_to_mp_at
                  ? `Escalated to MP ${issue.mps?.name || ''}`
                  : `Escalated to MLA ${issue.mlas?.name || ''}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Corporator missed SLA deadline</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>
              {formatDistanceToNow(new Date(issue.escalated_at), { addSuffix: true })}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 10 }}>
          {issue.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600,
            background: isEscalated ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)',
            color: isEscalated ? 'var(--fire2)' : 'var(--accent2)'
          }}>
            {STATUS_LABEL[issue.status] || issue.status}
          </span>
          {issue.trending_rank <= 5 && issue.trending_rank > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: 'var(--red2)' }}>
              <Flame size={10} /> #{issue.trending_rank} Trending
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
            <MapPin size={10} /> {issue.wards?.name || issue.location_label}
          </span>
        </div>

        {issue.description && (
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>{issue.description}</p>
        )}

        {/* Progress tracker */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Issue Progress</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, height: 1, background: 'var(--border)' }} />
            <div style={{ position: 'absolute', top: 12, left: 12, height: 1, width: `${Math.min(100, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`, background: isEscalated ? 'var(--fire)' : 'var(--green)', transition: 'width 0.3s' }} />
            {STATUS_STEPS.map((s, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: done ? 'var(--green)' : active ? (isEscalated ? 'var(--fire)' : 'var(--accent)') : 'var(--surface3)',
                    border: active ? 'none' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: (done || active) ? '#fff' : 'var(--text3)',
                    boxShadow: active ? `0 0 10px ${isEscalated ? 'rgba(249,115,22,0.4)' : 'rgba(59,130,246,0.4)'}` : 'none'
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 8, color: active ? (isEscalated ? 'var(--fire2)' : 'var(--accent2)') : 'var(--text3)', textAlign: 'center', fontWeight: active ? 600 : 400 }}>
                    {STATUS_LABEL[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engagement */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { icon: <ThumbsUp size={14} fill={upvoted ? 'currentColor' : 'none'} />, label: `${upvoteCount.toLocaleString()} Upvotes`, action: handleUpvote, active: upvoted },
            { icon: <MessageSquare size={14} />, label: `${issue.comment_count || 0} Comments`, action: null },
            { icon: <Share2 size={14} />, label: 'Share', action: handleShare },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action || undefined} style={{
              flex: 1, padding: 10, background: btn.active ? 'rgba(59,130,246,0.12)' : 'var(--surface2)',
              border: `1px solid ${btn.active ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, fontWeight: 500, color: btn.active ? 'var(--accent2)' : 'var(--text2)',
              cursor: btn.action ? 'pointer' : 'default'
            }}>
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Comments ({comments.length})
          </h3>

          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: c.comment_type === 'REP_OFFICIAL'
                  ? 'linear-gradient(135deg, var(--accent), #0EA5E9)'
                  : 'linear-gradient(135deg, var(--purple), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff'
              }}>
                {c.users?.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1 }}>
                {c.comment_type === 'REP_OFFICIAL' && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(59,130,246,0.15)', borderRadius: 4, padding: '1px 6px',
                    fontSize: 9, fontWeight: 600, color: 'var(--accent2)', marginBottom: 4
                  }}>
                    ✓ Official Response
                  </div>
                )}
                <div style={{
                  background: c.comment_type === 'REP_OFFICIAL' ? 'rgba(59,130,246,0.08)' : 'var(--surface2)',
                  border: `1px solid ${c.comment_type === 'REP_OFFICIAL' ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
                  borderRadius: '12px 12px 12px 4px', padding: '8px 10px'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{c.users?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{c.body}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          {isAuthenticated && (
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a comment…" maxLength={500}
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={submittingComment || !comment.trim()} style={{
                padding: '0 16px', background: 'var(--accent)', border: 'none',
                borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#fff',
                opacity: submittingComment || !comment.trim() ? 0.6 : 1
              }}>
                Post
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
