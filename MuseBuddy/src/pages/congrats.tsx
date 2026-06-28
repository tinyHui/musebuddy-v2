import { useRouter } from 'expo-router';

import {
  PlaceholderPanel,
  PrimaryTrainingButton,
  TrainingScreenShell,
} from './training-screen-shell';

export function CongratsPage() {
  const router = useRouter();

  return (
    <TrainingScreenShell
      eyebrow="Session complete"
      footer={
        <PrimaryTrainingButton
          label="Back to home"
          onPress={() => {
            router.dismissTo('/');
          }}
          tone="success"
        />
      }
      subtitle="Today's daily piano improvisation exercise is complete."
      title="Nice work"
    >
      <PlaceholderPanel
        accent="purple"
        body="Congrats placeholder. This screen will summarize the session once the training details are built."
        title="You finished today's practice"
      />
    </TrainingScreenShell>
  );
}
