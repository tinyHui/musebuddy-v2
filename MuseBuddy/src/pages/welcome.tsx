import { useRouter } from 'expo-router';

import {
  PlaceholderPanel,
  PrimaryTrainingButton,
  TrainingScreenShell,
} from './training-screen-shell';

export function WelcomePage() {
  const router = useRouter();

  return (
    <TrainingScreenShell
      eyebrow="Daily exercise"
      footer={
        <PrimaryTrainingButton
          label="Start today's training"
          onPress={() => {
            router.push('/chord-learning');
          }}
        />
      }
      subtitle="A focused piano improvisation practice session for today."
      title="MuseBuddy"
    >
      <PlaceholderPanel
        accent="purple"
        body="Warm up with today's chord shape, lock in the rhythm, then use both ideas in a short jam."
        title="Practice path"
      />
    </TrainingScreenShell>
  );
}
