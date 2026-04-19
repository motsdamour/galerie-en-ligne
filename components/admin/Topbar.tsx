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
      marginBottom: 32,
      gap: 16,
    }}>
      <div>
        {subtitle && (
          <p style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#9a9a97',
            marginBottom: 4,
          }}>
            {subtitle}
          </p>
        )}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 32,
          fontWeight: 500,
          fontStyle: 'italic',
          color: '#3c3c3b',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Notification bell */}
        <button
          style={{
            position: 'relative',
            background: 'white',
            border: '1px solid #f0e6e0',
            borderRadius: 999,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
          }}
          title="Notifications"
        >
          🔔
          <span style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#E98172',
          }} />
        </button>

        {/* Action button */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              background: '#E98172',
              color: 'white',
              border: 'none',
              borderRadius: 999,
              padding: '10px 24px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
