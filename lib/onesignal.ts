const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID!
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!

export async function sendNotification(title: string, message: string, url: string) {
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title, fr: title },
        contents: { en: message, fr: message },
        url,
      }),
    })
    const data = await res.json()
    console.log('[OneSignal] notification sent:', data.id)
  } catch (err) {
    console.error('[OneSignal] error:', err)
  }
}
