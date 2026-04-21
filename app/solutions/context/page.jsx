import SolutionOnePager from "../../components/solutions/SolutionOnePager";
import { SOLUTIONS, relatedFor } from "../../components/solutions/data";

export const metadata = {
  title: `${SOLUTIONS.context.suite} — AgentVault`,
  description: SOLUTIONS.context.problemStatement,
};

export default function ContextSolutionPage() {
  return <SolutionOnePager data={{ ...SOLUTIONS.context, next: relatedFor("context") }} />;
}
