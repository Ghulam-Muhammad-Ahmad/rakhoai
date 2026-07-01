const SECRET = process.env.RECAPTCHA_SECRET_KEY

// Verify a reCAPTCHA v2 ("I'm not a robot") token server-side.
// ponytail: no secret configured => skip (dev). Set RECAPTCHA_SECRET_KEY to enforce.
export async function verifyRecaptcha(token: string | null | undefined): Promise<boolean> {
  if (!SECRET) return true
  if (!token) return false

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(SECRET)}&response=${encodeURIComponent(token)}`,
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}
