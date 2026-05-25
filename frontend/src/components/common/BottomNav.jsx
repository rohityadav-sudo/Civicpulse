import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Flame, Plus, MessageSquare, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const NAV_ITEMS = [
  { path: '/',          icon: Home,           label: 'Feed' },
  { path: '/escalated', icon: MessageSquare,  label: 'Escalated' },
  { path: '/create',    icon: Plus,           label: null, fab: true },
  { path: '/trending',  icon: Flame,          label: 'Trending' },
  { path: '/profile',   icon: User,           label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuthStore();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      display: 'flex', alignItems: 'center',
      padding: '10px 20px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      zIndex: 100
    }}>
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const active = pathname === item.path;

        if (item.fab) {
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1, display: 'flex', justifyContent: 'center',
                background: 'none', border: 'none'
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: 16,
                background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
                marginTop: -20
              }}>
                <Icon size={22} color="white" />
              </div>
            </button>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0'
            }}
          >
            <Icon
              size={20}
              color={active ? 'var(--accent)' : 'var(--text3)'}
              fill={active ? 'var(--accent)' : 'none'}
            />
            <span style={{ fontSize: 9, fontWeight: 500, color: active ? 'var(--accent)' : 'var(--text3)' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
