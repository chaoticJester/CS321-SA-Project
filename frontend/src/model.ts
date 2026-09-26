export type BasicInfo = {
  job: string; mainGroup: string; budgetType: string; requiredDate: string;
  budgetCode: string; purpose: string; line: string; description: string; currency: string;
}
export type Item = {
  id: string; budgetCode: string; name: string; brand: string; model: string;
  detail: string; quantity: string; unit: string; price: string;
}
export type Attachment = { id: string; file: File }
export type Requisition = {
  basic: BasicInfo; items: Item[]; attachments: Attachment[]; purchaser: string;
  remark: string; step: number; createdAt: string; reference?: string;
}
export const BUDGET = 130000
export const DRAFT_KEY = 'current-draft'
export function emptyItem(): Item {
  return { id: crypto.randomUUID(), budgetCode: '', name: '', brand: '', model: '', detail: '', quantity: '', unit: '', price: '' }
}
export function newRequisition(): Requisition {
  return { basic: { job: '', mainGroup: '', budgetType: '', requiredDate: '', budgetCode: '', purpose: '', line: '', description: '', currency: 'THB' }, items: [emptyItem()], attachments: [], purchaser: '', remark: '', step: 1, createdAt: new Date().toISOString() }
}
export const activeItems = (items: Item[]) => items.filter(item => Object.entries(item).some(([key, value]) => key !== 'id' && value.trim()))
export const money = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function numericValue(value: string) {
  const normalized = value.trim().replaceAll(',', '')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
export function itemTotal(item: Item) {
  const quantity = numericValue(item.quantity), price = numericValue(item.price)
  if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity < 0 || price < 0) return 0
  return Math.round(quantity * price * 100) / 100
}
export const grandTotal = (items: Item[]) => Math.round(items.reduce((sum, item) => sum + itemTotal(item), 0) * 100) / 100
export function itemError(item: Item) {
  if (!item.name.trim()) return 'Enter an item name / กรุณาระบุชื่อสินค้า'
  if (!item.budgetCode.trim()) return 'Enter a budget code / กรุณาระบุงบประมาณเลขที่'
  if (!item.unit.trim()) return 'Enter a unit / กรุณาระบุหน่วย'
  if (!item.quantity || !Number.isFinite(numericValue(item.quantity)) || numericValue(item.quantity) <= 0) return 'Quantity must be greater than zero.'
  if (!item.price || !Number.isFinite(numericValue(item.price)) || numericValue(item.price) < 0) return 'Enter a valid, non-negative unit price.'
  if (itemTotal(item) > 999999999) return 'The item amount exceeds the supported limit.'
  return ''
}
export function basicError(info: BasicInfo) {
  if (![info.job, info.mainGroup, info.budgetType, info.requiredDate, info.budgetCode, info.purpose].every(value => value.trim())) return 'Complete all required fields / กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
  return ''
}
export function fileError(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (!/\.(jpe?g|png|pdf)$/i.test(file.name) || !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return `${file.name}: only JPG, PNG, and PDF files are supported.`
  if (file.size > 5 * 1024 * 1024) return `${file.name}: the maximum file size is 5 MB.`
  if (!file.size) return `${file.name}: this file is empty.`
  return ''
}
// IndexedDB preserves attachment bytes with the draft; no passwords are stored.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sa-purchase-prototype', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('requisitions')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function readDraft(): Promise<Requisition | undefined> {
  const db = await database()
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('requisitions').objectStore('requisitions').get(DRAFT_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }) } finally { db.close() }
}
export async function readSubmittedRequisitions(): Promise<Requisition[]> {
  const db = await database()
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('requisitions').objectStore('requisitions').getAll()
    request.onsuccess = () => resolve((request.result as Requisition[])
      .filter(value => Boolean(value.reference))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
    request.onerror = () => reject(request.error)
  }) } finally { db.close() }
}
export async function persistRequisition(value: Requisition, submit = false) {
  const db = await database()
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('requisitions', 'readwrite')
    const store = transaction.objectStore('requisitions')
    store.put(value, submit ? value.reference! : DRAFT_KEY)
    if (submit) store.delete(DRAFT_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  }) } finally { db.close() }
}
const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
function englishNumber(n: number): string {
  if (n < 20) return ones[n]
  if (n < 100) return ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '')
  for (const [size, label] of [[1000000, 'million'], [1000, 'thousand'], [100, 'hundred']] as const) {
    if (n >= size) return englishNumber(Math.floor(n / size)) + ' ' + label + (n % size ? ' ' + englishNumber(n % size) : '')
  }
  return ''
}
function thaiNumber(n: number): string {
  if (!n) return 'ศูนย์'
  if (n >= 1000000) return thaiNumber(Math.floor(n / 1000000)) + 'ล้าน' + (n % 1000000 ? thaiNumber(n % 1000000) : '')
  const digits = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'], places = ['','สิบ','ร้อย','พัน','หมื่น','แสน']
  return String(n).split('').map((v, i, a) => {
    const d = Number(v), p = a.length - i - 1
    if (!d) return ''
    if (p === 1) return (d === 1 ? '' : d === 2 ? 'ยี่' : digits[d]) + 'สิบ'
    if (p === 0 && d === 1 && a.length > 1) return 'เอ็ด'
    return digits[d] + places[p]
  }).join('')
}
export function amountWords(value: number) {
  const cents = Math.round(value * 100), whole = Math.floor(cents / 100), fraction = cents % 100
  const en = englishNumber(whole) + ' baht' + (fraction ? ' and ' + englishNumber(fraction) + ' satang' : ' only')
  return { en: en.charAt(0).toUpperCase() + en.slice(1), th: thaiNumber(whole) + 'บาท' + (fraction ? thaiNumber(fraction) + 'สตางค์' : 'ถ้วน') }
}
