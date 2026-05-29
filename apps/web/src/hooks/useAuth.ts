import { useMutation } from '@tanstack/react-query'
import { getAntiforgeryToken, loginRequest, logoutRequest } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { token } = await getAntiforgeryToken()
      return loginRequest({ email, password }, token)
    },
    onSuccess: (data) => {
      setCsrfToken(data.antiforgeryToken)
      fetch('/api/v1/whoami', { credentials: 'include' })
        .then((r) => r.json())
        .then((d: { user?: string; role?: string }) => {
          setAuth(d.user ?? '', d.role ?? 'owner')
        })
        .catch(() => setAuth('', 'owner'))
    },
  })
}

export function useLogout() {
  const csrfToken = useAuthStore((s) => s.csrfToken)
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)

  return useMutation({
    mutationFn: async () => {
      if (!csrfToken) throw new Error('No CSRF token — cannot logout')
      await logoutRequest(csrfToken)
    },
    onSuccess: () => {
      setUnauthenticated()
      setCsrfToken(null)
    },
  })
}
