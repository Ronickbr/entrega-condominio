import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, LoaderCircle, LogIn, PackageCheck } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { defaultPathFor } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { SignupForm } from '@/components/auth/SignupForm'

const DEMO_ACCOUNTS: Array<{ label: string; email: string; password: string }> = [
  { label: 'Admin (SUPER_ADMIN)', email: 'admin@condominio.dev', password: 'admin' },
  { label: 'Síndico (SYNDIC)', email: 'sindico@condominio.dev', password: 'sindico' },
  { label: 'Porteiro (DOORMAN)', email: 'porteiro@condominio.dev', password: 'porteiro' },
  { label: 'Recepção (RECEPTIONIST)', email: 'recepcao@condominio.dev', password: 'recepcao' },
  { label: 'Moradora Ana', email: 'ana@condominio.dev', password: 'morador1' },
]

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const { isReady, isAuthenticated, role, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  if (isReady && isAuthenticated) {
    return <Navigate to={from ?? defaultPathFor(role)} replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) {
      toast.error('Falha no login', {
        description: 'E-mail ou senha inválidos. Verifique e tente novamente.',
      })
      return
    }
    toast.success('Login realizado com sucesso')
    navigate(from ?? '/', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(0,0%,9%)] p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(4,84%,56%)] text-white">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[hsl(0,0%,93%)]">Gestão de Encomendas</h1>
            <p className="mt-1 text-sm text-[hsl(0,0%,60%)]">Acesse com sua conta do condomínio</p>
          </div>
        </div>

        {mode === 'login' && (
          <>
            <Card className="border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <CardHeader>
                <CardTitle className="text-[hsl(0,0%,93%)]">Entrar</CardTitle>
                <CardDescription className="text-[hsl(0,0%,60%)]">Use o e-mail e a senha cadastrados.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-[hsl(0,0%,80%)]">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[hsl(0,0%,80%)]">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-medium text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)]"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} data-primary-mobile="true" className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
                    {submitting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-[hsl(0,0%,60%)]">
              Ainda não tem conta?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-[hsl(4,84%,56%)] hover:underline"
              >
                Cadastre-se como morador
              </button>
            </p>
          </>
        )}

        {mode === 'signup' && <SignupForm onBack={() => setMode('login')} />}

        {mode === 'forgot' && <ForgotPassword onBack={() => setMode('login')} />}

        {mode === 'login' && (
          <Card className="border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <CardHeader>
              <CardTitle className="text-lg text-[hsl(0,0%,93%)]">Contas de demonstração</CardTitle>
              <CardDescription className="text-[hsl(0,0%,60%)]">Clique para preencher os dados de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email)
                    setPassword(acc.password)
                  }}
                  className="flex items-center justify-between rounded-md border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(0,0%,18%)]"
                >
                  <span className="font-medium text-[hsl(0,0%,93%)]">{acc.label}</span>
                  <span className="text-xs text-[hsl(0,0%,50%)]">{acc.email}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    setSubmitting(false)
    setSent(true)
  }

  return (
    <Card className="border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
      <CardHeader>
        <CardTitle className="text-[hsl(0,0%,93%)]">Esqueci minha senha</CardTitle>
        <CardDescription className="text-[hsl(0,0%,60%)]">
          Informe seu e-mail e enviaremos um link para redefinir a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-[hsl(0,0%,60%)]">
            Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.
          </p>
        ) : (
          <form onSubmit={handleReset} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fp-email" className="text-[hsl(0,0%,80%)]">E-mail</Label>
              <Input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Enviar link'}
            </Button>
          </form>
        )}
        <Button type="button" variant="ghost" onClick={onBack} className="mt-2 w-full text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o login
        </Button>
      </CardContent>
    </Card>
  )
}
