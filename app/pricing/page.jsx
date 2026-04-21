import ComingSoon from "../components/ComingSoon";

export const metadata = {
  title: "Pricing — AgentVault",
  description: "Platform subscription, modular add-ons, and usage-based agent execution.",
};

export default function PricingPage() {
  return (
    <ComingSoon
      page="Pricing"
      tagline="Platform + modules + usage. No surprises."
      description="A clear three-layer model: subscribe to the platform, add the modules you need, pay per agent run. Enterprise plans include BYOC, SSO, and dedicated support."
      items={[
        { title: "Platform subscription", body: "Starter, Team, and Enterprise tiers. All include observability, policy engine, and audit log." },
        { title: "Add-on modules",        body: "Enable Agent Registry, Evaluations, Human-in-loop, or Context Engine as you scale." },
        { title: "Usage-based runs",      body: "Per-run pricing that tracks with actual cost — token spend, tool calls, human reviews." },
        { title: "Enterprise BYOC",       body: "Bring your own compute. Deploy in your VPC. Fixed platform fee, zero usage markup." },
      ]}
    />
  );
}
