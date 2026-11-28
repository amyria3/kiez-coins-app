import { useLocalSearchParams } from 'expo-router';

import { ChatThreadView } from '../../components/ChatThreadView';

/** Route `chat/[id]`: Unterhaltung mit einer Freund:in (components/ChatThreadView.tsx) */
export default function ChatThread() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  return <ChatThreadView id={params.id} name={params.name} />;
}
