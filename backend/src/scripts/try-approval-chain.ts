import { getApprovalChain } from "../services/approval.service";

async function main() {
  const cases = [5000, 10000, 110000, 200000, 200001];
  for (const amount of cases) {
    const chain = await getApprovalChain(amount);
    console.log(
      `${amount.toLocaleString()} baht ->`,
      chain.map((l) => l.level_name).join(" → ")
    );
  }
  process.exit(0);
}

main();