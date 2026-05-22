# 🚀 Knome — Старт розробки

## 1. Відкрий термінал і перейди в проект

```powershell
cd "C:\Users\Latko Artem\OneDrive\Desktop\KNOME"
```

## 2. Перевір що MCP сервери є

```powershell
claude mcp list
```

Мають бути ✓ Connected: github, sequential-thinking, context7, filesystem

## 3. Синхронізуй з GitHub

```powershell
git pull origin main
```

## 4. Створи новий branch для фічі

```powershell
git checkout -b feature/назва-того-що-робиш
```

## 5. Запускай Claude Code

```powershell
claude
```

або

```powershell
claude --dangerously-skip-permissions
```

## 6. Перший промпт кожної сесії

```
Прочитай CLAUDE.md і KNOME_PROJECT.md.
Ми продовжуємо розробку Knome.
Поточна фаза: [вкажи яка фаза]
Сьогодні хочу зробити: [вкажи що саме]
Спочатку зроби план, не пиши код поки не підтверджу.
```

---

## Корисні команди під час роботи

| Команда           | Коли використовувати                       |
| ----------------- | ------------------------------------------ |
| `/init`           | Перший раз або після великих змін          |
| `Shift+Tab` двічі | Увімкнути Plan Mode перед складною задачею |
| `/compact`        | Коли контекст заповнюється                 |
| `/rewind`         | Коли Claude пішов не в той бік             |
| `/status`         | Перевірити поточний стан                   |

---

## Після закінчення роботи

```powershell
git add .
git commit -m "feat: що зробив"
git push origin feature/назва-гілки
```
