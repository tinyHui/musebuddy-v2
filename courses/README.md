# MuseBuddy Courses

`courses/` is a Python workspace for generating MuseBuddy course materials. It is
separate from the Expo app and should stay focused on offline data generation.

Planned dictionaries:

- `chord_dictionary/`
- `rhythm_dictionary/`
- `progression_dictionary/`
- `pattern_dictionary/`

The current focus is `chord_dictionary/`.

## Chord Dictionary

Generate popular chord profiles with:

```sh
python chord_dictionary/generate.py
```

The generator writes one JSON file per chord to:

```text
courses/chord_dictionary/output/
```

Each chord JSON includes:

- stable `id` and `normalizedSymbol`
- `root`, optional slash `bass`, and `family`
- quality and symbol components
- display tokens for rendering the chord symbol
- sounding `tones` and explicit `omittedTones`
- MIDI pitch-class data
- short teaching `explanation` and enum-backed `tendency` for each tone

Output should stay deterministic, camelCase, and free of extra fields.
