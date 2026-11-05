import { getBurden } from '../../api/api.js'
import { getUser } from '../../auth/mockAuth.js'
import { useApi } from '../../hooks/useApi.js'
import { mdhm, shortTx, won } from '../../utils/format.js'
import { SproutLoading } from '../../components/SproutLoading.jsx'

// 쉼표·따옴표로 칸이 밀리지 않게 감싸고, 가게 이름이 엑셀 수식으로 실행되지 않게 앞에 '를 붙인다
function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// 사용 내역을 CSV 파일로 내려받기 (엑셀에서 한글이 깨지지 않게 앞에 BOM 표시를 붙임)
function downloadCsv(rows) {
  const head = ['날짜', '쿠폰 ID', '손님', '어디서 온 손님', '결제 금액', '할인', 'tx 해시']
  const lines = rows.map((r) => [mdhm(r.at), `#${r.tokenId}`, r.customer, r.source, r.amount, r.discount, r.tx].map(csvCell).join(','))
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '할인부담내역.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

// M4 할인 부담 내역 (목업 v3 가맹점 센터) — 예전 "정산" 화면을 대신함
// [확정] 충전금 없음: 우리 가게 쿠폰이 실제로 쓰였을 때만 할인 부담이 기록된다. 실제 돈 이동은 이번 범위 밖
function StoreBurden() {
  const user = getUser()
  const { data: b } = useApi(() => getBurden(user.merchantId), [user.merchantId])
  if (!b) return <SproutLoading delay />

  return (
    <>
      <div className="ph1">
        <div className="tt">
          <h1>할인 부담 내역</h1>
          <p>우리 가게 쿠폰이 실제로 쓰였을 때만 기록돼요. 실제 정산(돈 이동)은 이번 범위 밖이에요</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <small>할인 부담</small>
          <b>{won(b.burden)}</b>
          <span>쿠폰 {b.usedCount}장 사용</span>
        </div>
        <div className="stat hl">
          <small>쿠폰으로 생긴 매출</small>
          <b>{won(b.sales)}</b>
          <span>쿠폰을 쓴 결제 금액 합계</span>
        </div>
        <div className="stat">
          <small>새로 온 손님</small>
          <b>{b.newCustomers}명</b>
          <span>우리 가게 첫 구매 고객</span>
        </div>
      </div>
      {b.usedCount > 0 && (
        <div className="nb ok">
          할인 {won(b.burden)}으로 매출 {won(b.sales)}과 새 손님 {b.newCustomers}명이 생겼어요
        </div>
      )}
      <section className="card">
        <div className="hd">
          <h2>사용 내역</h2>
          <button className="btn g sm" disabled={b.rows.length === 0} onClick={() => downloadCsv(b.rows)}>
            CSV 내려받기
          </button>
        </div>
        {b.rows.length === 0 ? (
          <p className="empty">아직 우리 가게에서 사용된 쿠폰이 없어요</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>쿠폰 ID</th>
                  <th>손님</th>
                  <th>어디서 온 손님</th>
                  <th className="num">결제 금액</th>
                  <th className="num">할인</th>
                  <th>tx 해시</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{mdhm(r.at)}</td>
                    <td className="mono">#{r.tokenId}</td>
                    <td>{r.customer}</td>
                    <td>
                      <span className="chip">{r.source}</span>
                    </td>
                    <td className="num">{won(r.amount)}</td>
                    <td className="num">{won(r.discount)}</td>
                    <td className="mono" title={r.tx}>
                      {shortTx(r.tx)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export default StoreBurden
