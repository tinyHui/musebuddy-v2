import { useRouter } from 'expo-router';

import {
  PlaceholderPanel,
  PrimaryTrainingButton,
  TrainingScreenShell,
} from './training-screen-shell';

export function JamSessionPage() {
  const router = useRouter();

  return (
    <TrainingScreenShell
      eyebrow="Step 3 of 3"
      footer={
        <PrimaryTrainingButton
          label="End session"
          onPress={() => {
            router.push('/congrats');
          }}
        />
      }
      subtitle="Use today's chord and rhythm as the frame for your improvisation."
      title="Jam session"
    >
      <PlaceholderPanel
        accent="green"
        body="Jam session placeholder. This screen will guide the final improvisation exercise."
        title="Play freely"
      />
    </TrainingScreenShell>
  );
}
