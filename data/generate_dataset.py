"""Generate a synthetic social-media privacy assessment dataset.

The records contain only fictional settings and derived risk values. They do
not contain names, handles, contact details, passwords, or exact locations.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path

SEED = 42
ROWS = 1000
OUTPUT = Path(__file__).with_name("social_media_privacy_assessments.csv")


def risk_level(score: int) -> str:
    if score <= 20:
        return "LOW"
    if score <= 40:
        return "MODERATE"
    if score <= 70:
        return "HIGH"
    return "CRITICAL"


def weighted(values: list[int], weight: float) -> float:
    return (sum(values) / len(values)) * weight


def make_record(index: int, rng: random.Random) -> dict[str, object]:
    public = lambda probability=0.35: rng.random() < probability
    control = lambda probability=0.55: rng.random() < probability

    profile_visibility = rng.choices(
        ["public", "friends", "private"], weights=[35, 50, 15]
    )[0]
    posts_visibility = rng.choices(
        ["public", "friends", "private"], weights=[30, 55, 15]
    )[0]
    profile_score = {
        "public": 100,
        "friends": 45,
        "private": 5,
    }[profile_visibility]
    profile = [profile_score, 100 if public(0.28) else 0]

    row: dict[str, object] = {
        "profile_id": f"synthetic-{index:04d}",
        "profile_visibility": profile_visibility,
        "phone_public": public(0.18),
        "email_public": public(0.24),
        "birthday_public": public(0.38),
        "location_public": public(0.28),
        "workplace_public": public(0.42),
        "education_public": public(0.38),
        "relationship_public": public(0.25),
        "posts_public": posts_visibility,
        "location_tagging": public(0.32),
        "travel_posts": public(0.27),
        "unknown_connections": rng.choice(["often", "sometimes", "rarely"]),
        "tag_review_enabled": control(0.58),
        "third_party_apps_reviewed": control(0.54),
        "mfa_enabled": control(0.62),
        "login_alerts_enabled": control(0.63),
        "password_reuse_reported": not control(0.78),
        "suspicious_link_awareness": rng.choice(["high", "medium", "low"]),
        "old_posts_reviewed": control(0.43),
        "privacy_settings_reviewed": control(0.39),
    }

    personal = [
        100 if row["phone_public"] else 0,
        100 if row["email_public"] else 0,
        100 if row["birthday_public"] else 0,
        100 if row["workplace_public"] else 0,
        100 if row["education_public"] else 0,
        100 if row["relationship_public"] else 0,
    ]
    location = [
        100 if row["location_public"] else 0,
        100 if row["location_tagging"] else 0,
        100 if row["travel_posts"] else 0,
    ]
    content = [
        {"public": 100, "friends": 45, "private": 5}[posts_visibility],
        0 if row["old_posts_reviewed"] else 100,
    ]
    connections = {"often": 100, "sometimes": 55, "rarely": 10}[
        row["unknown_connections"]
    ]
    tagging = 0 if row["tag_review_enabled"] else 100
    account = [
        0 if row["mfa_enabled"] else 100,
        0 if row["login_alerts_enabled"] else 100,
        100 if row["password_reuse_reported"] else 0,
    ]
    apps = [
        0 if row["third_party_apps_reviewed"] else 100,
        100 if not row["third_party_apps_reviewed"] else 0,
    ]
    social = [
        {"high": 0, "medium": 50, "low": 100}[row["suspicious_link_awareness"]],
        100 if row["unknown_connections"] == "often" else 25,
    ]
    footprint = [
        0 if row["old_posts_reviewed"] else 100,
        0 if row["privacy_settings_reviewed"] else 100,
    ]

    score = round(
        weighted(profile, 0.10)
        + weighted(personal, 0.15)
        + weighted(location, 0.15)
        + weighted(content, 0.10)
        + connections * 0.10
        + tagging * 0.05
        + weighted(account, 0.15)
        + weighted(apps, 0.05)
        + weighted(social, 0.10)
        + weighted(footprint, 0.05)
    )
    row["risk_score"] = score
    row["risk_level"] = risk_level(score)
    return row


def main() -> None:
    rng = random.Random(SEED)
    rows = [make_record(index + 1, rng) for index in range(ROWS)]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} synthetic records to {OUTPUT}")


if __name__ == "__main__":
    main()