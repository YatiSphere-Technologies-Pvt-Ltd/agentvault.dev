import SolutionOnePager from "../../components/solutions/SolutionOnePager";
import { SOLUTIONS, relatedFor } from "../../components/solutions/data";

export const metadata = {
  title: `${SOLUTIONS.kyc.suite} — AgentVault`,
  description: SOLUTIONS.kyc.problemStatement,
};

export default function KycSolutionPage() {
  return <SolutionOnePager data={{ ...SOLUTIONS.kyc, next: relatedFor("kyc") }} />;
}
