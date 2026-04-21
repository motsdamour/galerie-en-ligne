import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendNewGalleryEmail(event: {
  couple_name: string
  slug: string
  password_plain: string
  edit_token: string
  couple_email: string | null
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const galleryUrl = `https://galerie-en-ligne.fr/galerie/${event.slug}`
  const editorUrl = `${galleryUrl}?edit_token=${event.edit_token}`

  // Email admin
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `Nouvelle galerie — ${event.couple_name}`,
    html: `
      <h2>Nouvelle galerie</h2>
      <p><strong>Couple :</strong> ${event.couple_name}</p>
      <p><strong>Lien invites :</strong> <a href="${galleryUrl}">${galleryUrl}</a></p>
      <p><strong>Mot de passe :</strong> ${event.password_plain}</p>
      <p><strong>Lien editeur :</strong> <a href="${editorUrl}">${editorUrl}</a></p>
      ${event.couple_email ? `<p><strong>Email maries :</strong> ${event.couple_email}</p>` : ''}
    `
  })

  // Email aux mariés si adresse renseignée
  if (event.couple_email) {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: event.couple_email,
      subject: `Votre galerie est prete !`,
      html: `
        <h2>Votre galerie de souvenirs</h2>
        <p>Bonjour ${event.couple_name},</p>
        <p>Votre galerie de souvenirs est prete !</p>
        <h3>Lien a partager a vos invites</h3>
        <p><a href="${galleryUrl}">${galleryUrl}</a></p>
        <p><strong>Mot de passe :</strong> ${event.password_plain}</p>
        <h3>Votre lien editeur (personnel)</h3>
        <p>Ce lien vous permet de masquer des videos/photos de la galerie :</p>
        <p><a href="${editorUrl}">${editorUrl}</a></p>
        <p><em>Ne partagez pas ce lien — il est reserve aux maries.</em></p>
        <br>
        <p>Galerie en ligne</p>
      `
    })
  }
}
