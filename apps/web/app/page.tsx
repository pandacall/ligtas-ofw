import { Chat } from "./components/chat/Chat";

// The chat is the whole Surface — the agency check and the job-post scan are things the
// conversation does, not separate pages to choose between (ADR-0005).
export default function HomePage() {
  return <Chat />;
}
