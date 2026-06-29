from __future__ import annotations

import json
import os
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any, TypeAlias, get_args

import click
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, Text, create_engine
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, ENUM, insert
from sqlalchemy.orm import DeclarativeBase, Session

COURSES_DIR = Path(__file__).resolve().parents[1]
if str(COURSES_DIR) not in sys.path:
    sys.path.insert(0, str(COURSES_DIR))

from chord_dictionary import generate


DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "output"
ENV_PATH = COURSES_DIR / ".env"

JsonObject: TypeAlias = dict[str, Any]


class Base(DeclarativeBase):
    pass


def enum_type(name: str, values: Iterable[str]) -> ENUM:
    return ENUM(*sorted(values), name=name, schema="public", create_type=False)


CHORD_FAMILY_VALUES = set(get_args(generate.ChordFamily))
CHORD_DISPLAY_TOKEN_TYPE_VALUES = set(get_args(generate.ChordDisplayTokenType))
CHORD_TONE_IMPORTANCE_VALUES = set(get_args(generate.ToneImportance))
CHORD_TONE_TENDENCY_VALUES = set(get_args(generate.ChordToneTendency))
CHORD_COMPONENT_KIND_VALUES = set(get_args(generate.ComponentKind))


def generated_profiles() -> list[JsonObject]:
    return [
        generate.build_profile(root, spec)
        for root in generate.ROOTS
        for spec in generate.chord_specs()
    ]


def values_from_profiles(profiles: Iterable[JsonObject], *paths: str) -> set[str]:
    values: set[str] = set()
    for profile in profiles:
        for path in paths:
            value: Any = profile
            for key in path.split("."):
                if not isinstance(value, dict):
                    raise TypeError(f"Expected object while reading generated value path {path}")
                value = value[key]
            if value is not None:
                if not isinstance(value, str):
                    raise TypeError(f"Expected string at generated value path {path}")
                values.add(value)
    return values


def pitch_values_from_profiles(profiles: Iterable[JsonObject]) -> set[str]:
    values: set[str] = set()
    for profile in profiles:
        for key in ("root", "bass"):
            value = profile[key]
            if value is not None:
                if not isinstance(value, str):
                    raise TypeError(f"Expected string at generated value path {key}")
                values.add(value)
        for key in ("tones", "omittedTones"):
            tones = profile[key]
            if not isinstance(tones, list):
                raise TypeError(f"Expected list at generated value path {key}")
            for index, tone in enumerate(tones):
                if not isinstance(tone, dict):
                    raise TypeError(f"Expected object at generated value path {key}[{index}]")
                pitch = tone["pitch"]
                if not isinstance(pitch, str):
                    raise TypeError(f"Expected string at generated value path {key}[{index}].pitch")
                values.add(pitch)
    return values


REFERENCE_PROFILES = generated_profiles()
CHORD_PITCH_VALUES = pitch_values_from_profiles(REFERENCE_PROFILES)
CHORD_QUALITY_NAME_VALUES = values_from_profiles(REFERENCE_PROFILES, "quality.name")
CHORD_QUALITY_SYMBOL_VALUES = values_from_profiles(REFERENCE_PROFILES, "quality.symbol")
CHORD_DEGREE_VALUES = {
    *generate.DEGREE_NAMES.keys(),
    *(generate.semantic_degree(value) for value in generate.DEGREE_NAMES.keys()),
    *(generate.raw_degree(value) for value in generate.DEGREE_NAMES.keys()),
}


class ChordProfile(Base):
    __tablename__ = "chord_profiles"
    __table_args__ = {"schema": "public"}

    id = Column(Text, primary_key=True)
    normalizedSymbol = Column("normalizedSymbol", Text, nullable=False)
    root = Column(enum_type("chord_pitch", CHORD_PITCH_VALUES), nullable=False)
    bass = Column(enum_type("chord_pitch", CHORD_PITCH_VALUES), nullable=True)
    quality_symbol = Column(
        enum_type("chord_quality_symbol", CHORD_QUALITY_SYMBOL_VALUES),
        nullable=True,
    )
    quality_name = Column(
        enum_type("chord_quality_name", CHORD_QUALITY_NAME_VALUES),
        nullable=True,
    )
    quality_baseFormula = Column(
        "quality_baseFormula",
        ARRAY(enum_type("chord_degree", CHORD_DEGREE_VALUES)),
        nullable=False,
    )
    family = Column(
        ARRAY(enum_type("chord_family", CHORD_FAMILY_VALUES)),
        nullable=False,
    )
    components_extensions = Column(JSONB, nullable=False)
    components_additions = Column(JSONB, nullable=False)
    components_alterations = Column(JSONB, nullable=False)
    components_omissions = Column(JSONB, nullable=False)
    displayTokens = Column("displayTokens", JSONB, nullable=False)
    tones = Column(JSONB, nullable=False)
    omittedTones = Column("omittedTones", JSONB, nullable=False)
    midi_rootPitchClass = Column("midi_rootPitchClass", Integer, nullable=False)
    midi_bassPitchClass = Column("midi_bassPitchClass", Integer, nullable=True)
    midi_pitchClasses = Column("midi_pitchClasses", ARRAY(Integer), nullable=False)


def expect_object(value: Any, context: str) -> JsonObject:
    if not isinstance(value, dict):
        raise ValueError(f"{context} must be an object")
    return value


def expect_list(value: Any, context: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{context} must be a list")
    return value


def expect_str(value: Any, context: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{context} must be a string")
    return value


def expect_optional_str(value: Any, context: str) -> str | None:
    if value is None:
        return None
    return expect_str(value, context)


def expect_int(value: Any, context: str) -> int:
    if not isinstance(value, int):
        raise ValueError(f"{context} must be an integer")
    return value


def validate_enum(value: str | None, allowed_values: set[str], context: str) -> None:
    if value is None:
        return
    if value not in allowed_values:
        expected = ", ".join(sorted(allowed_values))
        raise ValueError(f"{context} has unsupported value {value!r}; expected one of: {expected}")


def validate_degree_list(values: list[Any], context: str) -> list[str]:
    degrees = [expect_str(value, f"{context}[{index}]") for index, value in enumerate(values)]
    for degree in degrees:
        validate_enum(degree, CHORD_DEGREE_VALUES, context)
    return degrees


def validate_pitch_class(value: int | None, context: str) -> None:
    if value is not None and not 0 <= value <= 11:
        raise ValueError(f"{context} must be between 0 and 11")


def validate_components(components: JsonObject) -> None:
    missing = CHORD_COMPONENT_KIND_VALUES - set(components)
    if missing:
        raise ValueError(f"components is missing keys: {', '.join(sorted(missing))}")
    for kind in CHORD_COMPONENT_KIND_VALUES:
        items = expect_list(components[kind], f"components.{kind}")
        for index, item in enumerate(items):
            component = expect_object(item, f"components.{kind}[{index}]")
            expect_str(component.get("value"), f"components.{kind}[{index}].value")
            validate_enum(
                expect_str(component.get("degree"), f"components.{kind}[{index}].degree"),
                CHORD_DEGREE_VALUES,
                f"components.{kind}[{index}].degree",
            )
            raw_degree = expect_optional_str(
                component.get("rawDegree"),
                f"components.{kind}[{index}].rawDegree",
            )
            validate_enum(raw_degree, CHORD_DEGREE_VALUES, f"components.{kind}[{index}].rawDegree")


def validate_display_tokens(tokens: list[Any]) -> None:
    for index, item in enumerate(tokens):
        token = expect_object(item, f"displayTokens[{index}]")
        validate_enum(
            expect_str(token.get("type"), f"displayTokens[{index}].type"),
            CHORD_DISPLAY_TOKEN_TYPE_VALUES,
            f"displayTokens[{index}].type",
        )
        expect_str(token.get("value"), f"displayTokens[{index}].value")


def validate_tones(tones: list[Any], context: str) -> None:
    for index, item in enumerate(tones):
        tone = expect_object(item, f"{context}[{index}]")
        validate_enum(
            expect_str(tone.get("degree"), f"{context}[{index}].degree"),
            CHORD_DEGREE_VALUES,
            f"{context}[{index}].degree",
        )
        validate_enum(
            expect_str(tone.get("rawDegree"), f"{context}[{index}].rawDegree"),
            CHORD_DEGREE_VALUES,
            f"{context}[{index}].rawDegree",
        )
        validate_enum(
            expect_str(tone.get("pitch"), f"{context}[{index}].pitch"),
            CHORD_PITCH_VALUES,
            f"{context}[{index}].pitch",
        )
        pitch_class = expect_int(tone.get("pitchClass"), f"{context}[{index}].pitchClass")
        validate_pitch_class(pitch_class, f"{context}[{index}].pitchClass")
        expect_int(tone.get("semitonesFromRoot"), f"{context}[{index}].semitonesFromRoot")
        validate_enum(
            expect_str(tone.get("importance"), f"{context}[{index}].importance"),
            CHORD_TONE_IMPORTANCE_VALUES,
            f"{context}[{index}].importance",
        )
        expect_str(tone.get("explanation"), f"{context}[{index}].explanation")
        validate_enum(
            expect_str(tone.get("tendency"), f"{context}[{index}].tendency"),
            CHORD_TONE_TENDENCY_VALUES,
            f"{context}[{index}].tendency",
        )


def load_profile(path: Path) -> dict[str, Any]:
    try:
        profile = expect_object(json.loads(path.read_text(encoding="utf-8")), str(path))
        profile_id = expect_str(profile.get("id"), f"{path}.id")
        if profile_id != path.stem:
            raise ValueError(f"{path}.id must match file name stem {path.stem!r}")

        normalized_symbol = expect_str(profile.get("normalizedSymbol"), f"{path}.normalizedSymbol")
        root = expect_str(profile.get("root"), f"{path}.root")
        bass = expect_optional_str(profile.get("bass"), f"{path}.bass")
        validate_enum(root, CHORD_PITCH_VALUES, f"{path}.root")
        validate_enum(bass, CHORD_PITCH_VALUES, f"{path}.bass")

        quality = expect_object(profile.get("quality"), f"{path}.quality")
        quality_symbol = expect_optional_str(quality.get("symbol"), f"{path}.quality.symbol")
        quality_name = expect_optional_str(quality.get("name"), f"{path}.quality.name")
        validate_enum(quality_symbol, CHORD_QUALITY_SYMBOL_VALUES, f"{path}.quality.symbol")
        validate_enum(quality_name, CHORD_QUALITY_NAME_VALUES, f"{path}.quality.name")
        quality_base_formula = validate_degree_list(
            expect_list(quality.get("baseFormula"), f"{path}.quality.baseFormula"),
            f"{path}.quality.baseFormula",
        )

        family = [
            expect_str(value, f"{path}.family[{index}]")
            for index, value in enumerate(expect_list(profile.get("family"), f"{path}.family"))
        ]
        for value in family:
            validate_enum(value, CHORD_FAMILY_VALUES, f"{path}.family")

        components = expect_object(profile.get("components"), f"{path}.components")
        validate_components(components)

        display_tokens = expect_list(profile.get("displayTokens"), f"{path}.displayTokens")
        validate_display_tokens(display_tokens)

        tones = expect_list(profile.get("tones"), f"{path}.tones")
        omitted_tones = expect_list(profile.get("omittedTones"), f"{path}.omittedTones")
        validate_tones(tones, f"{path}.tones")
        validate_tones(omitted_tones, f"{path}.omittedTones")

        midi = expect_object(profile.get("midi"), f"{path}.midi")
        root_pitch_class = expect_int(midi.get("rootPitchClass"), f"{path}.midi.rootPitchClass")
        bass_pitch_class_value = midi.get("bassPitchClass")
        bass_pitch_class = (
            None
            if bass_pitch_class_value is None
            else expect_int(bass_pitch_class_value, f"{path}.midi.bassPitchClass")
        )
        pitch_classes = [
            expect_int(value, f"{path}.midi.pitchClasses[{index}]")
            for index, value in enumerate(
                expect_list(midi.get("pitchClasses"), f"{path}.midi.pitchClasses")
            )
        ]
        validate_pitch_class(root_pitch_class, f"{path}.midi.rootPitchClass")
        validate_pitch_class(bass_pitch_class, f"{path}.midi.bassPitchClass")
        for index, value in enumerate(pitch_classes):
            validate_pitch_class(value, f"{path}.midi.pitchClasses[{index}]")

        return {
            "id": path.stem,
            "normalizedSymbol": normalized_symbol,
            "root": root,
            "bass": bass,
            "quality_symbol": quality_symbol,
            "quality_name": quality_name,
            "quality_baseFormula": quality_base_formula,
            "family": family,
            "components_extensions": components["extensions"],
            "components_additions": components["additions"],
            "components_alterations": components["alterations"],
            "components_omissions": components["omissions"],
            "displayTokens": display_tokens,
            "tones": tones,
            "omittedTones": omitted_tones,
            "midi_rootPitchClass": root_pitch_class,
            "midi_bassPitchClass": bass_pitch_class,
            "midi_pitchClasses": pitch_classes,
        }
    except json.JSONDecodeError as error:
        raise ValueError(f"{path} is not valid JSON: {error}") from error


def load_profiles(output_dir: Path) -> list[dict[str, Any]]:
    paths = sorted(output_dir.glob("*.json"))
    if not paths:
        raise click.ClickException(f"No JSON files found in {output_dir}")
    return [load_profile(path) for path in paths]


def upsert_profiles(database_url: str, rows: list[dict[str, Any]]) -> None:
    engine = create_engine(database_url)
    table = ChordProfile.__table__
    statement = insert(table).values(rows)
    update_values = {
        column.name: statement.excluded[column.name]
        for column in table.columns
        if column.name != "id"
    }
    statement = statement.on_conflict_do_update(
        index_elements=[table.c.id],
        set_=update_values,
    )
    with Session(engine) as session:
        session.execute(statement)
        session.commit()


@click.command()
@click.option(
    "--output-dir",
    type=click.Path(path_type=Path, file_okay=False, dir_okay=True, exists=True),
    default=DEFAULT_OUTPUT_DIR,
    show_default=True,
    help="Directory containing generated chord profile JSON files.",
)
@click.option(
    "--database-url",
    envvar="SUPABASE_DATABASE_URL",
    help="Supabase Postgres SQLAlchemy URL. Defaults to SUPABASE_DATABASE_URL.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Validate input files and print a summary without opening a database connection.",
)
def main(output_dir: Path, database_url: str | None, dry_run: bool) -> None:
    load_dotenv(ENV_PATH)
    database_url = database_url or os.environ.get("SUPABASE_DATABASE_URL")

    try:
        rows = load_profiles(output_dir)
    except ValueError as error:
        raise click.ClickException(str(error)) from error

    if dry_run:
        click.echo(f"Validated {len(rows)} chord profiles from {output_dir}")
        return

    if not database_url:
        raise click.ClickException(
            "SUPABASE_DATABASE_URL is required. Set it in courses/.env or pass --database-url."
        )

    upsert_profiles(database_url, rows)
    click.echo(f"Upserted {len(rows)} chord profiles from {output_dir}")


if __name__ == "__main__":
    main()
