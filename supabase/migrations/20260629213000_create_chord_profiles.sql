create type public.chord_pitch as enum (
  'A',
  'A#',
  'Ab',
  'Abb',
  'B',
  'B#',
  'Bb',
  'Bbb',
  'C',
  'C#',
  'C##',
  'Cb',
  'Cbb',
  'D',
  'D#',
  'Db',
  'Dbb',
  'E',
  'E#',
  'Eb',
  'Ebb',
  'F',
  'F#',
  'F##',
  'Fb',
  'Fbb',
  'G',
  'G#',
  'Gb',
  'Gbb'
);

create type public.chord_family as enum (
  'added-tone',
  'altered',
  'extended',
  'omitted-tone',
  'seventh',
  'slash',
  'suspended',
  'triad'
);

create type public.chord_quality_name as enum (
  'augmented',
  'diminished',
  'dominant',
  'half-diminished',
  'major',
  'minor',
  'suspended'
);

create type public.chord_quality_symbol as enum (
  'aug',
  'dim',
  'm',
  'm7b5',
  'sus2',
  'sus4'
);

create type public.chord_degree as enum (
  '#11',
  '#2',
  '#4',
  '#5',
  '#9',
  '1',
  '11',
  '13',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '9',
  'b2',
  'b3',
  'b5',
  'b6',
  'b7',
  'b9',
  'b13',
  'bb7'
);

create table public.chord_profiles (
  id text primary key,
  "normalizedSymbol" text not null,
  root public.chord_pitch not null,
  bass public.chord_pitch,
  quality_symbol public.chord_quality_symbol,
  quality_name public.chord_quality_name,
  "quality_baseFormula" public.chord_degree[] not null,
  family public.chord_family[] not null,
  components_extensions jsonb not null,
  components_additions jsonb not null,
  components_alterations jsonb not null,
  components_omissions jsonb not null,
  "displayTokens" jsonb not null,
  tones jsonb not null,
  "omittedTones" jsonb not null,
  "midi_rootPitchClass" integer not null,
  "midi_bassPitchClass" integer,
  "midi_pitchClasses" integer[] not null,
  constraint chord_profiles_midi_root_pitch_class_check check (
    "midi_rootPitchClass" between 0 and 11
  ),
  constraint chord_profiles_midi_bass_pitch_class_check check (
    "midi_bassPitchClass" is null or "midi_bassPitchClass" between 0 and 11
  ),
  constraint chord_profiles_midi_pitch_classes_check check (
    cardinality("midi_pitchClasses") > 0
    and "midi_pitchClasses" <@ array[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  )
);

create index chord_profiles_normalized_symbol_idx
  on public.chord_profiles ("normalizedSymbol");

create index chord_profiles_root_idx
  on public.chord_profiles (root);

create index chord_profiles_bass_idx
  on public.chord_profiles (bass);

create index chord_profiles_family_idx
  on public.chord_profiles using gin (family);

create index chord_profiles_quality_name_idx
  on public.chord_profiles (quality_name);

create index chord_profiles_quality_base_formula_idx
  on public.chord_profiles using gin ("quality_baseFormula");

create index chord_profiles_components_extensions_idx
  on public.chord_profiles using gin (components_extensions);

create index chord_profiles_components_additions_idx
  on public.chord_profiles using gin (components_additions);

create index chord_profiles_components_alterations_idx
  on public.chord_profiles using gin (components_alterations);

create index chord_profiles_components_omissions_idx
  on public.chord_profiles using gin (components_omissions);

create index chord_profiles_display_tokens_idx
  on public.chord_profiles using gin ("displayTokens");

create index chord_profiles_tones_idx
  on public.chord_profiles using gin (tones);

create index chord_profiles_omitted_tones_idx
  on public.chord_profiles using gin ("omittedTones");

create index chord_profiles_midi_pitch_classes_idx
  on public.chord_profiles using gin ("midi_pitchClasses");

alter table public.chord_profiles enable row level security;

create policy "Chord profiles are publicly readable"
  on public.chord_profiles
  for select
  using (true);
