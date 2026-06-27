import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs tintColor="#2457d6">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="music.note.list" md="music_note" />
        <NativeTabs.Trigger.Label>Note Transcribe</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="peak-sound">
        <NativeTabs.Trigger.Icon sf="waveform" md="graphic_eq" />
        <NativeTabs.Trigger.Label>Peak Sound</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="loop-sequencer">
        <NativeTabs.Trigger.Icon sf="metronome" md="music_note" />
        <NativeTabs.Trigger.Label>Rhythm Trainer</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
