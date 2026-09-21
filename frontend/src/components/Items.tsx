import { useState } from 'react'
import { activeItems, amountWords, emptyItem, grandTotal, itemError, itemTotal, money } from '../model'
import type { Item } from '../model'
import { Icon } from './Icon'

const columns: { key: Exclude<keyof Item, 'id'>; label: string; numeric?: boolean }[] = [
  { key: 'budgetCode', label: 'Budget Code' }, { key: 'name', label: 'Name' }, { key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' }, { key: 'detail', label: 'Detail' }, { key: 'quantity', label: 'QTY', numeric: true }, { key: 'unit', label: 'Unit' }, { key: 'price', label: 'Unit Price', numeric: true },
]
export function Items({ items, onChange, remark, onRemark, onError }: { items: Item[]; onChange: (items: Item[]) => void; remark: string; onRemark: (text: string) => void; onError: (text: string) => void }) {
  const [editing, setEditing] = useState(items.at(-1)?.id)
  const total = grandTotal(items), words = amountWords(total)
  function add(item: Item) {
    const error = itemError(item)
    if (error) { onError(error); return }
    onError('')
    const existing = items.find(row => !activeItems([row]).length)
    if (existing && existing.id !== item.id) { setEditing(existing.id); return }
    const next = emptyItem(); onChange([...items, next]); setEditing(next.id)
  }
  function remove(id: string) {
    const next = items.filter(item => item.id !== id)
    if (!next.length) next.push(emptyItem())
    onChange(next); setEditing(next.at(-1)?.id); onError('')
  }
  return <section className="items-panel" aria-labelledby="items-title"><h2 id="items-title">Items / รายการสินค้า</h2><div className="table-scroll"><table className="items-table"><thead><tr><th>No.</th>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th>Net Total</th><th>Action</th></tr></thead><tbody>
    {items.map((item, index) => <tr key={item.id}><td>{editing === item.id ? <span className="row-number">{index + 1}</span> : index + 1}</td>{columns.map(column => <td key={column.key}>{editing === item.id ? <input aria-label={`${column.label} ${index + 1}`} value={item[column.key]} type={column.numeric ? 'number' : 'text'} min={column.key === 'quantity' ? '0.01' : '0'} step="0.01" onChange={e => onChange(items.map(row => row.id === item.id ? { ...row, [column.key]: e.target.value } : row))} /> : item[column.key]}</td>)}<td className="number">{money(itemTotal(item))}</td><td><div className="row-actions"><button className="icon-button" type="button" aria-label={editing === item.id ? `Add item ${index + 1}` : `Edit item ${index + 1}`} onClick={() => editing === item.id ? add(item) : setEditing(item.id)}><Icon name={editing === item.id ? 'plus' : 'edit'} /></button><button className="icon-button danger" type="button" aria-label={`Remove item ${index + 1}`} onClick={() => remove(item.id)}><Icon name="minus" /></button></div></td></tr>)}
  </tbody></table></div>
    {activeItems(items).length > 0 && <><div className="items-summary"><div className="amount-words"><p><span>ENG :</span>{words.en}</p><p><span>TH :</span>{words.th}</p></div><p className="grand-total">Grand Total / ยอดรวมสุทธิ <strong>{money(total)}</strong><b>THB</b></p></div><label className="remark-field"><span>Remark / หมายเหตุ</span><textarea placeholder="Write your remark . . . ." value={remark} onChange={e => onRemark(e.target.value)} /></label></>}
  </section>
}
