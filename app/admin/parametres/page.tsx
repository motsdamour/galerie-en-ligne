'use client'

import Topbar from '@/components/admin/Topbar'

export default function ParametresPage() {
  const cardStyle: React.CSSProperties = {
    background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, padding: 24,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif",
    letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const valueStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#3c3c3b',
    background: '#fff8f5', border: '1px solid #f0e6e0', borderRadius: 6,
    padding: '10px 14px', width: '100%',
  }

  return (
    <>
      <Topbar title="Paramètres" subtitle="Compte" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
        <div style={cardStyle}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16 }}>
            Mot de passe admin
          </h3>
          <label style={labelStyle}>ADMIN_PASSWORD</label>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, color: '#9a9a97', marginBottom: 4 }}>
            Configuré via variable d&apos;environnement sur Vercel.
          </p>
          <div style={valueStyle}>••••••••</div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16 }}>
            Email Gmail notifications
          </h3>
          <label style={labelStyle}>GMAIL_USER</label>
          <div style={valueStyle}>
            {typeof window !== 'undefined' ? '(variable serveur)' : '—'}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16 }}>
            Token sync pCloud
          </h3>
          <label style={labelStyle}>PCLOUD_AUTH_TOKEN</label>
          <div style={valueStyle}>
            {typeof window !== 'undefined' ? '(variable serveur)' : '—'}
          </div>
        </div>
      </div>
    </>
  )
}
