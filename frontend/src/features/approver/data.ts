export const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

export const statusStyles: Record<string, string> = {
  pending: 'border-[#e0cb9b] bg-[#f4ebd8] text-[#825c1e]',
  approved: 'border-[#b9cdb8] bg-[#e5ede4] text-[#3d5f45]',
  rejected: 'border-[#e3b9b7] bg-[#f6e4e3] text-[#9e3a36]',
}
