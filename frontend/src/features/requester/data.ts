import type { RequestStatus } from './types'

export const statusStyles: Record<RequestStatus, string> = {
  draft: 'bg-[#d9d8d1] text-[#5e6669]',
  pending: 'bg-[#e7ebef] text-[#5e6669]',
  approved: 'bg-[#a9b8a7] text-[#405747]',
  rejected: 'border border-[#b4423eb3] bg-[#b4423e33] text-[#8c3431]',
}

export const statusText: Record<RequestStatus, string> = {
  draft: 'ฉบับร่าง',
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
}

export const historyTone: Record<string, string> = {
  sent: 'border border-[#4f6fae] bg-[#4f6fae1f]',
  approved: 'bg-[#a9b8a7]',
  rejected: 'border border-[#b4423eb3] bg-[#b4423e33]',
}
