/**
 * 非即時同步：視窗回到前景、網路恢復時立即重新抓取，另在前景時每隔一段時間輪詢。
 * 資料以 id 作為 v-for key，重新抓取只會更新有變動的部分，不會整頁閃爍。
 */
export function useAutoRefresh(refresh: () => Promise<unknown>, { interval = 15_000 } = {}) {
  if (import.meta.server) return

  let timer: ReturnType<typeof setInterval> | undefined
  let running = false

  async function run() {
    if (running || document.visibilityState !== 'visible') return
    running = true
    try {
      await refresh()
    }
    finally {
      running = false
    }
  }

  function start() {
    stop()
    timer = setInterval(run, interval)
  }
  function stop() {
    if (timer) clearInterval(timer)
    timer = undefined
  }
  function onVisibility() {
    if (document.visibilityState === 'visible') {
      run()
      start()
    }
    else {
      stop()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', run)
    start()
  })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', run)
    stop()
  })
}
