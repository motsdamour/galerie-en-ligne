import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase'

declare module 'next-auth' {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
      operatorSlug?: string
      operatorName?: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const db = supabaseAdmin()
      const { data } = await db
        .from('operators')
        .select('id')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()
      return !!data
    },
    async session({ session }) {
      if (!session.user?.email) return session
      const db = supabaseAdmin()
      const { data } = await db
        .from('operators')
        .select('slug, name, logo_url')
        .eq('email', session.user.email)
        .single()
      if (data) {
        session.user.operatorSlug = data.slug
        session.user.operatorName = data.name
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
