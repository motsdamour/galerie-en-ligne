'use client'

interface TopbarProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export default function Topbar({ title, subtitle, actionLabel, onAction }: TopbarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#FAFAF8',
      borderBottom: '1px solid #E8E4DF',
      padding: '24px 36px',
      margin: '0 -36px 32px -36px',
      gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        {subtitle && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#9B9B9B',
            marginBottom: 6,
            margin: '0 0 6px 0',
          }}>
            {subtitle}
          </p>
        )}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32,
          fontWeight: 500,
          fontStyle: 'italic',
          color: '#1A1A1A',
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '-0.005em',
        }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'white',
          border: '1px solid #E8E4DF',
          borderRadius: 12,
          padding: '10px 14px',
          width: 260,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: '#9B9B9B',
            flex: 1,
          }}>
            Rechercher...
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: '#9B9B9B',
            background: '#F0EDE8',
            borderRadius: 6,
            padding: '2px 6px',
          }}>
            ⌘K
          </span>
        </div>

        {/* Notification bell */}
        <button
          style={{
            position: 'relative',
            background: 'white',
            border: '1px solid #E8E4DF',
            borderRadius: 12,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          title="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{
            position: 'absolute',
            top: 9,
            right: 10,
            width: 7,
            height: 7,
            borderRadius: 999,
            background: '#8B7355',
          }} />
        </button>

        {/* Action button */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              background: '#2C2C2C',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
