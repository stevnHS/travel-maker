// 未登入時回首頁登入，登入後導回原本要去的頁面
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (loggedIn.value) return

  useLogin().rememberRedirect(to.fullPath)
  return navigateTo('/')
})
