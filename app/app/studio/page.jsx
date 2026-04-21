import './studio.css';
import StudioApp from './components/StudioApp';

export const metadata = {
  title: 'Agent Studio — AgentVault',
  description: 'Visual builder for enterprise AI agents. Compose nodes, enforce policy, run, and promote.',
};

export default function StudioPage() {
  return <StudioApp />;
}
