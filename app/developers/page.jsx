import ComingSoon from "../components/ComingSoon";

export const metadata = {
  title: "Developers — AgentVault",
  description: "API-first platform. SDKs for TypeScript and Python. Bring your own agents.",
};

export default function DevelopersPage() {
  return (
    <ComingSoon
      page="Developers"
      tagline="API-first. Build your own agents."
      description="Every capability on AgentVault is exposed as a typed API. Use our SDKs for TypeScript and Python, or bring your own runtime via the Agent Protocol."
      items={[
        { title: "TypeScript & Python SDKs", body: "Typed clients, streaming first-class, local dev harness with replayable fixtures." },
        { title: "Architecture diagrams",    body: "Reference patterns for multi-tenant agents, retrieval pipelines, and policy enforcement." },
        { title: "Bring your own agents",    body: "Wrap any LLM or framework (LangGraph, DSPy, custom) via the Agent Protocol — same governance applies." },
        { title: "OpenAPI + MCP",            body: "Expose internal services as tools. Agents call them natively with scoped credentials and audit." },
      ]}
    />
  );
}
