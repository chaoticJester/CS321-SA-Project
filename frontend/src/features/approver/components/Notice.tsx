export function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null
  return <div className="approver-notice fixed left-1/2 top-24 z-5 flex -translate-x-1/2 items-center gap-[18px] rounded-lg border border-[#b8c4da] bg-white py-[10px] pl-[18px] pr-[14px] text-sm text-[#31456c] shadow-[0_8px_28px_#1c2f501f]" role="status">{message}<button className="border-0 bg-transparent text-xl" type="button" onClick={onClose} aria-label="ปิดการแจ้งเตือน">×</button></div>
}
