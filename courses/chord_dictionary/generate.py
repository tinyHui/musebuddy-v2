from __future__ import annotations

import argparse
import json
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, TypedDict


ChordDisplayTokenType = Literal[
    "root",
    "quality",
    "extension",
    "alteration",
    "addition",
    "omission",
    "bass",
    "separator",
]

ChordFamily = Literal[
    "triad",
    "seventh",
    "extended",
    "added-tone",
    "altered",
    "omitted-tone",
    "suspended",
    "slash",
]

ChordToneTendency = Literal[
    "stable",
    "context-dependent",
    "coloristic",
    "up-by-step",
    "down-by-step",
    "resolve-to-third",
    "resolve-to-root",
    "resolve-to-fifth",
    "leading-tone-up",
    "chordal-seventh-down",
    "alteration-resolves-up",
    "alteration-resolves-down",
    "alteration-resolves-by-step",
    "inward",
    "outward",
    "chromatic-neighbor",
    "bass-anchor",
    "pedal-tone",
    "omitted",
]

ToneImportance = Literal["essential", "supporting", "color", "optional"]
ComponentKind = Literal["extensions", "additions", "alterations", "omissions"]


class ChordComponentJson(TypedDict, total=False):
    value: str
    degree: str
    rawDegree: str


@dataclass(frozen=True)
class ChordComponent:
    value: str
    degree: str
    raw_degree: str | None = None

    def to_json(self) -> ChordComponentJson:
        value: ChordComponentJson = {
            "value": self.value,
            "degree": self.degree,
        }
        if self.raw_degree is not None:
            value["rawDegree"] = self.raw_degree
        return value


@dataclass(frozen=True)
class ChordTone:
    degree: str
    raw_degree: str
    pitch: str
    pitch_class: int
    semitones_from_root: int
    importance: ToneImportance
    explanation: str
    tendency: ChordToneTendency

    def to_json(self) -> dict[str, object]:
        return {
            "degree": self.degree,
            "rawDegree": self.raw_degree,
            "pitch": self.pitch,
            "pitchClass": self.pitch_class,
            "semitonesFromRoot": self.semitones_from_root,
            "importance": self.importance,
            "explanation": self.explanation,
            "tendency": self.tendency,
        }


@dataclass(frozen=True)
class ChordSpec:
    slug: str
    quality_symbol: str | None
    quality_name: str | None
    base_formula: tuple[str, ...]
    sounding_degrees: tuple[str, ...]
    family: tuple[ChordFamily, ...]
    components: dict[ComponentKind, tuple[ChordComponent, ...]] = field(default_factory=dict)
    omitted_degrees: tuple[str, ...] = ()
    suffix: str = ""
    parenthetical_values: tuple[tuple[ChordDisplayTokenType, str], ...] = ()
    slash_degree: str | None = None


ROOTS = ("C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B")
LETTER_TO_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
LETTER_ORDER = ("C", "D", "E", "F", "G", "A", "B")
MAJOR_DEGREE_SEMITONES = {
    1: 0,
    2: 2,
    3: 4,
    4: 5,
    5: 7,
    6: 9,
    7: 11,
    8: 12,
    9: 14,
    10: 16,
    11: 17,
    12: 19,
    13: 21,
}
DEGREE_NAMES = {
    "1": "root",
    "b2": "flat second",
    "2": "second",
    "#2": "sharp second",
    "b3": "minor third",
    "3": "major third",
    "4": "fourth",
    "#4": "sharp fourth",
    "b5": "diminished fifth",
    "5": "perfect fifth",
    "#5": "augmented fifth",
    "b6": "flat sixth",
    "6": "sixth",
    "bb7": "diminished seventh",
    "b7": "minor seventh",
    "7": "major seventh",
    "b9": "flat ninth",
    "9": "ninth",
    "#9": "sharp ninth",
    "11": "eleventh",
    "#11": "sharp eleventh",
    "b13": "flat thirteenth",
    "13": "thirteenth",
}
FLAT_SLUGS = {"Db": "d-flat", "Eb": "e-flat", "Gb": "g-flat", "Ab": "a-flat", "Bb": "b-flat"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MuseBuddy chord dictionary JSON files.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "output",
        help="Directory where chord JSON files will be written.",
    )
    args = parser.parse_args()

    profiles = [build_profile(root, spec) for root in ROOTS for spec in chord_specs()]
    write_profiles(profiles, args.output)
    print(f"Wrote {len(profiles)} chord profiles to {args.output}")


def chord_specs() -> tuple[ChordSpec, ...]:
    return (
        ChordSpec(
            slug="major",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5"),
            family=("triad",),
        ),
        ChordSpec(
            slug="minor",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5"),
            family=("triad",),
            suffix="m",
        ),
        ChordSpec(
            slug="diminished",
            quality_symbol="dim",
            quality_name="diminished",
            base_formula=("1", "b3", "b5"),
            sounding_degrees=("1", "b3", "b5"),
            family=("triad",),
            suffix="dim",
        ),
        ChordSpec(
            slug="augmented",
            quality_symbol="aug",
            quality_name="augmented",
            base_formula=("1", "3", "#5"),
            sounding_degrees=("1", "3", "#5"),
            family=("triad", "altered"),
            suffix="aug",
            components={"alterations": (ChordComponent("aug", "#5"),)},
        ),
        ChordSpec(
            slug="suspended-second",
            quality_symbol="sus2",
            quality_name="suspended",
            base_formula=("1", "2", "5"),
            sounding_degrees=("1", "2", "5"),
            family=("triad", "suspended"),
            suffix="sus2",
        ),
        ChordSpec(
            slug="suspended-fourth",
            quality_symbol="sus4",
            quality_name="suspended",
            base_formula=("1", "4", "5"),
            sounding_degrees=("1", "4", "5"),
            family=("triad", "suspended"),
            suffix="sus4",
        ),
        ChordSpec(
            slug="sixth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "6"),
            family=("added-tone",),
            suffix="6",
            components={"additions": (ChordComponent("6", "6"),)},
        ),
        ChordSpec(
            slug="minor-sixth",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "6"),
            family=("added-tone",),
            suffix="m6",
            components={"additions": (ChordComponent("6", "6"),)},
        ),
        ChordSpec(
            slug="dominant-seventh",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7"),
            family=("seventh",),
            suffix="7",
            components={"extensions": (ChordComponent("7", "b7"),)},
        ),
        ChordSpec(
            slug="major-seventh",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "7"),
            family=("seventh",),
            suffix="maj7",
            components={"extensions": (ChordComponent("maj7", "7"),)},
        ),
        ChordSpec(
            slug="minor-seventh",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "b7"),
            family=("seventh",),
            suffix="m7",
            components={"extensions": (ChordComponent("7", "b7"),)},
        ),
        ChordSpec(
            slug="minor-major-seventh",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "7"),
            family=("seventh",),
            suffix="mMaj7",
            components={"extensions": (ChordComponent("Maj7", "7"),)},
        ),
        ChordSpec(
            slug="half-diminished-seventh",
            quality_symbol="m7b5",
            quality_name="half-diminished",
            base_formula=("1", "b3", "b5"),
            sounding_degrees=("1", "b3", "b5", "b7"),
            family=("seventh", "altered"),
            suffix="m7b5",
            components={
                "extensions": (ChordComponent("7", "b7"),),
                "alterations": (ChordComponent("b5", "b5"),),
            },
        ),
        ChordSpec(
            slug="diminished-seventh",
            quality_symbol="dim",
            quality_name="diminished",
            base_formula=("1", "b3", "b5"),
            sounding_degrees=("1", "b3", "b5", "bb7"),
            family=("seventh", "altered"),
            suffix="dim7",
            components={"extensions": (ChordComponent("dim7", "bb7"),)},
        ),
        ChordSpec(
            slug="dominant-ninth",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7", "9"),
            family=("seventh", "extended"),
            suffix="9",
            components={"extensions": (ChordComponent("9", "9", "2"),)},
        ),
        ChordSpec(
            slug="major-ninth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "7", "9"),
            family=("seventh", "extended"),
            suffix="maj9",
            components={"extensions": (ChordComponent("maj9", "9", "2"),)},
        ),
        ChordSpec(
            slug="minor-ninth",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "b7", "9"),
            family=("seventh", "extended"),
            suffix="m9",
            components={"extensions": (ChordComponent("9", "9", "2"),)},
        ),
        ChordSpec(
            slug="dominant-thirteenth",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7", "9", "13"),
            family=("seventh", "extended"),
            suffix="13",
            components={"extensions": (ChordComponent("13", "13", "6"),)},
        ),
        ChordSpec(
            slug="major-thirteenth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "7", "9", "13"),
            family=("seventh", "extended"),
            suffix="maj13",
            components={"extensions": (ChordComponent("maj13", "13", "6"),)},
        ),
        ChordSpec(
            slug="minor-thirteenth",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "b7", "9", "11", "13"),
            family=("seventh", "extended"),
            suffix="m13",
            components={"extensions": (ChordComponent("13", "13", "6"),)},
        ),
        ChordSpec(
            slug="add-ninth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "9"),
            family=("triad", "added-tone"),
            suffix="add9",
            components={"additions": (ChordComponent("add9", "9", "2"),)},
        ),
        ChordSpec(
            slug="minor-add-ninth",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5", "9"),
            family=("triad", "added-tone"),
            suffix="madd9",
            components={"additions": (ChordComponent("add9", "9", "2"),)},
        ),
        ChordSpec(
            slug="sixth-add-ninth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "6", "9"),
            family=("added-tone",),
            suffix="6add9",
            components={"additions": (ChordComponent("6", "6"), ChordComponent("add9", "9", "2"))},
        ),
        ChordSpec(
            slug="dominant-seventh-flat-ninth",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7", "b9"),
            family=("seventh", "altered"),
            suffix="7",
            parenthetical_values=(("alteration", "b9"),),
            components={
                "extensions": (ChordComponent("7", "b7"),),
                "alterations": (ChordComponent("b9", "b9", "b2"),),
            },
        ),
        ChordSpec(
            slug="dominant-seventh-sharp-ninth",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7", "#9"),
            family=("seventh", "altered"),
            suffix="7",
            parenthetical_values=(("alteration", "#9"),),
            components={
                "extensions": (ChordComponent("7", "b7"),),
                "alterations": (ChordComponent("#9", "#9", "#2"),),
            },
        ),
        ChordSpec(
            slug="dominant-seventh-sharp-eleventh",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7", "#11"),
            family=("seventh", "altered"),
            suffix="7",
            parenthetical_values=(("alteration", "#11"),),
            components={
                "extensions": (ChordComponent("7", "b7"),),
                "alterations": (ChordComponent("#11", "#11", "#4"),),
            },
        ),
        ChordSpec(
            slug="major-no-fifth",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3"),
            family=("triad", "omitted-tone"),
            parenthetical_values=(("omission", "no5"),),
            omitted_degrees=("5",),
            components={"omissions": (ChordComponent("no5", "5"),)},
        ),
        ChordSpec(
            slug="minor-no-fifth",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3"),
            family=("triad", "omitted-tone"),
            suffix="m",
            parenthetical_values=(("omission", "no5"),),
            omitted_degrees=("5",),
            components={"omissions": (ChordComponent("no5", "5"),)},
        ),
        ChordSpec(
            slug="major-first-inversion",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5"),
            family=("triad", "slash"),
            slash_degree="3",
        ),
        ChordSpec(
            slug="major-second-inversion",
            quality_symbol=None,
            quality_name="major",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5"),
            family=("triad", "slash"),
            slash_degree="5",
        ),
        ChordSpec(
            slug="minor-first-inversion",
            quality_symbol="m",
            quality_name="minor",
            base_formula=("1", "b3", "5"),
            sounding_degrees=("1", "b3", "5"),
            family=("triad", "slash"),
            suffix="m",
            slash_degree="b3",
        ),
        ChordSpec(
            slug="dominant-seventh-third-in-bass",
            quality_symbol=None,
            quality_name="dominant",
            base_formula=("1", "3", "5"),
            sounding_degrees=("1", "3", "5", "b7"),
            family=("seventh", "slash"),
            suffix="7",
            components={"extensions": (ChordComponent("7", "b7"),)},
            slash_degree="3",
        ),
    )


def build_profile(root: str, spec: ChordSpec) -> dict[str, object]:
    bass = pitch_for_degree(root, spec.slash_degree).pitch if spec.slash_degree else None
    normalized_symbol = f"{root}{spec.suffix}{format_parenthetical(spec.parenthetical_values)}"
    if bass is not None:
        normalized_symbol = f"{normalized_symbol}/{bass}"

    tones = [
        build_tone(root, degree, spec, bass=bass, omitted=False)
        for degree in spec.sounding_degrees
    ]
    omitted_tones = [
        build_tone(root, degree, spec, bass=bass, omitted=True)
        for degree in spec.omitted_degrees
    ]
    pitch_classes = unique_pitch_classes(tone.pitch_class for tone in tones)
    root_pitch = pitch_for_degree(root, "1")

    return {
        "id": profile_id(root, spec),
        "normalizedSymbol": normalized_symbol,
        "root": root,
        "bass": bass,
        "quality": {
            "symbol": spec.quality_symbol,
            "name": spec.quality_name,
            "baseFormula": list(spec.base_formula),
        },
        "family": list(spec.family),
        "components": {
            "extensions": [
                component.to_json() for component in spec.components.get("extensions", ())
            ],
            "additions": [
                component.to_json() for component in spec.components.get("additions", ())
            ],
            "alterations": [
                component.to_json() for component in spec.components.get("alterations", ())
            ],
            "omissions": [
                component.to_json() for component in spec.components.get("omissions", ())
            ],
        },
        "displayTokens": display_tokens(root, spec, bass),
        "tones": [tone.to_json() for tone in tones],
        "omittedTones": [tone.to_json() for tone in omitted_tones],
        "midi": {
            "rootPitchClass": root_pitch.pitch_class,
            "bassPitchClass": (
                pitch_for_degree(root, spec.slash_degree).pitch_class
                if spec.slash_degree
                else None
            ),
            "pitchClasses": pitch_classes,
        },
    }


def build_tone(
    root: str,
    degree: str,
    spec: ChordSpec,
    *,
    bass: str | None,
    omitted: bool,
) -> ChordTone:
    pitch = pitch_for_degree(root, degree)
    degree_name = DEGREE_NAMES.get(degree, degree)
    importance = tone_importance(degree, spec, omitted)
    tendency = tone_tendency(degree, spec, pitch.pitch == bass, omitted)
    explanation = tone_explanation(pitch.pitch, degree, degree_name, spec, bass, omitted)

    return ChordTone(
        degree=semantic_degree(degree),
        raw_degree=raw_degree(degree),
        pitch=pitch.pitch,
        pitch_class=pitch.pitch_class,
        semitones_from_root=pitch.semitones_from_root,
        importance=importance,
        explanation=explanation,
        tendency=tendency,
    )


@dataclass(frozen=True)
class DegreePitch:
    pitch: str
    pitch_class: int
    semitones_from_root: int


def pitch_for_degree(root: str, degree: str | None) -> DegreePitch:
    if degree is None:
        raise ValueError("degree is required")

    accidental, number = split_degree(degree)
    root_letter = root[0]
    root_pc = pitch_class(root)
    root_letter_index = LETTER_ORDER.index(root_letter)
    target_letter = LETTER_ORDER[(root_letter_index + ((number - 1) % 7)) % 7]
    semitones = MAJOR_DEGREE_SEMITONES[number] + accidental
    target_pc = (root_pc + semitones) % 12
    pitch = spell_pitch(target_letter, target_pc)
    return DegreePitch(pitch=pitch, pitch_class=target_pc, semitones_from_root=semitones)


def pitch_class(pitch: str) -> int:
    pc = LETTER_TO_PC[pitch[0]]
    for accidental in pitch[1:]:
        if accidental == "#":
            pc += 1
        elif accidental == "b":
            pc -= 1
        else:
            raise ValueError(f"Unsupported pitch accidental in {pitch}")
    return pc % 12


def split_degree(degree: str) -> tuple[int, int]:
    accidental = 0
    index = 0
    while index < len(degree) and degree[index] in ("b", "#"):
        accidental += -1 if degree[index] == "b" else 1
        index += 1
    return accidental, int(degree[index:])


def spell_pitch(letter: str, target_pc: int) -> str:
    letter_pc = LETTER_TO_PC[letter]
    delta = (target_pc - letter_pc) % 12
    if delta > 6:
        delta -= 12
    if delta == 0:
        return letter
    if delta > 0:
        return f"{letter}{'#' * delta}"
    return f"{letter}{'b' * abs(delta)}"


def semantic_degree(degree: str) -> str:
    return {"2": "9", "#4": "#11"}.get(degree, degree)


def raw_degree(degree: str) -> str:
    return {"9": "2", "b9": "b2", "#9": "#2", "11": "4", "#11": "#4", "13": "6", "b13": "b6"}.get(
        degree,
        degree,
    )


def tone_importance(degree: str, spec: ChordSpec, omitted: bool) -> ToneImportance:
    if omitted:
        return "optional"
    if degree in ("1", "b3", "3", "b7", "7", "bb7"):
        return "essential"
    if degree in ("5", "b5", "#5"):
        return "supporting"
    return "color"


def tone_tendency(degree: str, spec: ChordSpec, is_bass: bool, omitted: bool) -> ChordToneTendency:
    if omitted:
        return "omitted"
    if is_bass and spec.slash_degree is not None:
        return "bass-anchor"
    if degree == "1":
        return "stable"
    if degree == "2" and "suspended" in spec.family:
        return "resolve-to-root"
    if degree == "4" and "suspended" in spec.family:
        return "resolve-to-third"
    if degree in ("3", "b3"):
        context_sensitive = any(
            family in spec.family for family in ("altered", "suspended", "slash")
        )
        return "context-dependent" if context_sensitive else "stable"
    if degree == "5":
        return "stable"
    if degree == "7":
        return "leading-tone-up"
    if degree in ("b7", "bb7"):
        return "chordal-seventh-down"
    if degree in ("#5", "#9", "#11"):
        return "alteration-resolves-up"
    if degree in ("b5", "b9", "b13"):
        return "alteration-resolves-down"
    if degree in ("9", "11", "13", "6"):
        return "coloristic"
    return "context-dependent"


def tone_explanation(
    pitch: str,
    degree: str,
    degree_name: str,
    spec: ChordSpec,
    bass: str | None,
    omitted: bool,
) -> str:
    if omitted:
        return (
            f"{pitch} is the {degree_name}, but it is omitted. "
            "Omitting it creates space and changes the chord's weight."
        )

    if degree == "1":
        explanation = f"{pitch} is the root. It names and anchors the chord."
        if bass is not None and bass != pitch:
            explanation += f" The bass is {bass}, so the root is not the lowest sounding note."
        return explanation

    if degree in ("b3", "3"):
        quality = spec.quality_name or "major"
        explanation = f"{pitch} is the {degree_name}. It defines the chord as {quality}."
    elif degree == "5":
        explanation = f"{pitch} is the {degree_name}. It reinforces the chord structure."
    elif degree in ("b7", "7", "bb7"):
        explanation = (
            f"{pitch} is the {degree_name}. It adds {seventh_color(degree)} "
            "and helps define the seventh-chord quality."
        )
    elif degree in ("2", "4") and "suspended" in spec.family:
        explanation = (
            f"{pitch} is the suspension tone. "
            "It delays or replaces the third and wants resolution in many contexts."
        )
    elif degree in ("b5", "#5", "b9", "#9", "#11", "b13"):
        explanation = (
            f"{pitch} is the {degree_name}. It creates {alteration_color(degree)} "
            "against the basic chord shape."
        )
    else:
        explanation = (
            f"{pitch} is the {degree_name}. "
            f"It adds {extension_color(degree)} without replacing the basic chord identity."
        )

    if bass == pitch:
        explanation += " It also appears in the bass."
    return explanation


def seventh_color(degree: str) -> str:
    if degree == "7":
        return "bright tension"
    if degree == "bb7":
        return "diminished tension"
    return "soft tension"


def alteration_color(degree: str) -> str:
    return {
        "b5": "dark instability",
        "#5": "wide augmented tension",
        "b9": "sharp dissonance",
        "#9": "bluesy tension",
        "#11": "bright tension",
        "b13": "dark upper color",
    }.get(degree, "chromatic tension")


def extension_color(degree: str) -> str:
    return {
        "6": "warm added color",
        "9": "open color",
        "11": "suspended color",
        "13": "broad upper color",
    }.get(semantic_degree(degree), "color")


def display_tokens(root: str, spec: ChordSpec, bass: str | None) -> list[dict[str, str]]:
    tokens: list[dict[str, str]] = [{"type": "root", "value": root}]
    suffix_tokens = suffix_display_tokens(spec.suffix)
    tokens.extend(suffix_tokens)
    if spec.parenthetical_values:
        tokens.append({"type": "separator", "value": "("})
        for index, (token_type, value) in enumerate(spec.parenthetical_values):
            if index > 0:
                tokens.append({"type": "separator", "value": ","})
            tokens.append({"type": token_type, "value": value})
        tokens.append({"type": "separator", "value": ")"})
    if bass is not None:
        tokens.append({"type": "separator", "value": "/"})
        tokens.append({"type": "bass", "value": bass})
    return tokens


def suffix_display_tokens(suffix: str) -> list[dict[str, str]]:
    if not suffix:
        return []
    if suffix.startswith("m") and suffix not in ("maj7", "maj9", "maj13"):
        remainder = suffix[1:]
        tokens = [{"type": "quality", "value": "m"}]
        if remainder:
            token_type = "addition" if remainder.startswith(("6", "add")) else "extension"
            tokens.append({"type": token_type, "value": remainder})
        return tokens
    if suffix.startswith("maj"):
        return [{"type": "extension", "value": suffix}]
    if suffix in ("dim", "aug", "sus2", "sus4"):
        token_type = "quality" if suffix in ("dim", "aug") else "quality"
        return [{"type": token_type, "value": suffix}]
    if suffix in ("6", "6add9"):
        return [{"type": "addition", "value": suffix}]
    if suffix.startswith("add") or "add" in suffix:
        return [{"type": "addition", "value": suffix}]
    return [{"type": "extension", "value": suffix}]


def format_parenthetical(values: tuple[tuple[ChordDisplayTokenType, str], ...]) -> str:
    if not values:
        return ""
    return f"({','.join(value for _, value in values)})"


def unique_pitch_classes(values: Iterable[int]) -> list[int]:
    pitch_classes: list[int] = []
    for value in values:
        if not isinstance(value, int):
            raise TypeError(f"Expected pitch class int, received {value!r}")
        if value not in pitch_classes:
            pitch_classes.append(value)
    return pitch_classes


def profile_id(root: str, spec: ChordSpec) -> str:
    value = f"{pitch_slug(root)}-{spec.slug}"
    if spec.slash_degree is not None:
        bass = pitch_for_degree(root, spec.slash_degree).pitch
        value = f"{value}-over-{pitch_slug(bass)}"
    return value


def pitch_slug(pitch: str) -> str:
    if pitch in FLAT_SLUGS:
        return FLAT_SLUGS[pitch]
    return pitch.replace("#", "-sharp").replace("b", "-flat").lower()


def write_profiles(profiles: list[dict[str, object]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for existing_file in output_dir.glob("*.json"):
        existing_file.unlink()

    for profile in profiles:
        profile_id_value = profile["id"]
        if not isinstance(profile_id_value, str):
            raise TypeError("Profile id must be a string")
        path = output_dir / f"{profile_id_value}.json"
        path.write_text(json.dumps(profile, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
