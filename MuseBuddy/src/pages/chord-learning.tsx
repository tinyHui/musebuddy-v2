import { useRouter } from 'expo-router';

import {
  PlaceholderPanel,
  PrimaryTrainingButton,
  TrainingScreenShell,
} from './training-screen-shell';

export function ChordLearningPage() {
  const router = useRouter();

  return (
    <TrainingScreenShell
      eyebrow="Step 1 of 3"
      footer={
        <PrimaryTrainingButton
          label="Continue"
          onPress={() => {
            router.push('/rhythm-training');
          }}
        />
      }
      subtitle="Get familiar with today's chord shape before adding movement."
      title="Chord learning"
    >
      <PlaceholderPanel
        accent="blue"
        body="Chord learning placeholder. This screen will show today's configured chord exercise."
        title="Today's chord"
      />
    </TrainingScreenShell>
  );
}
