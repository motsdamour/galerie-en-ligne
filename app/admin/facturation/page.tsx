'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

type Subscription = {
  id: string
  operator_id: string
  operator_name: string
  amount: number
  status: string
  start_date: string
  notes: string | null
}

type OperatorOption = {
  id: string
  name: string
  slug: string
}

export default function FacturationPage() {
  const { token } = useAdmin()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [form, setForm] = useState({ operator_id: '', amount: '', start_date: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/subscriptions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSubscriptions(Array.isArray(d) ? d : d.subscriptions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  function openModal() {
    if (operators.length === 0 && token) {
      fetch('/api/operators', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setOperators(d) })
        .catch(() => {})
    }
    setShowModal(true)
  }

  async function createSubscription(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          operator_id: form.operator_id,
          amount: parseFloat(form.amount),
          start_date: form.start_date,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubscriptions(prev => [data, ...prev])
        setForm({ operator_id: '', amount: '', start_date: '', notes: '' })
        setShowModal(false)
      } else {
        alert(data.error || 'Erreur')
      }
    } catch {
      alert('Erreur réseau')
    }
    setSaving(false)
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active')
  const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0)

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#9B9B9B', fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar title="Facturation" subtitle="Gestion" actionLabel="Ajouter abonnement" onAction={openModal} />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32, maxWidth: 700 }}>
        <div style={{
          background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 20,
          boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
            MRR total
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500, color: '#1A1A1A', margin: 0, lineHeight: 1 }}>
            {mrr.toFixed(0)} &euro;
          </p>
        </div>
        <div style={{
          background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 20,
          boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
            Abonnements actifs
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500, color: '#6a8b6e', margin: 0, lineHeight: 1 }}>
            {activeSubs.length}
          </p>
        </div>
        <div style={{
          background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 20,
          boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
            Revenu ce mois
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500, color: '#8B7355', margin: 0, lineHeight: 1 }}>
            {mrr.toFixed(0)} &euro;
          </p>
        </div>
      </div>

      {/* Subscriptions list */}
      <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 2fr',
          gap: 12, padding: '12px 20px', borderBottom: '1px solid #E8E4DF', background: '#FAFAF8',
        }}>
          {['Loueur', 'Montant', 'Statut', 'Début', 'Notes'].map(h => (
            <span key={h} style={{
              fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B9B9B',
            }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <p style={{ padding: 24, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Chargement...</p>
        ) : subscriptions.length === 0 ? (
          <p style={{ padding: 24, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucun abonnement.</p>
        ) : (
          subscriptions.map(sub => (
            <div key={sub.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 2fr',
              gap: 12, padding: '14px 20px', borderBottom: '1px solid #F0EDE8',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                {sub.operator_name}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#1A1A1A' }}>
                {sub.amount} &euro;/mois
              </span>
              <span style={{
                background: sub.status === 'active' ? '#e8f5e9' : '#fce4ec',
                color: sub.status === 'active' ? '#2e7d32' : '#b71c1c',
                padding: '3px 10px', borderRadius: 999,
                fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600,
                textAlign: 'center',
              }}>
                {sub.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B' }}>
                {sub.start_date ? new Date(sub.start_date).toLocaleDateString('fr-FR') : '-'}
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#6B6B6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.notes || '-'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add subscription modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24, fontStyle: 'italic',
              fontWeight: 500, color: '#1A1A1A', marginBottom: 24,
            }}>
              Nouvel abonnement
            </h3>
            <form onSubmit={createSubscription} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelStyle}>Loueur</label>
                <select
                  required
                  value={form.operator_id}
                  onChange={e => setForm(f => ({ ...f, operator_id: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8,
                    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  <option value="">Sélectionner un loueur</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Montant (EUR / mois)</label>
                <input
                  required type="number" step="0.01" min="0" placeholder="49.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8,
                    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Date de début</label>
                <input
                  required type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8,
                    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes (optionnel)</label>
                <input
                  type="text" placeholder="Notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8,
                    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 10,
                  padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', color: '#6B6B6B',
                }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving} style={{
                  background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10,
                  padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                  fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Enregistrement...' : 'Créer l\'abonnement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
