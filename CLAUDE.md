@AGENTS.md

# Pivi Games — сборник игр на React Native / Expo

Одно приложение вместо четырёх: судоку, сапёр, морской бой и лудо. Один инстанс
рекламы, один набор инапов, один Supabase-проект, один экран настроек. Раньше это
были отдельные проекты `../sudoku-pivi`, `../minesweeper-pivi`,
`../battleship-pivi`, `../ludo-game` — они заморожены и служат только источником
кода при переносе.

## Технологии
- Expo (v57) + expo-router, React Native, TypeScript (strict)
- Zustand — состояние, React Native Reanimated — анимации
- Supabase Realtime (broadcast) — онлайн, `@supabase/supabase-js`
- AsyncStorage — настройки/сетап/сохранения
- expo-iap («кофе разрабу»), react-native-google-mobile-ads, expo-tracking-transparency

## Структура

```
src/
  app/                    маршруты (expo-router)
    index.tsx             хаб — список карточек игр
    settings|agreement|thanks
    sudoku/               index (меню) · game · online · rules
    minesweeper/          + settings (палитра поля)
    battleship/           + settings (палитра моря)
    ludo/                 + settings (быстрый режим) · names
  shared/                 всё, что общее для игр
    ads · components · constants · games · i18n · logic · net · store
  games/
    sudoku · minesweeper · battleship · ludo
      components · constants · i18n · logic · net · store · types
```

Правило деления простое: **в `shared/` лежит то, у чего в приложении ровно один
экземпляр** — рекламный SDK, покупки, настройки, тема-основа, клиент Supabase,
транспорт, фейерверк, эмодзи-реакции, экраны настроек/соглашения/благодарности.
Всё остальное принадлежит игре и живёт в `games/<id>/`.

Игра импортирует общее через `@/shared/…`, общее про игру не знает ничего, кроме
её `GameId` и карточки в реестре.

## Что именно общее

| Ресурс | Где | Как разделяется |
|---|---|---|
| AdMob | `shared/ads/adService` | один SDK, одна rewarded-реклама; частота — своя на игру (`REWARDED_START_EVERY_N`), счётчики стартов отдельные |
| Покупки | `shared/constants/iap` | `pivigames_supporter` (non-consumable) + `pivigames_coffee` (consumable), статус на всё приложение |
| Ad-free код | `shared/constants/ads` | один код на хаб; открывается пятью тапами по заголовку хаба |
| Supabase | `shared/net/supabaseClient` | один проект; комнаты неймспейснуты — `room:{gameId}:{code}` |
| Настройки | `shared/store/settingsStore` | тема, язык, вибро, имя для онлайна — ключ `hub:settings:v1` |
| Тема | `shared/constants/theme` | `BaseTheme` (фон/текст/карточка); игра расширяет своими токенами доски |
| Фейерверк | `shared/components/Fireworks` | один оверлей; игра передаёт палитру через `celebrate({ gold, tints, heart })` |

Ключи AsyncStorage: общие — `hub:*`, игровые — `<gameId>:*` (сохранения, сетап,
`<gameId>:prefs:v1`). Пересечься не могут.

**Что осталось за игрой, хотя выглядит общим:**
- `store/reactionsStore` — эмодзи-реакции устроены по-разному: сапёр вешает их
  на клетку, лудо — на базу цвета, судоку и морской бой показывают один пузырь.
  Общий тут только `EmojiModal` (выбор эмодзи).
- `store/prefsStore` — настройки, которые вне игры ничего не значат: палитра поля
  (сапёр, морской бой), быстрый режим (лудо). Общий экран настроек принимает их
  как `children` из маршрута `/<game>/settings`.

## i18n
Два уровня словарей, оба плоские `Record<string,string>`, `ru` — фолбэк:
- `shared/i18n/translations.ts` — хаб и общие экраны (+ названия и описания игр,
  ключи `game_<id>_name` / `game_<id>_tagline`);
- `games/<id>/i18n/translations.ts` — словарь игры целиком.

У каждого уровня свой `useT()`; язык оба берут из общего `settingsStore`.
Дубли общих слов в игровых словарях допустимы — так перенос игры не требует
разрезать её словарь.

## Загрузка состояния
`app/_layout.tsx` поднимает только общее (настройки, supporter, ad-free) и
инициализирует рекламу. Сохранение и сетап игры гидратирует её собственный
`app/<id>/_layout.tsx` — открытие хаба не платит за четыре игры сразу.

## Онлайн
Каждая игра держит свой `onlineStore` и свой `net/protocol` — протоколы разные.
Общее только транспортное: `createSupabaseTransport<M>(gameId, code)` и
`Transport<M>`. Код комнаты дублируется в `shared/store/roomStore`, чтобы общий
экран настроек показывал его посреди матча, не зная, чья это игра.

## Проверки
- `npx tsc --noEmit` — strict, без ошибок
- `npx expo lint` — без предупреждений
- `.env` (gitignored) содержит `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`
- порт 8081 обычно занят соседним проектом — поднимать Metro на другом
  (`npx expo start --port 8090`)

## TODO перед релизом
- **Иконка и сплэш хаба** — сейчас стоит заглушка из шаблона Expo
  (`assets/images/splash-icon.png`, `icon.png`).
- **AdMob**: в `app.json` тестовые app ID Google, в `shared/constants/ads.ts`
  пустые `PROD_*_UNIT_ID` → показываются тестовые объявления. Завести приложение
  в консоли AdMob и подставить свои. `AD_DEBUG` выключить.
- **IAP**: создать `pivigames_supporter` (non-consumable) и `pivigames_coffee`
  (consumable) в App Store Connect и Google Play. Покупки из старых приложений
  сюда не восстанавливаются — это другой bundle ID.
- **EAS**: проект ещё не создан (`extra.eas.projectId` отсутствует), `updates.url`
  не прописан. Первую iOS-сборку запускать интерактивно — сертификата для
  `com.pivi.gamehubpivi` ещё нет.
- Комнаты лудо сменили ключ: раньше `room:{code}`, теперь `room:ludo:{code}`.
  Играть с установленным отдельно Ludo Pivi не получится — это осознанно.
