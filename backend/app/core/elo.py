import math

K = 32


def expected_score(player_elo: int, opponent_elo: int) -> float:
    return 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))


def calculate_elo_changes(participants: list[dict]) -> dict[str, int]:
    registered = [p for p in participants if p.get("user_id")]
    count = len(registered)
    if count < 2:
        return {str(p["user_id"]): 0 for p in registered}
    totals = {str(p["user_id"]): 0.0 for p in registered}
    for i, a in enumerate(registered):
        for b in registered[i + 1:]:
            pa, pb = a.get("position"), b.get("position")
            score_a = 0.5 if pa == pb else (1.0 if pa is not None and (pb is None or pa < pb) else 0.0)
            delta = K * (score_a - expected_score(a["elo"], b["elo"])) / (count - 1)
            totals[str(a["user_id"])] += delta
            totals[str(b["user_id"])] -= delta
    result = {uid: round(value) for uid, value in totals.items()}
    for p in registered:
        uid = str(p["user_id"])
        result[uid] = max(100, p["elo"] + result[uid]) - p["elo"]
    return result


def calculate_xp(wpm: float, position: int | None, finished: bool) -> int:
    base = int(max(0, wpm) * 1.5)
    if not finished:
        return base // 2
    return base + {1: 100, 2: 60, 3: 30, 4: 15}.get(position, 0)


def xp_to_level(xp: int) -> int:
    return math.floor((math.sqrt(1 + 8 * max(0, xp) / 100) - 1) / 2) + 1
