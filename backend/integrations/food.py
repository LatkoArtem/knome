"""
Food nutrition lookup:
1. Built-in DB — fast, offline, covers common Ukrainian/international foods
2. Open Food Facts — fallback for anything not in the built-in DB
"""
import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0
_HEADERS = {"User-Agent": "Knome/1.0 (personal health tracker)"}

# ── Built-in nutrition DB (kcal, protein, fat, carbs per 100g) ──────────────
# Sources: USDA FoodData Central, Ukrainian nutritional tables
_BUILT_IN: dict[str, tuple[float, float, float, float]] = {
    # Grains / крупи
    "гречка": (343, 13.3, 3.4, 71.5),
    "buckwheat": (343, 13.3, 3.4, 71.5),
    "рис": (344, 6.7, 0.7, 78.9),
    "rice": (344, 6.7, 0.7, 78.9),
    "вівсянка": (389, 16.9, 6.9, 66.3),
    "oatmeal": (389, 16.9, 6.9, 66.3),
    "oats": (389, 16.9, 6.9, 66.3),
    "макарони": (371, 13.0, 1.5, 74.9),
    "pasta": (371, 13.0, 1.5, 74.9),
    "хліб": (265, 9.0, 3.2, 49.0),
    "bread": (265, 9.0, 3.2, 49.0),
    "кукурудзяна каша": (328, 8.3, 1.2, 73.7),
    "пшоно": (348, 11.5, 3.3, 69.3),
    "perlovka": (324, 9.3, 1.1, 73.7),
    "перловка": (324, 9.3, 1.1, 73.7),

    # Proteins / білки
    "курка": (165, 31.0, 3.6, 0.0),
    "chicken": (165, 31.0, 3.6, 0.0),
    "куряча грудка": (165, 31.0, 3.6, 0.0),
    "chicken breast": (165, 31.0, 3.6, 0.0),
    "яйце": (155, 13.0, 11.0, 1.1),
    "egg": (155, 13.0, 11.0, 1.1),
    "яйця": (155, 13.0, 11.0, 1.1),
    "eggs": (155, 13.0, 11.0, 1.1),
    "свинина": (242, 16.0, 21.7, 0.0),
    "pork": (242, 16.0, 21.7, 0.0),
    "яловичина": (250, 26.0, 15.5, 0.0),
    "beef": (250, 26.0, 15.5, 0.0),
    "риба": (206, 20.0, 13.5, 0.0),
    "fish": (206, 20.0, 13.5, 0.0),
    "лосось": (208, 20.4, 13.4, 0.0),
    "salmon": (208, 20.4, 13.4, 0.0),
    "тунець": (144, 23.7, 5.2, 0.0),
    "tuna": (144, 23.7, 5.2, 0.0),
    "котлета": (252, 14.6, 18.0, 9.4),
    "ковбаса": (300, 12.0, 25.0, 3.0),
    "sausage": (300, 12.0, 25.0, 3.0),

    # Dairy / молочні
    "молоко": (61, 3.2, 3.2, 4.8),
    "milk": (61, 3.2, 3.2, 4.8),
    "кефір": (56, 4.3, 3.2, 4.1),
    "кисломолочний сир": (121, 14.0, 5.0, 3.5),
    "творог": (121, 14.0, 5.0, 3.5),
    "cottage cheese": (98, 11.1, 4.3, 3.4),
    "сир": (402, 23.0, 29.0, 0.0),
    "cheese": (402, 23.0, 29.0, 0.0),
    "йогурт": (61, 5.0, 3.3, 3.2),
    "yogurt": (61, 5.0, 3.3, 3.2),
    "сметана": (206, 2.8, 20.0, 3.2),
    "масло": (748, 0.9, 82.5, 0.1),
    "butter": (748, 0.9, 82.5, 0.1),

    # Vegetables / овочі
    "картопля": (87, 2.0, 0.1, 20.1),
    "potato": (87, 2.0, 0.1, 20.1),
    "морква": (41, 0.9, 0.2, 9.6),
    "carrot": (41, 0.9, 0.2, 9.6),
    "помідор": (18, 0.9, 0.2, 3.9),
    "tomato": (18, 0.9, 0.2, 3.9),
    "огірок": (16, 0.7, 0.1, 3.6),
    "cucumber": (16, 0.7, 0.1, 3.6),
    "цибуля": (40, 1.1, 0.1, 9.3),
    "onion": (40, 1.1, 0.1, 9.3),
    "капуста": (25, 1.3, 0.1, 5.8),
    "cabbage": (25, 1.3, 0.1, 5.8),
    "буряк": (43, 1.6, 0.2, 9.6),
    "beet": (43, 1.6, 0.2, 9.6),
    "перець": (31, 1.0, 0.3, 6.0),
    "pepper": (31, 1.0, 0.3, 6.0),
    "часник": (149, 6.4, 0.5, 33.1),
    "garlic": (149, 6.4, 0.5, 33.1),

    # Fruits / фрукти
    "банан": (89, 1.1, 0.3, 22.8),
    "banana": (89, 1.1, 0.3, 22.8),
    "яблуко": (52, 0.3, 0.2, 14.0),
    "apple": (52, 0.3, 0.2, 14.0),
    "апельсин": (47, 0.9, 0.1, 11.8),
    "orange": (47, 0.9, 0.1, 11.8),
    "мандарин": (53, 0.8, 0.2, 13.3),
    "груша": (57, 0.4, 0.1, 15.2),
    "pear": (57, 0.4, 0.1, 15.2),
    "виноград": (67, 0.6, 0.4, 17.2),
    "grape": (67, 0.6, 0.4, 17.2),
    "суниця": (33, 0.7, 0.3, 7.7),
    "strawberry": (33, 0.7, 0.3, 7.7),
    "кавун": (30, 0.6, 0.2, 7.6),
    "watermelon": (30, 0.6, 0.2, 7.6),

    # Common dishes / страви
    "борщ": (40, 1.8, 1.4, 5.2),
    "suп": (35, 2.0, 1.2, 4.5),
    "soup": (35, 2.0, 1.2, 4.5),
    "омлет": (184, 10.9, 14.8, 1.9),
    "omelette": (184, 10.9, 14.8, 1.9),
    "omelet": (184, 10.9, 14.8, 1.9),
    "вареники": (197, 7.0, 2.8, 36.4),
    "піца": (266, 11.0, 10.4, 33.0),
    "pizza": (266, 11.0, 10.4, 33.0),
    "гамбургер": (295, 17.0, 14.0, 24.0),
    "burger": (295, 17.0, 14.0, 24.0),
    "салат": (15, 1.3, 0.2, 2.9),
    "salad": (15, 1.3, 0.2, 2.9),

    # Drinks / напої
    "кава": (2, 0.3, 0.0, 0.0),
    "coffee": (2, 0.3, 0.0, 0.0),
    "чай": (1, 0.0, 0.0, 0.2),
    "tea": (1, 0.0, 0.0, 0.2),
    "сік": (46, 0.5, 0.1, 11.3),
    "juice": (46, 0.5, 0.1, 11.3),

    # Sweets / солодке
    "шоколад": (546, 5.4, 31.3, 59.4),
    "chocolate": (546, 5.4, 31.3, 59.4),
    "торт": (350, 5.0, 15.0, 50.0),
    "cake": (350, 5.0, 15.0, 50.0),
    "печиво": (480, 6.7, 20.0, 70.0),
    "cookies": (480, 6.7, 20.0, 70.0),
    "морозиво": (207, 3.5, 11.0, 23.6),
    "ice cream": (207, 3.5, 11.0, 23.6),
    "мед": (304, 0.3, 0.0, 82.4),
    "honey": (304, 0.3, 0.0, 82.4),

    # Other common / інше
    "суші": (140, 5.2, 2.8, 23.9),
    "sushi": (140, 5.2, 2.8, 23.9),
    "роли": (140, 5.2, 2.8, 23.9),
    "rolls": (140, 5.2, 2.8, 23.9),
    "горіхи": (607, 20.0, 54.0, 14.0),
    "nuts": (607, 20.0, 54.0, 14.0),
    "чіпси": (536, 7.0, 35.0, 53.0),
    "chips": (536, 7.0, 35.0, 53.0),
    "арахіс": (567, 25.8, 49.2, 16.1),
    "peanut": (567, 25.8, 49.2, 16.1),
    "авокадо": (160, 2.0, 14.7, 8.5),
    "avocado": (160, 2.0, 14.7, 8.5),
}


_UA_SPLIT = re.compile(r"\s+(?:з|зі|і|та|and|with|&|,)\s+", re.IGNORECASE)


def _lookup_one(token: str) -> Optional[tuple]:
    """Look up a single food token against the built-in DB."""
    t = token.lower().strip()
    if not t:
        return None

    # 1. Exact match
    if t in _BUILT_IN:
        return _BUILT_IN[t]

    # 2. Substring match
    for key, vals in _BUILT_IN.items():
        if key in t or t in key:
            return vals

    # 3. Stem match — first 4 chars (handles Ukrainian/Russian declension)
    if len(t) >= 4:
        stem = t[:4]
        for key, vals in _BUILT_IN.items():
            if key.startswith(stem):
                return vals

    return None


def _lookup_builtin(query: str) -> Optional[dict]:
    """
    Looks up nutrition for a food query, handling:
    - Exact / substring / stem matches
    - Compound foods (e.g. 'гречка з куркою' → average of гречка + курка)
    """
    # Try the full query first
    result = _lookup_one(query)
    if result:
        kcal, prot, fat, carbs = result
        return {"name": query, "calories_per_100g": kcal, "protein_per_100g": prot,
                "fat_per_100g": fat, "carbs_per_100g": carbs, "source": "builtin"}

    # Split compound foods and average components
    components = _UA_SPLIT.split(query)
    if len(components) > 1:
        found = [_lookup_one(c) for c in components]
        found = [f for f in found if f is not None]
        if found:
            avg = tuple(round(sum(v[i] for v in found) / len(found), 1) for i in range(4))
            kcal, prot, fat, carbs = avg
            return {"name": query, "calories_per_100g": kcal, "protein_per_100g": prot,
                    "fat_per_100g": fat, "carbs_per_100g": carbs, "source": "builtin"}

    return None


def _is_relevant(product_name: str, query: str) -> bool:
    """Check if the OFF product name is relevant to our query."""
    if not product_name:
        return False
    q_words = set(query.lower().split())
    p_words = set(product_name.lower().split())
    return bool(q_words & p_words)  # at least one word in common


async def _search_off(query: str) -> Optional[dict]:
    """Search Open Food Facts with name relevance filter."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
            resp = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "json": "1",
                    "page_size": 8,
                    "fields": "product_name,product_name_en,nutriments",
                },
            )
            if resp.status_code != 200 or not resp.content:
                return None
            data = resp.json()
    except Exception as exc:
        logger.debug("OFF search failed for '%s': %s", query, exc)
        return None

    for product in data.get("products", []):
        name = (product.get("product_name") or product.get("product_name_en") or "").strip()
        if not _is_relevant(name, query):
            continue

        n = product.get("nutriments", {})
        kcal = n.get("energy-kcal_100g")
        if not kcal:
            kj = n.get("energy_100g") or n.get("energy-kj_100g")
            if kj:
                kcal = float(kj) / 4.184
        if not kcal or float(kcal) <= 0:
            continue

        return {
            "name": name or query,
            "calories_per_100g": round(float(kcal), 1),
            "protein_per_100g":  round(float(n.get("proteins_100g")     or n.get("proteins")     or 0), 1),
            "fat_per_100g":      round(float(n.get("fat_100g")          or n.get("fat")          or 0), 1),
            "carbs_per_100g":    round(float(n.get("carbohydrates_100g") or n.get("carbohydrates") or 0), 1),
            "source": "openfoodfacts",
        }
    return None


async def search_food(query: str) -> Optional[dict]:
    """
    Look up nutrition data for a food item.
    1. Checks built-in DB (fast, offline)
    2. Falls back to Open Food Facts API
    Returns per-100g nutrients, or None if not found.
    """
    result = _lookup_builtin(query)
    if result:
        return result
    return await _search_off(query)


_DEFAULT_PORTIONS: dict[str, int] = {
    "soup": 300, "борщ": 300, "suп": 300,
    "drink": 250, "juice": 250, "milk": 250, "coffee": 150, "кава": 150,
    "bread": 60, "хліб": 60,
    "banana": 120, "банан": 120,
    "apple": 150, "яблуко": 150,
    "egg": 60, "яйце": 60, "яйця": 60,
}


def estimate_portion(food_name: str, text: str) -> int:
    """Estimate portion size in grams from text. Defaults to 200g."""
    m = re.search(r"(\d+)\s*(?:г\b|гр\b|грам|g\b|gram)", text.lower())
    if m:
        return int(m.group(1))
    food_lower = food_name.lower()
    for key, portion in _DEFAULT_PORTIONS.items():
        if key in food_lower:
            return portion
    return 200


def calculate_nutrients(per_100g: dict, grams: int) -> dict:
    """Scale per-100g values to actual portion size."""
    ratio = grams / 100
    return {
        "calories": round(per_100g["calories_per_100g"] * ratio, 1),
        "protein":  round(per_100g["protein_per_100g"]  * ratio, 1),
        "fat":      round(per_100g["fat_per_100g"]       * ratio, 1),
        "carbs":    round(per_100g["carbs_per_100g"]     * ratio, 1),
        "grams":    grams,
    }
