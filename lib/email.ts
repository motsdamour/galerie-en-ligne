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
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `🎉 Nouvelle galerie créée — ${event.couple_name}`,
    html: `
      <h2>Nouvelle galerie Mots d'Amour</h2>
      <p><strong>Événement :</strong> ${event.couple_name}</p>
      <p><strong>Lien :</strong> https://galerie.mots-damour.fr/galerie/${event.slug}</p>
      <p><strong>Mot de passe :</strong> ${event.password_plain}</p>
      <p>Transmettez ces informations aux mariés !</p>
    `
  })
}
