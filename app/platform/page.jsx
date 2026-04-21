import ComingSoon from "../components/ComingSoon";

export const metadata = {
  title: "Platform — AgentVault",
  description: "The core platform: orchestration, context, integrations, observability, security.",
};

export default function PlatformPage() {
  return (
    <ComingSoon
      page="Platform"
      tagline="The control plane for enterprise AI."
      description="Deep dives on the orchestration engine, context + memory, tool integrations, observability, and security primitives that power every AgentVault workload."
      items={[
        { title: "Multi-agent orchestration",    body: "DAG scheduler, parallel branches, deterministic retries, and state machines that survive restarts." },
        { title: "Context + memory (RAG layer)", body: "Hybrid retrieval with row-level permissions, freshness SLAs, and a unified context API." },
        { title: "Tool & API integrations",      body: "200+ connectors with scoped credentials, OpenAPI & MCP support, and per-tool rate limits." },
        { title: "Observability & evaluation",    body: "Full run traces, evaluation harness, replay-any-execution, cost attribution." },
        { title: "Security & access control",    body: "Cedar policy-as-code, scoped secrets, network isolation, SSO / SCIM, full audit log." },
        { title: "Deploy anywhere",              body: "AgentVault Cloud, BYOC in your VPC, or on-prem Kubernetes — same runtime, same APIs." },
      ]}
    />
  );
}
