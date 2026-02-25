import { Redirect } from 'expo-router';

// Default route for (app) group — always land on session-viewer for Step 2 testing
export default function AppIndex() {
  return <Redirect href="/(app)/session-viewer" />;
}
