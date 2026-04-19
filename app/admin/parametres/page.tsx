'use client'

import Topbar from '@/components/admin/Topbar'

export default function ParametresPage() {
  const card: React.CSSProperties = {
    background: 'white', border: '1px solid #f0e6e0', borderRadius: 14, padding: 24,
    boxShadow: '0 2px 12px -4px rgba(60,60,59,.06)',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: '#9a9a97', fontFamily: "'Poppins', sans-serif",
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, margin: '0 0 6px 0',
  }
  const fieldBox: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#3c3c3b',
    background: '#fff8f5', border: '1px solid #f0e6e0', borderRadius: 10,
    padding: '10px 14px', width: '100%',
  }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar title="Paramètres" subtitle="Compte" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
        <div style={card}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16, margin: '0 0 16px 0' }}>
            Mot de passe admin
          </h3>
          <p style={fieldLabel}>ADMIN_PASSWORD</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, color: '#9a9a97', marginBottom: 8, margin: '0 0 8px 0' }}>
            Configuré via variable d&apos;environnement sur Vercel.
          </p>
          <div style={fieldBox}>••••••••</div>
        </div>

        <div style={card}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16, margin: '0 0 16px 0' }}>
            Email Gmail notifications
          </h3>
          <p style={fieldLabel}>GMAIL_USER</p>
          <div style={fieldBox}>(variable serveur)</div>
        </div>

        <div style={card}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16, margin: '0 0 16px 0' }}>
            Token sync pCloud
          </h3>
          <p style={fieldLabel}>PCLOUD_AUTH_TOKEN</p>
          <div style={fieldBox}>(variable serveur)</div>
        </div>
      </div>
    </div>
  )
}
