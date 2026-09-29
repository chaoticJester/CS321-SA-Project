export const budgetTypes = ['Expense Budget', 'Investment Budget'] as const

export const budgetCodesByType: Record<string, Array<{ value: string; label: string }>> = {
  'Expense Budget': [
    { value: '26-99-1000-ACT-2-901-001-00', label: '26-99-1000-ACT-2-901-001-00 · 52020309 · Quality Month' },
    { value: '26-99-1000-ACT-2-901-002-00', label: '26-99-1000-ACT-2-901-002-00 · 52020309 · Idea Suggestion' },
    { value: '26-99-1000-ACT-2-901-003-00', label: '26-99-1000-ACT-2-901-003-00 · 52020309 · QCC Activity (Internal)' },
    { value: '26-99-1000-ACT-2-901-004-00', label: '26-99-1000-ACT-2-901-004-00 · 52020309 · QCC Activity (External)' },
    { value: '26-99-1000-ACT-2-901-005-00', label: '26-99-1000-ACT-2-901-005-00 · 52020309 · QCC (Center)' },
    { value: '26-99-1000-ACT-2-901-006-00', label: '26-99-1000-ACT-2-901-006-00 · 52020309 · QCC' },
    { value: '26-99-1000-BOO-2-901-001-00', label: '26-99-1000-BOO-2-901-001-00 · 52020109 · Book & Newspaper' },
    { value: '26-99-1000-BUS-2-901-001-00', label: '26-99-1000-BUS-2-901-001-00 · 52020109 · Bus Charge' },
    { value: 'NO BUDGET', label: 'NO BUDGET · Default budget for items without assigned budget' },
  ],
  'Investment Budget': [
    { value: '26-23-ADM-072', label: '26-23-ADM-072 · Computer Notebook Standard (New Staff)' },
    { value: '26-23-ADM-073', label: '26-23-ADM-073 · Microsoft Server CAL Device' },
    { value: '26-23-ADM-074', label: '26-23-ADM-074 · Microsoft M365 Enterprise' },
    { value: '26-23-ADM-075', label: '26-23-ADM-075 · Microsoft Teams Enterprise (MS Teams Only)' },
    { value: '26-23-ADM-076', label: '26-23-ADM-076 · Antivirus and Kace' },
    { value: 'NO BUDGET', label: 'NO BUDGET · Default budget for items without assigned budget' },
  ],
}

export const allBudgetCodes = Object.values(budgetCodesByType)
  .flat()
  .filter((option, index, options) => options.findIndex(item => item.value === option.value) === index)

export const mainGroups = [
  '1. Main Material',
  '2. Parts & Outsource',
  '3. Mold, Die, Jig, Pallet, Dolly, Cart, Machining Part',
  '4. Industrial Supply Product & Service',
  '5. Stock Supply for Production',
  '6. New Construction, Renovation & All Improvement',
  '7. Other',
  '8. General Adm',
] as const

export const documentTypes = ['Quotation', 'Ringi Sho', 'Scope of Work', 'Drawing', 'Specification Sheet', 'Invoice', 'Other'] as const

export const purchaserSections = [
  'HR PLANNING & DEVELOPMENT',
  'EDUCATION & TRAINING',
  'PERSONNEL ADMINISTRATION',
  'INFRASTRUCTURE SYSTEM',
  'GENERAL ADMINISTRATION 1',
  'PURCHASING 1 (HO)',
  'GENERAL ADMINISTRATION 2',
  'PURCHASING 2 (HO)',
] as const
