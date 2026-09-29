import type { BasicInfo as Info } from '../model'
import { budgetCodesByType, budgetTypes, mainGroups } from '../formOptions'
import { PolishedSelect } from './PolishedSelect'
import type { SelectOption } from './PolishedSelect'

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
    {field('job', 'Jobs Name/ชื่องาน', true)}
    <div className="pr-field"><span className="field-label"><label htmlFor="main-group"><b className="required">*</b>Main Group/กลุ่มสินค้าหลัก</label><span className="field-info"><button type="button" aria-describedby="main-group-help">ⓘ Info</button><span id="main-group-help" role="tooltip">Main Group Information / ข้อมูลกลุ่มสินค้าหลัก</span></span></span><PolishedSelect id="main-group" ariaLabel="Main Group/กลุ่มสินค้าหลัก" required numbered value={value.mainGroup} options={mainGroups} onChange={mainGroup => change('mainGroup', mainGroup)} /></div>
    <label className="pr-field"><span><b className="required">*</b>Budget Type/ชนิดงบประมาณ</span><PolishedSelect ariaLabel="Budget Type/ชนิดงบประมาณ" required value={value.budgetType} options={budgetTypes} onChange={changeBudgetType} /></label>
    {field('requiredDate', 'Require Date/วันที่ต้องการของ', true, undefined, 'date')}
    <label className="pr-field"><span><b className="required">*</b>Budget Code/งบประมาณเลขที่</span><PolishedSelect wide ariaLabel="Budget Code/งบประมาณเลขที่" disabled={!value.budgetType} required value={value.budgetCode} placeholder={value.budgetType ? '<กรุณาเลือก / Please select>' : 'Select Budget Type first'} options={budgetCodes} onChange={changeBudgetCode} /></label>
    {field('purpose', 'Purpose/วัตถุประสงค์', true)}
    {field('description', 'Budget Description')}
    {field('line', 'Line/หน่วยงาน')}
    {field('currency', 'Currency/สกุลเงิน', false, ['THB'])}
    <label className="pr-field"><span>Exchange Rate/อัตราการแลกเปลี่ยน</span><input aria-label="Currency code" value="THB" readOnly className="read-only" /><input aria-label="Currency name" value="BAHT" readOnly className="read-only" /></label>
  </div></section>
}
