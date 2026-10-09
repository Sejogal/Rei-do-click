from app.models.achievement import Achievement

ACHIEVEMENTS = {
    "first_race": ("Primeira corrida", "Completa a tua primeira corrida multiplayer"),
    "first_win": ("Primeira vitória", "Ganha a tua primeira corrida"),
    "speed_60": ("Velocista", "Atinge 60 WPM numa corrida multiplayer"),
    "speed_80": ("Relâmpago", "Atinge 80 WPM"),
    "speed_100": ("Imparável", "Atinge 100 WPM"),
    "accuracy_95": ("Preciso", "Termina uma corrida com 95% ou mais de precisão"),
    "accuracy_98": ("Cirúrgico", "Termina com 98% ou mais"),
    "level_5": ("Veterano", "Alcança o nível 5"),
    "level_10": ("Elite", "Alcança o nível 10"),
    "matches_10": ("Dedicado", "Joga 10 corridas multiplayer"),
    "matches_50": ("Viciado", "Joga 50 corridas"),
    "wins_10": ("Campeão", "Ganha 10 corridas"),
}


def check_achievements(db, user, match_result) -> list[str]:
    existing = {row.code for row in db.query(Achievement.code).filter(Achievement.user_id == user.id).all()}
    earned = set()
    if user.matches_played >= 1 and match_result.get("finished"): earned.add("first_race")
    if user.matches_won >= 1: earned.add("first_win")
    if user.matches_played >= 10: earned.add("matches_10")
    if user.matches_played >= 50: earned.add("matches_50")
    if user.matches_won >= 10: earned.add("wins_10")
    if user.level >= 5: earned.add("level_5")
    if user.level >= 10: earned.add("level_10")
    if match_result.get("finished"):
        wpm, accuracy = match_result.get("wpm", 0), match_result.get("accuracy", 0)
        if wpm >= 60: earned.add("speed_60")
        if wpm >= 80: earned.add("speed_80")
        if wpm >= 100: earned.add("speed_100")
        if accuracy >= 95: earned.add("accuracy_95")
        if accuracy >= 98: earned.add("accuracy_98")
    unlocked = sorted(earned - existing)
    db.add_all([Achievement(user_id=user.id, code=code) for code in unlocked])
    return unlocked
