import SolutionOnePager from "../../components/solutions/SolutionOnePager";
import { SOLUTIONS, relatedFor } from "../../components/solutions/data";

export const metadata = {
  title: `${SOLUTIONS.grc.suite} — AgentVault`,
  description: SOLUTIONS.grc.problemStatement,
};

export default function GrcSolutionPage() {
  return <SolutionOnePager data={{ ...SOLUTIONS.grc, next: relatedFor("grc") }} />;
}
