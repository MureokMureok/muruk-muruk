import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSearchKeywords, logSearch, searchProducts } from '../../api/api.js'
import Icon from '../../components/Icon.jsx'
import StatusView from '../../components/StatusView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { won } from '../../utils/format.js'
import { addRecent, clearRecent, getAutosave, getRecent, highlight, matches, removeRecent, setAutosave } from '../../utils/search.js'

// 홈 카테고리와 같은 목록 (검색 첫 화면의 추천 카테고리)
const CATEGORIES = ['꽃·식물', '제철 과일', '수산물', '농산물', '반찬']

// 정렬 (쇼핑 앱 검색 결과의 랭킹순·가격순과 같은 방식)
const SORTS = {
  rec: { label: '추천순', fn: (a, b) => b.coupons - a.coupons || b.sold - a.sold }, // 쿠폰 많이 받는 상품 먼저
  low: { label: '낮은 가격순', fn: (a, b) => a.price - b.price },
  high: { label: '높은 가격순', fn: (a, b) => b.price - a.price },
  sold: { label: '구매 많은순', fn: (a, b) => b.sold - a.sold },
}

// 검색어와 일치한 글자만 진하게 (여러 단어면 단어마다)
function Hl({ text, q }) {
  let parts = [{ text, hit: false }]
  for (const w of q.trim().split(/\s+/).filter(Boolean)) {
    parts = parts.flatMap((p) => (p.hit ? [p] : highlight(p.text, w)))
  }
  return parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))
}

// 입력하는 동안: 자동완성 (가게·상품·업종·태그 중 일치하는 말)
function Suggest({ input, words, onPick, onFill }) {
  const list = words.filter((w) => matches(w, input)).slice(0, 8)
  return (
    <ul className="suggest">
      {list.length === 0 && (
        <li>
          <button className="pick" onClick={() => onPick(input)}>
            <Icon name="search" size={16} />
            <span>‘{input.trim()}’ 검색하기</span>
          </button>
        </li>
      )}
      {list.map((w) => (
        <li key={w}>
          <button className="pick" onClick={() => onPick(w)}>
            <Icon name="search" size={16} />
            <span>
              <Hl text={w} q={input} />
            </span>
          </button>
          {/* 검색하지 않고 입력칸에만 넣기 (이어서 더 입력할 때) */}
          <button className="fill" aria-label={`${w} 입력칸에 넣기`} onClick={() => onFill(w)}>
            ↖
          </button>
        </li>
      ))}
    </ul>
  )
}

// 검색어가 비어 있을 때: 최근 검색어 · 많이 찾는 검색어 · 카테고리
function SearchHome({ recent, setRecent, popular, onPick }) {
  const [autosave, setAuto] = useState(getAutosave())

  function toggleAutosave() {
    setAutosave(!autosave)
    setAuto(!autosave)
  }

  return (
    <>
      <section className="grp">
        <div className="sec-h">
          <h2 className="sm">최근 검색어</h2>
          {recent.length > 0 && (
            <button className="link" onClick={() => setRecent(clearRecent())}>
              전체 삭제
            </button>
          )}
        </div>
        {!autosave ? (
          <p className="cap">검색어 저장 기능이 꺼져 있어요</p>
        ) : recent.length === 0 ? (
          <p className="cap">최근 검색어가 없어요</p>
        ) : (
          <div className="rchips">
            {recent.map((r) => (
              <span className="rchip" key={r}>
                <button onClick={() => onPick(r)}>{r}</button>
                <button className="x" aria-label={`${r} 지우기`} onClick={() => setRecent(removeRecent(r))}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <button className="cap" style={{ alignSelf: 'flex-end' }} onClick={toggleAutosave}>
          자동저장 {autosave ? '끄기' : '켜기'}
        </button>
      </section>

      {popular.length > 0 && (
        <section className="grp">
          <div className="sec-h">
            <h2 className="sm">많이 찾는 검색어</h2>
          </div>
          <ol className="rank">
            {popular.map((w, i) => (
              <li key={w}>
                <button onClick={() => onPick(w)}>
                  <i>{i + 1}</i>
                  {w}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="grp">
        <div className="sec-h">
          <h2 className="sm">카테고리</h2>
        </div>
        <div className="chs">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => onPick(c)}>
              {c}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

// 검색 결과 (주소 ?q=검색어 기준)
function Results({ q, popular, onPick }) {
  const { data } = useApi(() => searchProducts(q), [q])
  const [sort, setSort] = useState('rec')
  const [only, setOnly] = useState(false) // 쿠폰 받는 상품만
  if (!data) return null

  // 검색 결과가 아예 없을 때: 무엇이 없는지 → 다시 찾는 방법 → 다른 검색어
  if (data.length === 0) {
    return (
      <>
        <StatusView kind="search" top title={`‘${q}’에 대한 검색 결과가 없어요`} />
        <ul className="tips">
          <li>단어의 철자가 맞는지 확인해 주세요</li>
          <li>단어 수를 줄이거나 다른 말로 검색해 보세요</li>
          <li>초성으로도 찾을 수 있어요 (예: ㄱㄱ → 감귤)</li>
        </ul>
        <section className="grp">
          <h3 className="h4">이런 검색어는 어때요</h3>
          <div className="chs">
            {popular.slice(0, 5).map((w) => (
              <button key={w} onClick={() => onPick(w)}>
                {w}
              </button>
            ))}
          </div>
        </section>
      </>
    )
  }

  const list = data.filter((p) => !only || p.coupons > 0).sort(SORTS[sort].fn)
  return (
    <>
      <p className="sr-head">
        <b>‘{q}’</b> 검색 결과 <em>{list.length}</em>개
      </p>
      <div className="sr-tools">
        <button className={`fchip ${only ? 'on' : ''}`} aria-pressed={only} onClick={() => setOnly(!only)}>
          {only && <Icon name="check" size={14} />}쿠폰 받는 상품만
        </button>
        <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
          {Object.entries(SORTS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {list.length === 0 && <p className="cap center">이 검색어로는 지금 쿠폰을 받는 상품이 없어요</p>}
      {list.map((p) => (
        <Link className="sr" key={p.merchantId} to={`/campaign/buy/${p.merchantId}`}>
          <div className="shopimg sr-im">상품 이미지</div>
          <div className="sr-b">
            <span className="cap">
              <Hl text={p.merchantName} q={q} /> · <Hl text={p.merchantCategory} q={q} />
            </span>
            <span className="sr-name">
              <Hl text={p.name} q={q} />
            </span>
            <b className="sr-price">{won(p.price)}</b>
            {p.coupons > 0 ? (
              <span className="sr-cp">
                구매하면 다른 가게 쿠폰 {p.coupons}장 · 최대 {won(p.couponTotal)} 할인
              </span>
            ) : (
              <span className="cap">지금은 받는 쿠폰이 없어요</span>
            )}
          </div>
        </Link>
      ))}
    </>
  )
}

// 가게·상품 검색 (쇼핑 앱 검색 방식: 최근 검색어 → 입력하면 자동완성 → 결과·정렬·필터, 결과 없음 안내)
// 로그인 없이 쓸 수 있다. 검색어는 주소(?q=)에 남아서 뒤로 가기로 이전 검색 결과에 돌아간다
function SearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [input, setInput] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  const [recent, setRecent] = useState(getRecent())
  const inputRef = useRef(null)
  const { data: kw } = useApi(() => getSearchKeywords(), [])

  // 주소의 검색어가 바뀌면(뒤로 가기 등) 입력칸도 그 검색어로 (화면 그릴 때 바로 맞추는 React 권장 방식)
  if (q !== prevQ) {
    setPrevQ(q)
    setInput(q)
  }

  function go(term) {
    const t = term.trim()
    if (!t) return
    setRecent(addRecent(t))
    logSearch(t)
    setParams({ q: t }) // 주소가 바뀌면서 검색 결과로 (뒤로 가기 기록에도 남음)
    setInput(t)
    inputRef.current?.blur() // 휴대폰 키보드 닫기
  }

  const typing = input.trim() !== '' && input.trim() !== q
  const empty = input.trim() === ''

  return (
    <div className="phone-app">
      <header className="topb">
        <button className="bk" aria-label="뒤로" onClick={() => navigate(-1)}>
          <Icon name="back" size={18} />
        </button>
        <form
          className="search grow"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            go(input)
          }}
        >
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoFocus={!q}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="가게·상품 검색"
            aria-label="검색어"
          />
          {input && (
            <button
              type="button"
              className="clear"
              aria-label="검색어 지우기"
              onClick={() => {
                setInput('')
                inputRef.current?.focus()
              }}
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </form>
      </header>
      <main className="ct">
        {typing ? (
          <Suggest input={input} words={kw?.suggestions ?? []} onPick={go} onFill={(w) => { setInput(w); inputRef.current?.focus() }} />
        ) : empty ? (
          <SearchHome recent={recent} setRecent={setRecent} popular={kw?.popular ?? []} onPick={go} />
        ) : (
          <Results key={q} q={q} popular={kw?.popular ?? []} onPick={go} />
        )}
      </main>
    </div>
  )
}

export default SearchPage
