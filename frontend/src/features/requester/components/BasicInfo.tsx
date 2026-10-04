import type { BasicInfo as Info } from '../../../model'
import { budgetCodesByType, budgetTypes, mainGroups } from '../../../formOptions'
import { PolishedSelect } from '../../../components/PolishedSelect'
import type { SelectOption } from '../../../components/PolishedSelect'
import { DatePicker } from '../../../components/DatePicker'

export function BasicInfo({ value, onChange }: { value: Info; onChange: (value: Info) => void }) {
  const change = (key: keyof Info, text: string) => onChange({ ...value, [key]: text })
  const budgetCodes = budgetCodesByType[value.budgetType] || []
  const changeBudgetType = (budgetType: string) => onChange({ ...value, budgetType, budgetCode: '', description: '' })
  const changeBudgetCode = (budgetCode: string) => {
    const selected = budgetCodes.find(option => option.value === budgetCode)
    onChange({ ...value, budgetCode, description: selected?.label.split(' · ').slice(1).join(' · ') || '' })
  }
  const field = (key: keyof Info, label: string, required = false, options?: SelectOption[], type = 'text') => <label className="pr-field"><span>{required && <b className="required">*</b>}{label}</span>{options ? <PolishedSelect ariaLabel={label} required={required} value={value[key]} options={options} onChange={text => change(key, text)} /> : <input aria-label={label} type={type} required={required} value={value[key]} onChange={e => change(key, e.target.value)} />}</label>
  return <section className="basic-panel bordered-panel" aria-labelledby="basic-title"><h2 id="basic-title">Purchase Requisition (PR) / ใบขอสั่งซื้อสินค้า</h2><div className="basic-grid">
    {field('job', 'Jobs Name/ชื่องาน')}
    <div className="pr-field"><span className="field-label"><label htmlFor="main-group"><b className="required">*</b>Main Group/กลุ่มสินค้าหลัก</label></span><PolishedSelect id="main-group" ariaLabel="Main Group/กลุ่มสินค้าหลัก" required numbered value={value.mainGroup} options={mainGroups} onChange={mainGroup => change('mainGroup', mainGroup)} /></div>
    <label className="pr-field"><span>Budget Type/ชนิดงบประมาณ</span><PolishedSelect ariaLabel="Budget Type/ชนิดงบประมาณ" required value={value.budgetType} options={budgetTypes} onChange={changeBudgetType} /></label>
    <div className="pr-field"><span><b className="required">*</b>Require Date/วันที่ต้องการของ</span><DatePicker ariaLabel="Require Date/วันที่ต้องการของ" required value={value.requiredDate} onChange={requiredDate => change('requiredDate', requiredDate)} /></div>
    <label className="pr-field"><span>Budget Code/งบประมาณเลขที่</span><PolishedSelect wide ariaLabel="Budget Code/งบประมาณเลขที่" disabled={!value.budgetType} required value={value.budgetCode} placeholder="<กรุณาเลือก>" options={budgetCodes} onChange={changeBudgetCode} /></label>
    {field('purpose', 'Purpose/วัตถุประสงค์')}
    {field('description', 'Budget Description')}
    {field('line', 'Line/หน่วยงาน')}
    {field('currency', 'Currency/สกุลเงิน', false, ['THB'])}
    <label className="pr-field"><span>Exchange Rate/อัตราการแลกเปลี่ยน</span><input aria-label="Currency code" value="THB" readOnly className="read-only" /><input aria-label="Currency name" value="BAHT" readOnly className="read-only" /></label>
  </div></section>
}
