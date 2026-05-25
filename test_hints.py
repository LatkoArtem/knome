"""
Test script: send hints to the assistant and check if it understands context.
Each message is a natural-language hint, not a direct command.
"""
import asyncio
import websockets
import json
import requests

BASE = "http://localhost:8000/api"
WS_BASE = "ws://localhost:8000/ws/chat"

TOKEN = None
USER_ID = None

def setup_user():
    global TOKEN, USER_ID
    r = requests.post(f"{BASE}/auth/register", json={
        "email": "hint_tester@test.com",
        "password": "Test1234!",
        "name": "Артем"
    })
    if r.status_code == 200:
        d = r.json()
        TOKEN = d["token"]
        USER_ID = d["user_id"]
    else:
        r2 = requests.post(f"{BASE}/auth/login", json={"email": "hint_tester@test.com", "password": "Test1234!"})
        d = r2.json()
        TOKEN = d["token"]
        USER_ID = d["user_id"]
    print(f"✅ User ready: {USER_ID}")

_session_initialized = False

async def chat(message: str) -> str:
    global _session_initialized
    uri = f"{WS_BASE}/{USER_ID}"
    async with websockets.connect(uri, open_timeout=10) as ws:
        # On first connection server sends greeting; on subsequent ones it may not
        if not _session_initialized:
            # Drain greeting
            while True:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=10)
                    data = json.loads(raw)
                    if data.get("done"):
                        break
                except asyncio.TimeoutError:
                    break
            _session_initialized = True
        else:
            # Brief drain for any pending proactive messages
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=1)
            except asyncio.TimeoutError:
                pass

        # Send user message
        await ws.send(json.dumps({"text": message}))

        # Collect streaming response
        full = ""
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=25)
                data = json.loads(raw)
                if data.get("done"):
                    break
                if "token" in data:
                    full += data["token"]
            except asyncio.TimeoutError:
                break
    return full.strip()

def check(label: str, response: str, expected_keywords: list[str], forbidden: list[str] = None):
    found = [kw for kw in expected_keywords if kw.lower() in response.lower()]
    missing = [kw for kw in expected_keywords if kw.lower() not in response.lower()]
    bad = [kw for kw in (forbidden or []) if kw.lower() in response.lower()]

    status = "✅ PASS" if found and not missing and not bad else "⚠️  WARN" if found else "❌ FAIL"
    print(f"\n{status} [{label}]")
    print(f"   Response: {response[:200]}")
    if missing:
        print(f"   Missing: {missing}")
    if bad:
        print(f"   Should NOT contain: {bad}")
    return not missing and not bad

async def run_tests():
    setup_user()
    results = []

    # ─── TEST 1: Greeting — should give proactive overview, not generic ───
    print("\n" + "="*60)
    print("TEST 1: Greeting with proactive context")
    resp = await chat("Привіт!")
    r = check("Greeting", resp,
        expected_keywords=["Артем"],  # should use name
        forbidden=["Я не розумію", "не знаю"])
    results.append(r)

    # ─── TEST 2: Implicit workout intent — "хочу трохи порухатись сьогодні" ───
    print("\n" + "="*60)
    print("TEST 2: Implicit workout ('хочу трохи порухатись')")
    resp = await chat("Хочу трохи порухатись сьогодні")
    r = check("Implicit workout", resp,
        expected_keywords=["програм", "тренуванн"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 3: Goal creation via hint — "мрію колись побувати в Японії" ───
    print("\n" + "="*60)
    print("TEST 3: Implicit goal ('мрію побувати в Японії')")
    resp = await chat("Мрію колись побувати в Японії")
    r = check("Implicit goal", resp,
        expected_keywords=["ціл", "мет"],
        forbidden=["не розумію", "не можу"])
    results.append(r)

    # ─── TEST 4: Finance — "знову витратив більше ніж хотів" ───
    print("\n" + "="*60)
    print("TEST 4: Implicit finance regret")
    resp = await chat("Знову витратив більше ніж хотів цього місяця")
    r = check("Implicit finance", resp,
        expected_keywords=["бюджет", "витрат"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 5: Learning — "вже давно не відкривав книгу" ───
    print("\n" + "="*60)
    print("TEST 5: Implicit learning regret")
    resp = await chat("Вже давно не відкривав книгу, треба б взятись за себе")
    r = check("Implicit learning", resp,
        expected_keywords=["вчитись", "навчанн", "тем"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 6: Health mood — "якось не по собі сьогодні, настрій нікудишній" ───
    print("\n" + "="*60)
    print("TEST 6: Implicit mood/health check")
    resp = await chat("Якось не по собі сьогодні, настрій нікудишній")
    r = check("Implicit health/mood", resp,
        expected_keywords=["чекін", "сон", "настрій"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 7: Career — "думаю змінити роботу" ───
    print("\n" + "="*60)
    print("TEST 7: Implicit career ('думаю змінити роботу')")
    resp = await chat("Думаю змінити роботу найближчим часом")
    r = check("Implicit career", resp,
        expected_keywords=["резюм", "навич"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 8: Gratitude — "сьогодні справді вдалий день" ───
    print("\n" + "="*60)
    print("TEST 8: Implicit gratitude/reflection")
    resp = await chat("Сьогодні справді вдалий день, все склалось добре")
    r = check("Implicit gratitude", resp,
        expected_keywords=["щоденник", "вдячн"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 9: Relationship — "завтра день народження друга" ───
    print("\n" + "="*60)
    print("TEST 9: Implicit relationship")
    resp = await chat("Ой, завтра ж день народження мого друга Максима!")
    r = check("Implicit relationship", resp,
        expected_keywords=["Максим", "нагадування"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 10: Trip plan — "хочу кудись поїхати на літо" ───
    print("\n" + "="*60)
    print("TEST 10: Implicit trip planning")
    resp = await chat("Хочу кудись поїхати відпочити на літо")
    r = check("Implicit trip", resp,
        expected_keywords=["ціль", "план"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 11: Home task — "треба прибрати" ───
    print("\n" + "="*60)
    print("TEST 11: Implicit home task")
    resp = await chat("Треба б нарешті прибрати вдома, давно не робив")
    r = check("Implicit home", resp,
        expected_keywords=["прибирання", "домашн"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── TEST 12: Complex hint — "стомлюсь швидко останнім часом" ───
    print("\n" + "="*60)
    print("TEST 12: Complex hint - fatigue (could be health + workout + sleep)")
    resp = await chat("Стомлююсь дуже швидко останнім часом, не знаю що з цим робити")
    r = check("Fatigue cross-domain", resp,
        expected_keywords=["сон", "відпочинок"],
        forbidden=["не розумію"])
    results.append(r)

    # ─── Summary ───
    passed = sum(results)
    total = len(results)
    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{total} passed")
    if passed < total:
        print("Some tests need fixes — check warnings above")
    else:
        print("All hint tests passed! 🎉")

if __name__ == "__main__":
    asyncio.run(run_tests())
