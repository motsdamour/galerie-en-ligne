export default function GalleryNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAF8',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '1.6rem',
          fontWeight: 500,
          fontStyle: 'italic',
          fontFamily: "'Playfair Display', serif",
          color: '#1A1A1A',
          marginBottom: '1.5rem',
        }}
      >
        Galerie en ligne
      </p>

      <p
        style={{
          fontStyle: 'italic',
          color: '#6B6B6B',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          maxWidth: '400px',
          lineHeight: 1.6,
        }}
      >
        Cette galerie n&apos;existe plus ou a expiré.
      </p>

      <a
        href="https://galerie-en-ligne.fr"
        style={{
          display: 'inline-block',
          border: '0.5px solid #2C2C2C',
          color: '#2C2C2C',
          padding: '10px 28px',
          borderRadius: '8px',
          fontSize: '11px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        Retour à galerie-en-ligne.fr
      </a>
    </div>
  )
}
