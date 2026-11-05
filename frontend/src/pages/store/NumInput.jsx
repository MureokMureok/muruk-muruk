import { num } from '../../utils/format.js'

// 숫자 입력칸: 쉼표를 붙여 보여주고, 숫자만 받아서 돌려준다 ("15,000" ↔ 15000)
function NumInput({ value, onChange, unit, label, disabled }) {
  return (
    <div className={`inp ${disabled ? 'lock' : ''}`}>
      <input inputMode="numeric" aria-label={label} value={num(value)} disabled={disabled} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} />
      <em>{unit}</em>
    </div>
  )
}

export default NumInput
