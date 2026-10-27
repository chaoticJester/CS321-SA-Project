import type { Employee } from '../../../api'
import { activeItems, grandTotal, itemTotal, money, numericValue } from '../../../model'
import type { Requisition } from '../../../model'

function requiredDateLabel(value: string) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function RequestSummary({ request, employee }: { request: Requisition; employee?: Employee }) {
  const items = activeItems(request.items)
  const fields = [
    ['ชื่อรายการ (Job Name)', request.basic.job],
    ['กลุ่มสินค้าหลัก / Main Group', request.basic.mainGroup],
    ['ผู้ขอสั่งซื้อ / IT', `${employee?.full_name || '—'} / ${employee?.department || '—'}`],
    ['วันที่ต้องการใช้ (Require Date)', requiredDateLabel(request.basic.requiredDate)],
    ['Budget Type', request.basic.budgetType],
    ['Budget Code', request.basic.budgetCode],
    ['วัตถุประสงค์ (Purpose)', request.basic.purpose],
  ]

  return <section className="request-summary" aria-labelledby="detail-title">
    <h2 id="detail-title">รายละเอียดใบขอสั่งซื้อ</h2>
    <dl className="request-summary-fields">{fields.map(([label, value], index) => <div className={index === fields.length - 1 ? 'request-summary-purpose' : ''} key={label}>
      <dt>{label}</dt><dd>{value || '—'}</dd>
    </div>)}</dl>
    <div className="request-summary-table-scroll"><table className="request-summary-table">
      <colgroup><col className="request-summary-description" /><col /><col /><col /></colgroup>
      <thead><tr><th scope="col">รายละเอียดสินค้า</th><th scope="col">จำนวน</th><th scope="col">ราคาต่อหน่วย</th><th scope="col">รวม (บาท)</th></tr></thead>
      <tbody>{items.map(item => {
        const quantity = numericValue(item.quantity)
        const price = numericValue(item.price)
        return <tr key={item.id}>
          <td>{item.name}</td>
          <td className="request-summary-quantity">{Number.isFinite(quantity) ? quantity.toLocaleString('en-US', { maximumFractionDigits: 20 }) : '—'}</td>
          <td className="number">{Number.isFinite(price) ? money(price) : '—'}</td>
          <td className="number">{money(itemTotal(item))}</td>
        </tr>
      })}</tbody>
    </table></div>
    <div className="request-summary-total"><strong>ยอดรวม</strong><span><strong>{money(grandTotal(items))}</strong><span>บาท</span></span></div>
  </section>
}
