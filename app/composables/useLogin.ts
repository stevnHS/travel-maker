/** 導向 LINE 登入，登入完成後回到 redirect 指定的頁面 */
export function useLogin() {
  const redirectCookie = useCookie<string | null>(AUTH_REDIRECT_COOKIE, { maxAge: 600, sameSite: 'lax' })

  function rememberRedirect(path: string) {
    redirectCookie.value = path
  }

  function login(redirect?: string) {
    if (redirect) rememberRedirect(redirect)
    return navigateTo('/auth/line', { external: true })
  }

  return { login, rememberRedirect }
}
