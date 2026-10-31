import { useCallback, useEffect, useState } from 'react'

// 화면이 열릴 때 API에서 데이터를 받아 오는 도구.
// 사용: const { data, loading, reload } = useApi(() => getCampaign(), [])
// - data: 받아 온 값 (받기 전에는 null)
// - reload(): 버튼을 누른 뒤 등 데이터를 다시 받아 올 때
export function useApi(fetcher, deps) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps)

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await load()
    setData(result)
    setLoading(false)
    return result
  }, [load])

  useEffect(() => {
    let alive = true // 화면을 벗어난 뒤 도착한 결과는 무시
    load().then((result) => {
      if (alive) {
        setData(result)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [load])

  return { data, loading, reload }
}
