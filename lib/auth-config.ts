import { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
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
        .select('slug, name')
        .eq('email', session.user.email)
        .single()
      if (data) {
        ;(session.user as any).operatorSlug = data.slug
        ;(session.user as any).operatorName = data.name
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export function auth() {
  return getServerSession(authOptions)
}
