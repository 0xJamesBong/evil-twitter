// lib/api.ts
import { getSessionToken } from './auth'

export const callProtectedEndpoint = async () => {
  const token = await getSessionToken()
  if (!token) throw new Error('Not logged in')

    console.log("supabase authenticated! - token: ", token)
//   const res = await fetch('https://your-api.com/user/me', {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//   })

//   if (!res.ok) {
//     throw new Error(`API error: ${res.status}`)
//   }

//   const data = await res.json()
//   return data
}
