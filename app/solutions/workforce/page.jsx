import SolutionOnePager from "../../components/solutions/SolutionOnePager";
import { SOLUTIONS, relatedFor } from "../../components/solutions/data";

export const metadata = {
  title: `${SOLUTIONS.workforce.suite} — AgentVault`,
  description: SOLUTIONS.workforce.problemStatement,
};

export default function WorkforceSolutionPage() {
  return <SolutionOnePager data={{ ...SOLUTIONS.workforce, next: relatedFor("workforce") }} />;
}
