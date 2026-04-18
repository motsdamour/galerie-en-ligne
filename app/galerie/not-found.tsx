export default function GalleryNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '1.6rem',
          fontWeight: 300,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--rose)',
          marginBottom: '1.5rem',
        }}
      >
        Mots d&apos;Amour
      </p>

      <p
        style={{
          fontStyle: 'italic',
          color: 'var(--brown-muted)',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          maxWidth: '400px',
          lineHeight: 1.6,
        }}
      >
        Cette galerie n&apos;existe plus ou a expiré.
      </p>

      <a
        href="https://mots-damour.fr"
        style={{
          display: 'inline-block',
          border: '0.5px solid var(--rose)',
          color: 'var(--rose)',
          padding: '10px 28px',
          borderRadius: '20px',
          fontSize: '11px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        Retour à mots-damour.fr
      </a>
    </div>
  )
}
