import type { BasicInfo as Info } from '../model'

export function BasicInfo({ value, onChange }: { value: Info; onChange: (value: Info) => void }) {
  const change = (key: keyof Info, text: string) => onChange({ ...value, [key]: text })
  const field = (key: keyof Info, label: string, required = false, options?: string[], type = 'text') => <label className="pr-field"><span>{required && <b className="required">*</b>}{label}</span>{options ? <select aria-label={label} required={required} value={value[key]} onChange={e => change(key, e.target.value)}><option value="">&lt;กรุณาเลือก&gt;</option>{options.map(option => <option key={option}>{option}</option>)}</select> : <input aria-label={label} type={type} required={required} value={value[key]} onChange={e => change(key, e.target.value)} />}</label>
  return <section className="basic-panel bordered-panel" aria-labelledby="basic-title"><h2 id="basic-title">Purchase Requisition (PR) / ใบขอสั่งซื้อสินค้า</h2><div className="basic-grid">
    {field('job', 'Jobs Name/ชื่องาน', true)}
    {field('mainGroup', 'Main Group/กลุ่มสินค้าหลัก', true, ['IT Equipment', 'Office Supplies', 'Services', 'Other'])}
    {field('budgetType', 'Budget Type/ชนิดงบประมาณ', true, ['Expense Budget', 'Capital Budget'])}
    {field('requiredDate', 'Require Date/วันที่ต้องการของ', true, undefined, 'date')}
    {field('budgetCode', 'Budget Code/งบประมาณเลขที่', true, ['26-99-2500-EDU-2-901-001-00', '26-23-ADM-088'])}
    {field('purpose', 'Purpose/วัตถุประสงค์', true)}
    {field('description', 'Budget Description')}
    {field('line', 'Line/หน่วยงาน')}
    {field('currency', 'Currency/สกุลเงิน', false, ['THB'])}
    <label className="pr-field"><span>Exchange Rate/อัตราการแลกเปลี่ยน</span><input aria-label="Currency code" value="THB" readOnly className="read-only" /><input aria-label="Currency name" value="BAHT" readOnly className="read-only" /></label>
  </div></section>
}
