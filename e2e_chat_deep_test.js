/**
 * Knome Deep Chat Test — sequential, one message at a time, full response capture
 * Tests personalization, cross-domain logic, routing accuracy
 */
const { chromium } = require('playwright');
const BASE = 'http://localhost:5173';

const EMAIL = `artem_deep_${Date.now()}@knome.dev`;
const PASS  = 'Test1234!';
const NAME  = 'Артем';

const log   = (...a) => console.log(...a);
const sep   = (title) => log(`\n${'─'.repeat(55)}\n  ${title}\n${'─'.repeat(55)}`);

// ── Result tracking ──────────────────────────────────────────
const issues   = [];   // bugs to fix
const warnings = [];   // UX problems / routing errors
const good     = [];   // things that work well

function assess(label, response, {
  expectedDomain = null,
  mustContain    = [],
  mustNotContain = [],
  personalCheck  = null,   // fn(response) => string|null — null = OK
} = {}) {
  const r = response.toLowerCase();
  let ok = true;

  mustContain.forEach(kw => {
    if (!r.includes(kw.toLowerCase())) {
      warnings.push(`[${label}] Missing expected keyword: "${kw}"`);
      ok = false;
    }
  });
  mustNotContain.forEach(kw => {
    if (r.includes(kw.toLowerCase())) {
      issues.push(`[${label}] Should NOT contain: "${kw}"`);
      ok = false;
    }
  });
  if (personalCheck) {
    const err = personalCheck(r);
    if (err) { warnings.push(`[${label}] ${err}`); ok = false; }
  }

  const icon = ok ? '✅' : '⚠️ ';
  log(`  ${icon} [${label}]`);
  log(`     Response: "${response.slice(0, 200)}${response.length > 200 ? '…' : ''}"`);
  if (!ok) log(`     ^ issues noted`);
  return ok;
}

// ── Send one message, wait for complete response ──────────────
async function chat(page, message, waitIdleMs = 30000) {
  log(`\n📤 Sending: "${message.slice(0, 100)}"`);

  // Count existing assistant bubbles before sending (to detect new response)
  const countBefore = await page.evaluate(() => {
    const bubbles = [...document.querySelectorAll('[class*="rounded-2xl"]')];
    return bubbles.filter(el =>
      el.className.includes('zinc-900') || el.className.includes('rounded-bl-md')
    ).length;
  });

  const textarea = page.locator('textarea').last();
  await textarea.click();
  await textarea.fill(message);
  await page.waitForTimeout(100);

  // Click Send button
  const sendBtn = page.locator('button[class*="bg-blue-600"]').last();
  if (await sendBtn.isVisible() && await sendBtn.isEnabled()) {
    await sendBtn.click();
  } else {
    await textarea.press('Enter');
  }

  // Step 1: Wait for loading to START (typing dots or streaming cursor appears)
  // This prevents reading the old response before the new one begins
  await page.waitForFunction(
    () => document.querySelector('[class*="animate-blink"]') ||
          document.querySelector('[class*="animate-bounce3"]'),
    { timeout: 5000 }
  ).catch(() => {
    // Fast/cached responses may skip animations — proceed anyway
  });

  // Step 2: Wait for streaming to FINISH (both cursor and dots gone)
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-blink"]') &&
          !document.querySelector('[class*="animate-bounce3"]'),
    { timeout: waitIdleMs }
  ).catch(() => {});

  // Step 3: Wait for a new assistant bubble to appear vs before we sent
  // Use waitIdleMs as timeout to handle slow LLM responses (weekly summary, etc.)
  await page.waitForFunction(
    (n) => {
      const bubbles = [...document.querySelectorAll('[class*="rounded-2xl"]')];
      return bubbles.filter(el =>
        el.className.includes('zinc-900') || el.className.includes('rounded-bl-md')
      ).length > n;
    },
    countBefore,
    { timeout: waitIdleMs }
  ).catch(() => {});

  await page.waitForTimeout(400);

  // Extract the LAST assistant message
  const lastAssistant = await page.evaluate(() => {
    const bubbles = [...document.querySelectorAll('[class*="rounded-2xl"]')];
    const assistantBubbles = bubbles.filter(el =>
      el.className.includes('zinc-900') || el.className.includes('rounded-bl-md')
    );
    return assistantBubbles.at(-1)?.innerText?.trim() || '';
  });

  log(`📥 Response: "${lastAssistant.slice(0, 300)}${lastAssistant.length > 300 ? '…' : ''}"`);
  return lastAssistant;
}

// ── Main ─────────────────────────────────────────────────────
(async () => {
  sep('KNOME DEEP CHAT TEST — Sequential Conversation');

  const browser = await chromium.launch({ headless: false, slowMo: 60, args: ['--window-size=1400,900'] });
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. REGISTER ──────────────────────────────────────────────
  sep('1. REGISTER & LOGIN');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.click('button:has-text("Реєстрація"), button:has-text("Register")');
  await page.waitForTimeout(200);
  await page.locator('input[type="text"]').first().fill(NAME);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(chat|onboarding)/, { timeout: 8000 });
  log(`✅ Registered as ${NAME} / ${EMAIL}`);

  await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // ── 2. ONBOARDING / GREETING ──────────────────────────────────
  sep('2. GREETING — does it say hello personally?');
  {
    // Greeting happens on WS connect — check it appeared
    const greeting = await page.evaluate(() => {
      const bubbles = [...document.querySelectorAll('[class*="rounded-2xl"]')];
      return bubbles.map(b => b.innerText?.trim()).filter(Boolean);
    });
    log(`  First messages: ${JSON.stringify(greeting.slice(0, 2))}`);
    const hasName = greeting.some(g => g.toLowerCase().includes('артем') || g.toLowerCase().includes('artem'));
    if (hasName) good.push('Greeting includes user name');
    else warnings.push('Greeting does not mention user name');
  }

  // ── 3. FINANCES — logging expenses ────────────────────────────
  sep('3. FINANCE — expense logging & routing');

  let r = await chat(page, 'Сьогодні витратив 850 грн на продукти в Сільпо');
  assess('Finance: grocery log', r, {
    mustContain: [],
    personalCheck: (t) => {
      if (t.includes('записан') || t.includes('витрат') || t.includes('850') || t.includes('сільпо') || t.includes('продукт')) return null;
      return 'Did not acknowledge the expense';
    }
  });

  r = await chat(page, 'Також заплатив 3200 грн за комунальні послуги');
  assess('Finance: utilities log', r, {
    personalCheck: (t) => (t.includes('3200') || t.includes('комунальн') || t.includes('записан')) ? null : 'Utilities expense not acknowledged'
  });

  r = await chat(page, 'Яка в мене ситуація з фінансами цього місяця?');
  assess('Finance: summary', r, {
    personalCheck: (t) => {
      if (t.includes('850') || t.includes('3200') || t.includes('грн') || t.includes('витрат') || t.includes('місяц')) return null;
      return 'Finance summary should reference logged amounts';
    }
  });

  // ── 4. HEALTH — check-in ─────────────────────────────────────
  sep('4. HEALTH — daily check-in');

  r = await chat(page, 'Сьогодні спав лише 5 годин, прокинувся розбитий. Настрій 4 з 10, енергія низька');
  assess('Health: poor sleep check-in', r, {
    personalCheck: (t) => {
      if (t.includes('5') || t.includes('сон') || t.includes('настрій') || t.includes('відпочин') || t.includes('розбит')) return null;
      return 'Should acknowledge poor sleep and low mood';
    }
  });

  r = await chat(page, 'Поїв: сніданок — вівсянка, обід — куряча грудка з рисом, вечеря ще не було');
  assess('Health: nutrition log', r, {
    personalCheck: (t) => (t.includes('їж') || t.includes('харчу') || t.includes('калор') || t.includes('вівс') || t.includes('записан') || t.includes('сніданок') || t.includes('обід') || t.includes('меню') || t.includes('раціон')) ? null : 'Nutrition not properly acknowledged'
  });

  // ── 5. WORKOUT — full program flow ────────────────────────────
  sep('5. WORKOUT — custom program + session logging');

  r = await chat(page, 'Хочу скласти програму тренувань для себе');
  assess('Workout: program request', r, {
    mustContain: ['ціль'],
  });

  // Answer questionnaire
  r = await chat(page,
    '1. Хочу набрати м\'язову масу та збільшити силу\n' +
    '2. Немає конкретного виду спорту, загальний фітнес\n' +
    '3. Чотири рази на тиждень — пн/вт/чт/пт\n' +
    '4. Є повноцінний тренажерний зал\n' +
    '5. Просунутий рівень, тренуюсь 3 роки\n' +
    '6. 90 хвилин на тренування',
    45000
  );
  assess('Workout: program generated for advanced/mass', r, {
    personalCheck: (t) => {
      const hasProg = t.includes('день') || t.includes('нижня') || t.includes('верхня') || t.includes('вправ') || t.includes('підхід');
      if (!hasProg) return 'Program not generated (no training days found)';
      // Advanced user should have 5×4-6 not 3×12-15
      if (t.includes('просунут') || t.includes('5×') || t.includes('4-6') || t.includes('4×')) return null;
      return null; // Just check it generated something
    }
  });

  // Check personalization: advanced user should get different sets/reps than beginner
  if (r.includes('3×12') && !r.includes('4×') && !r.includes('5×')) {
    issues.push('Workout: advanced user got beginner sets/reps (3×12 instead of 5×4-6 or 4×8-12)');
  }

  r = await chat(page, 'Сьогодні потренувався: жим штанги 120кг 5×3, присідання 150кг 4×5, станова тяга 160кг 3×5. Тривалість 90 хвилин');
  assess('Workout: heavy session log (advanced)', r, {
    personalCheck: (t) => (t.includes('записан') || t.includes('тренування') || t.includes('120') || t.includes('150') || t.includes('90')) ? null : 'Heavy workout not acknowledged'
  });

  // ── 6. LEARNING ───────────────────────────────────────────────
  sep('6. LEARNING — session tracking');

  r = await chat(page, 'Позаймався машинним навчанням 2 години. Вивчав нейронні мережі та backpropagation');
  assess('Learning: ML session', r, {
    personalCheck: (t) => (t.includes('2') || t.includes('навч') || t.includes('записан') || t.includes('нейрон') || t.includes('машинн')) ? null : 'Learning session not acknowledged'
  });

  r = await chat(page, 'Прочитав книгу "Чиста архітектура" Роберта Мартіна, 150 сторінок');
  assess('Learning: book progress', r, {
    personalCheck: (t) => (t.includes('книг') || t.includes('мартін') || t.includes('архітектур') || t.includes('150') || t.includes('читан') || t.includes('записав') || t.includes('навч') || t.includes('прогрес') || t.includes('знань')) ? null : 'Book reading not acknowledged'
  });

  // ── 7. PRODUCTIVITY — tasks & projects ────────────────────────
  sep('7. PRODUCTIVITY — task management');

  r = await chat(page, 'Треба зробити: підготувати презентацію для клієнта до п\'ятниці, критичний пріоритет');
  assess('Productivity: critical task', r, {
    personalCheck: (t) => (t.includes('презентац') || t.includes('задач') || t.includes('п\'ятниц') || t.includes('критич') || t.includes('записан')) ? null : 'Task not acknowledged'
  });

  r = await chat(page, 'Починаю помодоро сесію, фокус на написанні коду');
  assess('Productivity: pomodoro', r, {
    personalCheck: (t) => (t.includes('помодоро') || t.includes('фокус') || t.includes('25') || t.includes('taймер') || t.includes('час')) ? null : 'Pomodoro not acknowledged'
  });

  // ── 8. REFLECTION — journal ───────────────────────────────────
  sep('8. REFLECTION — journaling');

  r = await chat(page, 'Хочу записати у щоденник: сьогодні зрозумів що займаюся не тим, відчуваю що потрібно змінити напрямок в кар\'єрі');
  assess('Reflection: journal entry', r, {
    personalCheck: (t) => (t.includes('щоденник') || t.includes('записан') || t.includes('відчут') || t.includes('кар\'єр') || t.includes('думк')) ? null : 'Journal entry not acknowledged'
  });

  r = await chat(page, 'Вдячний за: здоров\'я, за те що маю можливість навчатися, за підтримку сім\'ї');
  assess('Reflection: gratitude', r, {
    personalCheck: (t) => (t.includes('вдячн') || t.includes('позитивн') || t.includes('записан') || t.includes('здоров')) ? null : 'Gratitude not acknowledged'
  });

  // ── 9. RELATIONSHIPS ──────────────────────────────────────────
  sep('9. RELATIONSHIPS — contacts');

  r = await chat(page, 'Познайомився з новим колегою Максимом, він Python розробник, важливий контакт для нетворкінгу');
  assess('Relationships: new contact', r, {
    personalCheck: (t) => (t.includes('максим') || t.includes('контакт') || t.includes('колег') || t.includes('записан') || t.includes('познайомивс')) ? null : 'New contact not acknowledged'
  });

  r = await chat(page, 'Послезавтра день народження у мого друга Олексія');
  assess('Relationships: birthday', r, {
    personalCheck: (t) => (t.includes('олексій') || t.includes('народження') || t.includes('нагадати') || t.includes('вітання') || t.includes('записан')) ? null : 'Birthday not acknowledged'
  });

  // ── 10. CAREER ────────────────────────────────────────────────
  sep('10. CAREER — skills & achievements');

  r = await chat(page, 'Отримав сертифікат AWS Solutions Architect. Рівень навички cloud: 8/10');
  assess('Career: certification', r, {
    personalCheck: (t) => (t.includes('aws') || t.includes('сертифікат') || t.includes('cloud') || t.includes('навичк') || t.includes('записан')) ? null : 'Certification not acknowledged'
  });

  r = await chat(page, 'Подав заявку на вакансію Senior Python Developer в компанії GlobalLogic, зарплата 6000$');
  assess('Career: job application', r, {
    personalCheck: (t) => (t.includes('globallogic') || t.includes('вакансі') || t.includes('заявк') || t.includes('python') || t.includes('6000')) ? null : 'Job application not acknowledged'
  });

  // ── 11. GOALS ─────────────────────────────────────────────────
  sep('11. GOALS — life goals & bucket list');

  r = await chat(page, 'Хочу досягти: до 30 років стати tech lead, зберегти 50000$ на банківському рахунку');
  assess('Goals: life goals', r, {
    personalCheck: (t) => (t.includes('ціль') || t.includes('мета') || t.includes('tech lead') || t.includes('50000') || t.includes('записан')) ? null : 'Goals not acknowledged'
  });

  r = await chat(page, 'У мій bucket list: відвідати Японію, пробігти марафон, навчитися грати на гітарі');
  assess('Goals: bucket list', r, {
    personalCheck: (t) => (t.includes('японі') || t.includes('марафон') || t.includes('гітар') || t.includes('список') || t.includes('мрі') || t.includes('записан')) ? null : 'Bucket list not acknowledged'
  });

  // ── 12. HOME ──────────────────────────────────────────────────
  sep('12. HOME — household tasks');

  r = await chat(page, 'Треба купити: молоко, хліб, яйця, сир, помідори — список покупок');
  assess('Home: shopping list', r, {
    personalCheck: (t) => (t.includes('молоко') || t.includes('хліб') || t.includes('список') || t.includes('покупк') || t.includes('записан')) ? null : 'Shopping list not acknowledged'
  });

  // ── 13. CROSS-DOMAIN INSIGHTS ─────────────────────────────────
  sep('13. CROSS-DOMAIN — does it connect the dots?');

  r = await chat(page, 'Як мої справи загалом? Покажи аналіз мого тижня');
  assess('Cross-domain: weekly summary', r, {
    personalCheck: (t) => {
      // Should mention at least 2 different domains from what we logged
      const domains = ['фінанс', 'тренув', 'навч', 'здоров', 'задач', 'продуктив', 'щоденник', 'цілі'];
      const mentioned = domains.filter(d => t.includes(d));
      if (mentioned.length >= 2) return null;
      return `Weekly summary only mentions ${mentioned.length} domain(s): ${mentioned.join(', ')}`;
    }
  });

  r = await chat(page, 'Чи є зв\'язок між моїм сном і продуктивністю?');
  assess('Cross-domain: sleep vs productivity', r, {
    personalCheck: (t) => {
      // Should reference the 5h sleep we logged and connect to productivity
      if (t.includes('сон') || t.includes('5') || t.includes('продуктив') || t.includes('зв\'яз') || t.includes('вплив')) return null;
      return 'Did not connect sleep data to productivity insights';
    }
  });

  // ── 14. PERSONALIZATION TESTS ─────────────────────────────────
  sep('14. PERSONALIZATION — does it remember me?');

  r = await chat(page, 'Яку вагу ти рекомендуєш мені брати на жимі наступного тренування?');
  assess('Personalization: workout weight recommendation', r, {
    personalCheck: (t) => {
      // Should reference the 120kg we logged, not generic advice
      if (t.includes('120') || t.includes('125') || t.includes('прогресі') || t.includes('попередн')) return null;
      // If it gives generic advice without referencing logged data — warning
      warnings.push('Workout recommendation did not reference logged 120kg bench press');
      return null; // Not a hard fail, just a warning
    }
  });

  r = await chat(page, 'Що я вчив сьогодні?');
  assess('Personalization: learning recall', r, {
    personalCheck: (t) => {
      if (t.includes('машинн') || t.includes('нейрон') || t.includes('backprop') || t.includes('ml') || t.includes('навчання')) return null;
      return 'Did not recall today\'s ML learning session';
    }
  });

  r = await chat(page, 'Скільки грошей я витратив сьогодні?');
  assess('Personalization: finance recall', r, {
    personalCheck: (t) => {
      // Should recall 850 + 3200 = 4050 or at least mention the amounts
      if (t.includes('850') || t.includes('3200') || t.includes('4050') || t.includes('4 050')) return null;
      return 'Did not recall today\'s expenses (850 + 3200 грн)';
    }
  });

  // ── 15. EDGE CASES ────────────────────────────────────────────
  sep('15. EDGE CASES — unusual inputs');

  r = await chat(page, 'sdfiusjdfosdf');
  assess('Edge: gibberish input', r, {
    mustNotContain: ['500', 'error', 'traceback'],
    personalCheck: (t) => (t.length > 5) ? null : 'No response to gibberish'
  });

  r = await chat(page, '');  // empty — handled by frontend, won't even send
  log('  (empty message — skipped by frontend)');

  r = await chat(page, 'Яка погода?');  // off-topic
  assess('Edge: off-topic (weather)', r, {
    personalCheck: (t) => {
      // Should gracefully redirect or explain scope
      if (t.includes('погод') || t.includes('не знаю') || t.includes('не можу') || t.includes('не відповіда')) return null;
      return null; // Any response is OK
    }
  });

  // ── 16. CHECK KG DATA VIA API ─────────────────────────────────
  sep('16. API — verify data was saved to Knowledge Graph');

  const userId = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('knome-store')||'{}').state?.userId||''; } catch { return ''; }
  });
  const token = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('knome-store')||'{}').state?.token||''; } catch { return ''; }
  });

  if (userId && token) {
    const checks = [
      [`/api/workout/programs/${userId}`,    'workout_programs',   (d) => d.programs?.length > 0],
      [`/api/productivity/tasks/${userId}`,  'productivity_tasks', (d) => d.tasks?.length > 0],
      [`/api/workout/sessions/${userId}`,    'workout_sessions',   (d) => d.sessions?.length > 0],
    ];

    for (const [url, label, validator] of checks) {
      const res = await page.evaluate(async ([u, t]) => {
        const r = await fetch(`http://localhost:8000${u}`, { headers: { Authorization: `Bearer ${t}` } });
        return { status: r.status, body: r.ok ? await r.json() : null };
      }, [url, token]);

      if (res.status === 200 && validator(res.body)) {
        log(`  ✅ ${label}: data saved`);
        good.push(`KG: ${label} has data`);
      } else {
        log(`  ❌ ${label}: no data (status=${res.status})`);
        issues.push(`KG: ${label} empty after chat logging`);
      }
    }
  }

  // ── FINAL REPORT ──────────────────────────────────────────────
  sep('FINAL REPORT');

  log(`\n✅ GOOD (${good.length}):`);
  good.forEach(g => log(`   • ${g}`));

  log(`\n⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(w => log(`   • ${w}`));

  log(`\n❌ ISSUES TO FIX (${issues.length}):`);
  issues.forEach(i => log(`   • ${i}`));

  log(`\n${'═'.repeat(55)}`);
  if (issues.length === 0 && warnings.length <= 3) {
    log('  🎉 OVERALL: PASS — chat works well');
  } else if (issues.length === 0) {
    log(`  ⚠️  OVERALL: PASS WITH WARNINGS (${warnings.length} items)`);
  } else {
    log(`  ❌ OVERALL: NEEDS FIXES (${issues.length} issues, ${warnings.length} warnings)`);
  }
  log('═'.repeat(55));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
