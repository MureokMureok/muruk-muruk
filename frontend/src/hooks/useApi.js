import { useCallback, useEffect, useState } from 'react'

// 화면이 열릴 때 API에서 데이터를 받아 오는 도구.
// 사용: const { data, loading, reload } = useApi(() => getCampaign(), [])
// - data: 받아 온 값 (받기 전에는 null)
// - reload(): 버튼을 누른 뒤 등 데이터를 다시 받아 올 때
// 불러오기에 실패하면 에러를 화면 쪽으로 던진다 → NetworkErrorBoundary가 "연결이 불안정해요" 화면을 보여줌
export function useApi(fetcher, deps) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const result = await load()
      setData(result)
      return result
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [load])

  useEffect(() => {
    let alive = true // 화면을 벗어난 뒤 도착한 결과는 무시
    load()
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [load])

  // 화면을 그리는 중에 던져야 바깥의 에러 처리 틀(Error Boundary)이 잡을 수 있다
  if (error) throw error

  return { data, loading, reload }
}
