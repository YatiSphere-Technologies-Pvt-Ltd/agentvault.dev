import SolutionOnePager from "../../components/solutions/SolutionOnePager";
import { SOLUTIONS, relatedFor } from "../../components/solutions/data";

export const metadata = {
  title: `${SOLUTIONS.govern.suite} — AgentVault`,
  description: SOLUTIONS.govern.problemStatement,
};

export default function GovernSolutionPage() {
  return <SolutionOnePager data={{ ...SOLUTIONS.govern, next: relatedFor("govern") }} />;
}
