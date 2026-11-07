import { useCallback, useEffect, useRef, useState } from 'react'

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

  // 가장 최근 요청 번호. 주소가 바뀐 뒤 늦게 끝난 이전 reload가 새 결과를 덮지 않게 한다
  const latest = useRef(0)

  const reload = useCallback(async () => {
    const id = ++latest.current
    setLoading(true)
    try {
      const result = await load()
      if (id === latest.current) setData(result)
      return result
    } catch (err) {
      if (id === latest.current) setError(err)
    } finally {
      if (id === latest.current) setLoading(false)
    }
  }, [load])

  useEffect(() => {
    let alive = true // 화면을 벗어난 뒤 도착한 결과는 무시
    const id = ++latest.current
    // 같은 화면에서 주소만 바뀌면(예: 다른 쿠폰의 기록) 화면이 다시 만들어지지 않는다. 비우지 않으면 새 응답 전까지 이전 내용이 보인다
    setData(null)
    setLoading(true)
    load()
      .then((result) => {
        if (alive && id === latest.current) setData(result)
      })
      .catch((err) => {
        if (alive && id === latest.current) setError(err)
      })
      .finally(() => {
        if (alive && id === latest.current) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [load])

  // 화면을 그리는 중에 던져야 바깥의 에러 처리 틀(Error Boundary)이 잡을 수 있다
  if (error) throw error

  return { data, loading, reload }
}
