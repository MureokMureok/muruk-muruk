// 가게 이름 첫 글자를 색 상자에 넣은 작은 아이콘
// m: { merchantShort, merchantColor } 또는 { short, color }
function MerchantMark({ m, size = '' }) {
  return (
    <span className={`mk ${size}`} style={{ background: m.merchantColor ?? m.color }}>
      {m.merchantShort ?? m.short}
    </span>
  )
}

export default MerchantMark
