import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Layout>{children}</Layout>
    </AuthGuard>
  )
}
