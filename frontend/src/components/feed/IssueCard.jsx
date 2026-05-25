import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, Share2, MapPin, Flame } from 'lucide-react';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  POTHOLE:     { bg: 'rgba(249,115,22,0.15)', color: '#FB923C' },
  GARBAGE:     { bg: 'rgba(16,185,129,0.15)',  color: '#34D399' },
  WATER:       { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  STREETLIGHT: { bg: 'rgba(245,158,11,0.15)',  color: '#FCD34D' },
  SAFETY:      { bg: 'rgba(239,68,68,0.15)',   color: '#F87171' },
  TREE:        { bg: 'rgba(139,92,246,0.15)',  color: '#A78BFA' },
  OTHER:       { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
};

const STATUS_CONFIG = {
  OPEN:              { label: 'Open',           color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  ASSIGNED:          { label: 'Assigned',       color: '#FCD34D', bg: 'rgba(245,158,11,0.12)' },
  IN_PROGRESS:       { label: 'In Progress',    color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  ESCALATED_TO_MLA:  { label: 'Escalated→MLA',  color: '#FB923C', bg: 'rgba(249,115,22,0.12)' },
  ESCALATED_TO_MP:   { label: 'Escalated→MP',   color: '#F87171', bg: 'rgba(239,68,68,0.12)' },
  RESOLVED:          { label: 'Resolved',       color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
};

export default function IssueCard({ issue, onUpvote }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [upvoted, setUpvoted] = React.useState(issue.user_has_upvoted);
  const [upvoteCount, setUpvoteCount] = React.useState(issue.upvote_count || 0);

  const cat = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.OTHER;
  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
  const isEscalated = issue.escalated_at != null;
  const thumb = issue.issue_media?.[0]?.cdn_url;

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Please login to upvote'); return; }
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setUpvoteCount(c => wasUpvoted ? c - 1 : c + 1);
    try {
      await api.post(`/api/issues/${issue.id}/upvote`);
      onUpvote?.();
    } catch {
      setUpvoted(wasUpvoted);
      setUpvoteCount(c => wasUpvoted ? c + 1 : c - 1);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/issues/${issue.id}`;
    await navigator.share?.({ title: issue.title, url }) || navigator.clipboard.writeText(url);
    api.post(`/api/issues/${issue.id}/share`, { platform: 'COPY_LINK' }).catch(() => {});
    toast.success('Link copied!');
  };

  return (
    <div
      onClick={() => navigate(`/issues/${issue.id}`)}
      style={{
        background: 'var(--surface2)',
        border: `1px solid ${isEscalated ? 'rgba(249,115,22,0.35)' : 'var(--border)'}`,
        borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.15s, border-color 0.2s',
        marginBottom: 12
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Escalation band */}
      {isEscalated && (
        <div style={{
          padding: '7px 14px',
          background: issue.escalated_to_mp_at ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, fontWeight: 600,
          color: issue.escalated_to_mp_at ? 'var(--red2)' : 'var(--fire2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {issue.escalated_to_mp_at
              ? `Escalated to MP ${issue.mps?.name || ''}`
              : `Escalated to MLA ${issue.mlas?.name || ''}`
            }
          </div>
          {issue.sla_deadline && (
            <span>{formatDistanceToNow(new Date(issue.escalated_at), { addSuffix: true })}</span>
          )}
        </div>
      )}

      {/* Image */}
      {thumb && (
        <div style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {issue.trending_rank <= 5 && issue.trending_rank > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(239,68,68,0.85)',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 10, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 3
            }}>
              <Flame size={10} /> #{issue.trending_rank} Trending
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: cat.bg, color: cat.color
          }}>
            {issue.category}
          </span>
          <span style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: status.bg, color: status.color
          }}>
            {status.label}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
            <MapPin size={9} /> {issue.wards?.name || issue.location_label || 'Mumbai'}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600,
          color: 'var(--text)', lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {issue.title}
        </h3>

        {/* Rep tag */}
        {(issue.corporators || issue.mlas) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8, marginBottom: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)'
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0
            }}>
              {(issue.corporators?.name || issue.mlas?.name || 'R').charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>
                {isEscalated
                  ? (issue.mlas?.name || issue.mps?.name || 'Rep')
                  : issue.corporators?.name || 'Unassigned'}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                {isEscalated ? 'MLA/MP — Escalated' : 'Corporator — Assigned'}
              </div>
            </div>
            <div style={{ fontSize: 9, color: isEscalated ? 'var(--fire2)' : 'var(--text3)' }}>
              {isEscalated ? 'Not Resolved' : 'In Progress'}
            </div>
          </div>
        )}

        {/* Engagement bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleUpvote}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: upvoted ? 'var(--accent2)' : 'var(--text2)',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'color 0.15s, transform 0.1s'
            }}
          >
            <ThumbsUp size={14} fill={upvoted ? 'currentColor' : 'none'} />
            {upvoteCount.toLocaleString()}
          </button>

          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)' }}>
            <MessageSquare size={14} /> {issue.comment_count || 0}
          </span>

          <button
            onClick={handleShare}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer'
            }}
          >
            <Share2 size={14} /> Share
          </button>

          {issue.trending_score > 10 && (
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 600, color: 'var(--red2)',
              background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 6
            }}>
              <Flame size={10} /> {Math.round(issue.trending_score)}
            </div>
          )}

          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: issue.trending_score > 10 ? 0 : 'auto' }}>
            {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
