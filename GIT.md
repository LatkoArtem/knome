# 📤 GitHub — збереження змін

## Базове збереження
```powershell
git add .
git commit -m "feat: що зробив"
git push origin main
```

## Якщо працюєш на окремій гілці
```powershell
git add .
git commit -m "feat: що зробив"
git push origin feature/назва-гілки
```

## Перевірити що змінилось перед збереженням
```powershell
git status
```

## Переглянути історію комітів
```powershell
git log --oneline
```

## Типові назви комітів
```
feat:   нова функція
fix:    виправлення помилки
chore:  технічні зміни (конфіги, залежності)
refactor: переписати без зміни функціоналу
docs:   зміни в документації
```

## Приклади
```powershell
git commit -m "feat: onboarding agent phase 1"
git commit -m "feat: knowledge graph schema"
git commit -m "fix: websocket connection error"
git commit -m "chore: add requirements.txt"
```
