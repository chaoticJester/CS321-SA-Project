import { getApprovalChain, createApprovalLog, getNextApprover } from "../services/approval.service";

async function main() {
  const chain = await getApprovalChain(110000);
  await createApprovalLog("PR0001", chain);
  console.log("สร้าง log ครบแล้ว:", chain.length, "แถว");

  const next = await getNextApprover("PR0001");
  console.log("คิวถัดไปที่ต้องอนุมัติ:", next);
  process.exit(0);
}

main();