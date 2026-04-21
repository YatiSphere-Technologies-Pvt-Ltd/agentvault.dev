import ComingSoon from "../components/ComingSoon";

export const metadata = {
  title: "Company — AgentVault",
  description: "About AgentVault — the enterprise AI agent platform.",
};

export default function CompanyPage() {
  return (
    <ComingSoon
      page="Company"
      tagline="We build infrastructure, not chatbots."
      description="AgentVault exists because enterprise AI shouldn't be a pile of pilots. We give risk, engineering, and ops a shared platform — so AI can actually make it to production."
      items={[
        { title: "About",      body: "Our team, our backers, what we believe about AI in regulated enterprises." },
        { title: "Customers",  body: "Stories from banks, insurers, healthcare systems, and global ops teams." },
        { title: "Security",   body: "Our security posture, certifications, and transparency reports." },
        { title: "Contact",    body: "Sales, support, press, and partnerships." },
      ]}
    />
  );
}
