/**
 * Tiny flat-dictionary i18n, mirroring ludo-game. Each language is a
 * `Record<string, string>`; `ru` is the fallback for any missing key. Add a
 * language by extending the union + LANGUAGES and adding its dictionary.
 */

export type Language = 'ru' | 'en' | 'de' | 'es' | 'uk' | 'pl' | 'sk';

export const LANGUAGES: Language[] = ['ru', 'en', 'de', 'es', 'uk', 'pl', 'sk'];

type Dict = Record<string, string>;

const ru: Dict = {
  app_title: 'Сапёр',
  play: 'Играть',
  online_play: 'Онлайн',
  rules: 'Правила',
  settings: 'Настройки',
  back: 'Назад',

  game_setup: 'Настройка игры',
  board_size: 'Размер поля',
  mine_amount: 'Количество мин',
  difficulty: 'Сложность',
  easy: 'Лёгкий',
  normal: 'Обычный',
  easy_hint: 'Одна жизнь — первая мина прощается',
  normal_hint: 'Без жизней — одна мина, и всё',

  turn_mode: 'Ход',
  parallel: 'Одновременно',
  sequential: 'По очереди',
  parallel_hint: 'Оба игрока играют без ожидания',
  sequential_hint: 'Одна клетка за ход, затем передача хода',

  mines_left: 'Мины',
  lives: 'Жизни',
  your_turn: 'Ваш ход',
  turn_of: 'Ходит: {name}',
  waiting_turn: 'Ждём соперника',

  mode_open: 'Открыть',
  mode_flag: 'Флажок',
  mode_question: 'Вопрос',
  mode_clear: 'Очистить',

  new_game: 'Новая игра',
  restart: 'Заново',
  save_game: 'Сохранить',
  game_saved: 'Игра сохранена',
  continue_game: 'Продолжить',
  play_again: 'Ещё раз',
  exit: 'Выход',
  menu: 'Меню',
  close: 'Закрыть',
  loading_ad: 'Загрузка рекламы…',
  resume: 'Продолжить',

  you_win: 'Победа!',
  you_lose: 'Взрыв!',
  game_over: 'Игра окончена',
  finish_game: 'Завершить игру',
  results: 'Результаты',
  moves: 'Ходы',
  mines_found: 'Найдено мин',
  you: 'Вы',
  player: 'Игрок',
  player_n: 'Игрок {n}',

  // Online
  your_name: 'Ваше имя',
  name_shown_hint: 'Имя увидят другие игроки',
  create_room: 'Создать комнату',
  join_room: 'Войти',
  enter_code: 'Код комнаты',
  room_code: 'Код комнаты',
  share_code: 'Поделитесь кодом с соперником',
  code_copied: 'Код скопирован',
  pick_seat: 'Займите место',
  open_seat: 'Свободно',
  waiting_host: 'Ждём, пока хост начнёт игру',
  start_game: 'Начать игру',
  connecting: 'Подключение…',
  online_error: 'Ошибка подключения',
  online_unavailable: 'Онлайн недоступен — не настроен сервер',
  or: 'или',
  host_settings: 'Настройки игры (хост)',

  // Rules
  rules_intro:
    'Открывайте клетки и не наступите на мину. Число показывает, сколько мин рядом.',
  rule_reveal: 'Короткое нажатие — открыть клетку.',
  rule_mark: 'Долгое нажатие — флажок → «?» → снять.',
  rule_flood: 'Пустые области открываются автоматически.',
  rule_lives: 'На лёгком уровне первая мина прощается (одна жизнь).',
  rule_mp_split:
    'В онлайне поле делится поровну: каждый играет только со своими клетками.',
  rule_mp_emoji:
    'Если соперник поставил «?», отправьте ему эмодзи на эту клетку.',
  rule_win: 'Побеждаете, когда открыты все безопасные клетки.',

  dark_mode: 'Тёмная тема',
  language: 'Язык',
  embedded: 'встроен',
  unlock_title: 'Секретный код',
  unlock_body: 'Введите код, чтобы убрать рекламу.',
  unlock_placeholder: 'Введите код',
  unlock_submit: 'Применить',
  unlock_wrong: 'Неверный код',
  unlock_done: 'Реклама отключена ✓',
  cancel: 'Отмена',
  board_theme: 'Тема поля',
  downloading_update: 'Загрузка обновления…',
  agreement: 'Соглашение об использовании',
  agreement_hint: 'Условия использования и данные',
  agreement_link: 'Играя, вы принимаете условия использования',
  buy_coffee: '☕ Купи разрабу кофе',
  buy_coffee_again: '☕ Ещё кофе разрабу',
  buy_coffee_hint: 'Открывает статус supporter — навсегда',
  buy_coffee_again_hint: 'Спасибо за поддержку! Кофе: {n} · можно ещё',
  coffee_thanks_title: 'Спасибо! ❤️',
  coffee_thanks_body: 'Спасибо за поддержку — это правда очень приятно.',
  coffee_count: 'Вы угостили автора {n} раз',
  coffee_thanks_close: 'На здоровье!',
  coffee_error_title: 'Не удалось выполнить покупку',
  supporter_info_link: 'Что это даёт?',
  supporter_info_title: 'Статус supporter ☕',
  supporter_info_body:
    'Вы получаете статус supporter навсегда: золотой салют при победе, тёплый экран-благодарность и счётчик выпитого кофе. Это просто способ поддержать разработку — без него игра полностью бесплатна.',
  supporter_info_restore:
    'Уже покупали раньше? Откройте Настройки → «Восстановить покупки».',
  restore_purchases: 'Восстановить покупки',
  restore_hint: 'Вернуть статус supporter после переустановки',
  restore_title: 'Восстановление',
  restore_done: 'Статус supporter восстановлен ☕',
  restore_none: 'Покупки для восстановления не найдены',
  restore_error: 'Не удалось восстановить покупки',
};

const en: Dict = {
  app_title: 'Minesweeper',
  play: 'Play',
  online_play: 'Online',
  rules: 'Rules',
  settings: 'Settings',
  back: 'Back',

  game_setup: 'Game setup',
  board_size: 'Board size',
  mine_amount: 'Mines',
  difficulty: 'Difficulty',
  easy: 'Easy',
  normal: 'Normal',
  easy_hint: 'One life — the first mine is forgiven',
  normal_hint: 'No lives — one mine ends it',

  turn_mode: 'Turns',
  parallel: 'Simultaneous',
  sequential: 'Take turns',
  parallel_hint: 'Both players act without waiting',
  sequential_hint: 'One cell per turn, then it passes',

  mines_left: 'Mines',
  lives: 'Lives',
  your_turn: 'Your turn',
  turn_of: '{name} to move',
  waiting_turn: 'Waiting for opponent',

  mode_open: 'Reveal',
  mode_flag: 'Flag',
  mode_question: 'Question',
  mode_clear: 'Clear',

  new_game: 'New game',
  restart: 'Restart',
  save_game: 'Save',
  game_saved: 'Game saved',
  continue_game: 'Continue',
  play_again: 'Play again',
  exit: 'Exit',
  menu: 'Menu',
  close: 'Close',
  loading_ad: 'Loading an ad…',
  resume: 'Resume',

  you_win: 'You win!',
  you_lose: 'Boom!',
  game_over: 'Game over',
  finish_game: 'Finish game',
  results: 'Results',
  moves: 'Moves',
  mines_found: 'Mines found',
  you: 'You',
  player: 'Player',
  player_n: 'Player {n}',

  your_name: 'Your name',
  name_shown_hint: 'Other players will see this name',
  create_room: 'Create room',
  join_room: 'Join',
  enter_code: 'Room code',
  room_code: 'Room code',
  share_code: 'Share the code with your opponent',
  code_copied: 'Code copied',
  pick_seat: 'Take a seat',
  open_seat: 'Open',
  waiting_host: 'Waiting for the host to start',
  start_game: 'Start game',
  connecting: 'Connecting…',
  online_error: 'Connection error',
  online_unavailable: 'Online unavailable — server not configured',
  or: 'or',
  host_settings: 'Game settings (host)',

  rules_intro:
    'Uncover cells without stepping on a mine. A number shows how many mines touch that cell.',
  rule_reveal: 'Tap to reveal a cell.',
  rule_mark: 'Long-press to cycle flag → "?" → clear.',
  rule_flood: 'Empty areas open automatically.',
  rule_lives: 'On easy the first mine is forgiven (one life).',
  rule_mp_split:
    'Online, the board is split evenly: you only interact with your own cells.',
  rule_mp_emoji: 'When an opponent marks "?", send them an emoji on that cell.',
  rule_win: 'You win once every safe cell is uncovered.',

  dark_mode: 'Dark theme',
  language: 'Language',
  embedded: 'embedded',
  unlock_title: 'Secret code',
  unlock_body: 'Enter a code to remove ads.',
  unlock_placeholder: 'Enter code',
  unlock_submit: 'Apply',
  unlock_wrong: 'Invalid code',
  unlock_done: 'Ads removed ✓',
  cancel: 'Cancel',
  board_theme: 'Board theme',
  downloading_update: 'Downloading update…',
  agreement: 'Terms of use',
  agreement_hint: 'Terms of use and data',
  agreement_link: 'By playing, you accept the terms of use',
  buy_coffee: '☕ Buy the dev a coffee',
  buy_coffee_again: '☕ Another coffee for the dev',
  buy_coffee_hint: 'Unlocks supporter status — forever',
  buy_coffee_again_hint: 'Thanks for the support! Coffees: {n} · buy another',
  coffee_thanks_title: 'Thank you! ❤️',
  coffee_thanks_body: 'Thanks for the support — it truly means a lot.',
  coffee_count: 'You treated the author {n} time(s)',
  coffee_thanks_close: 'You’re welcome!',
  coffee_error_title: 'Purchase failed',
  supporter_info_link: 'What do you get?',
  supporter_info_title: 'Supporter status ☕',
  supporter_info_body:
    'You get supporter status forever: a golden victory firework, a warm thank-you screen and a coffee counter. It is simply a way to support development — the game is completely free without it.',
  supporter_info_restore:
    'Bought before? Open Settings → “Restore purchases”.',
  restore_purchases: 'Restore purchases',
  restore_hint: 'Regain supporter status after a reinstall',
  restore_title: 'Restore',
  restore_done: 'Supporter status restored ☕',
  restore_none: 'No purchases to restore',
  restore_error: 'Could not restore purchases',
};

const de: Dict = {
  app_title: 'Minesweeper',
  play: 'Spielen',
  online_play: 'Online',
  rules: 'Regeln',
  settings: 'Einstellungen',
  back: 'Zurück',

  game_setup: 'Spiel einrichten',
  board_size: 'Feldgröße',
  mine_amount: 'Anzahl Minen',
  difficulty: 'Schwierigkeit',
  easy: 'Leicht',
  normal: 'Normal',
  easy_hint: 'Ein Leben — die erste Mine wird verziehen',
  normal_hint: 'Keine Leben — eine Mine und Schluss',

  turn_mode: 'Zug',
  parallel: 'Gleichzeitig',
  sequential: 'Abwechselnd',
  parallel_hint: 'Beide Spieler spielen ohne zu warten',
  sequential_hint: 'Ein Feld pro Zug, dann ist der andere dran',

  mines_left: 'Minen',
  lives: 'Leben',
  your_turn: 'Du bist dran',
  turn_of: '{name} ist dran',
  waiting_turn: 'Warte auf Gegner',

  mode_open: 'Aufdecken',
  mode_flag: 'Fahne',
  mode_question: 'Fragezeichen',
  mode_clear: 'Löschen',

  new_game: 'Neues Spiel',
  restart: 'Neu starten',
  save_game: 'Speichern',
  game_saved: 'Spiel gespeichert',
  continue_game: 'Fortsetzen',
  play_again: 'Nochmal',
  exit: 'Beenden',
  menu: 'Menü',
  close: 'Schließen',
  loading_ad: 'Werbung wird geladen…',
  resume: 'Fortsetzen',

  you_win: 'Gewonnen!',
  you_lose: 'Bumm!',
  game_over: 'Spiel vorbei',
  finish_game: 'Spiel beenden',
  results: 'Ergebnisse',
  moves: 'Züge',
  mines_found: 'Gefundene Minen',
  you: 'Du',
  player: 'Spieler',
  player_n: 'Spieler {n}',

  your_name: 'Dein Name',
  name_shown_hint: 'Andere Spieler sehen diesen Namen',
  create_room: 'Raum erstellen',
  join_room: 'Beitreten',
  enter_code: 'Raumcode',
  room_code: 'Raumcode',
  share_code: 'Teile den Code mit deinem Gegner',
  code_copied: 'Code kopiert',
  pick_seat: 'Platz wählen',
  open_seat: 'Frei',
  waiting_host: 'Warte, bis der Host startet',
  start_game: 'Spiel starten',
  connecting: 'Verbinde…',
  online_error: 'Verbindungsfehler',
  online_unavailable: 'Online nicht verfügbar — Server nicht konfiguriert',
  or: 'oder',
  host_settings: 'Spieleinstellungen (Host)',

  rules_intro:
    'Decke Felder auf und tritt auf keine Mine. Die Zahl zeigt, wie viele Minen angrenzen.',
  rule_reveal: 'Tippen — Feld aufdecken.',
  rule_mark: 'Langes Drücken — Fahne → «?» → entfernen.',
  rule_flood: 'Leere Bereiche öffnen sich automatisch.',
  rule_lives: 'Auf Leicht wird die erste Mine verziehen (ein Leben).',
  rule_mp_split:
    'Online wird das Feld gleichmäßig geteilt: Jeder spielt nur mit seinen Feldern.',
  rule_mp_emoji: 'Wenn der Gegner «?» setzt, schick ihm ein Emoji auf dieses Feld.',
  rule_win: 'Du gewinnst, wenn alle sicheren Felder aufgedeckt sind.',

  dark_mode: 'Dunkles Design',
  language: 'Sprache',
  embedded: 'eingebettet',
  unlock_title: 'Geheimcode',
  unlock_body: 'Gib einen Code ein, um Werbung zu entfernen.',
  unlock_placeholder: 'Code eingeben',
  unlock_submit: 'Anwenden',
  unlock_wrong: 'Ungültiger Code',
  unlock_done: 'Werbung entfernt ✓',
  cancel: 'Abbrechen',
  board_theme: 'Spielfeld-Farbe',
  downloading_update: 'Update wird geladen…',
  agreement: 'Nutzungsbedingungen',
  agreement_hint: 'Nutzungsbedingungen und Daten',
  agreement_link: 'Mit dem Spielen akzeptierst du die Nutzungsbedingungen',
  buy_coffee: '☕ Spendier dem Entwickler einen Kaffee',
  buy_coffee_again: '☕ Noch einen Kaffee für den Entwickler',
  buy_coffee_hint: 'Schaltet den Supporter-Status frei – für immer',
  buy_coffee_again_hint: 'Danke für die Unterstützung! Kaffees: {n} · gerne mehr',
  coffee_thanks_title: 'Danke! ❤️',
  coffee_thanks_body: 'Danke für die Unterstützung – das bedeutet mir wirklich viel.',
  coffee_count: 'Du hast den Entwickler {n}-mal eingeladen',
  coffee_thanks_close: 'Gern geschehen!',
  coffee_error_title: 'Kauf fehlgeschlagen',
  supporter_info_link: 'Was bringt das?',
  supporter_info_title: 'Supporter-Status ☕',
  supporter_info_body:
    'Du erhältst dauerhaft den Supporter-Status: ein goldenes Sieges-Feuerwerk, einen herzlichen Dankesbildschirm und einen Kaffeezähler. Es ist einfach eine Möglichkeit, die Entwicklung zu unterstützen – ohne ihn ist das Spiel völlig kostenlos.',
  supporter_info_restore:
    'Schon einmal gekauft? Öffne Einstellungen → „Käufe wiederherstellen".',
  restore_purchases: 'Käufe wiederherstellen',
  restore_hint: 'Supporter-Status nach einer Neuinstallation zurückholen',
  restore_title: 'Wiederherstellen',
  restore_done: 'Supporter-Status wiederhergestellt ☕',
  restore_none: 'Keine Käufe zum Wiederherstellen gefunden',
  restore_error: 'Käufe konnten nicht wiederhergestellt werden',
};

const es: Dict = {
  app_title: 'Buscaminas',
  play: 'Jugar',
  online_play: 'En línea',
  rules: 'Reglas',
  settings: 'Ajustes',
  back: 'Atrás',

  game_setup: 'Configurar partida',
  board_size: 'Tamaño del tablero',
  mine_amount: 'Cantidad de minas',
  difficulty: 'Dificultad',
  easy: 'Fácil',
  normal: 'Normal',
  easy_hint: 'Una vida — se perdona la primera mina',
  normal_hint: 'Sin vidas — una mina y se acabó',

  turn_mode: 'Turno',
  parallel: 'Simultáneo',
  sequential: 'Por turnos',
  parallel_hint: 'Ambos jugadores juegan sin esperar',
  sequential_hint: 'Una casilla por turno, luego pasa el turno',

  mines_left: 'Minas',
  lives: 'Vidas',
  your_turn: 'Tu turno',
  turn_of: 'Turno de {name}',
  waiting_turn: 'Esperando al rival',

  mode_open: 'Descubrir',
  mode_flag: 'Bandera',
  mode_question: 'Interrogante',
  mode_clear: 'Limpiar',

  new_game: 'Nueva partida',
  restart: 'Reiniciar',
  save_game: 'Guardar',
  game_saved: 'Partida guardada',
  continue_game: 'Continuar',
  play_again: 'Otra vez',
  exit: 'Salir',
  menu: 'Menú',
  close: 'Cerrar',
  loading_ad: 'Cargando anuncio…',
  resume: 'Reanudar',

  you_win: '¡Ganaste!',
  you_lose: '¡Boom!',
  game_over: 'Fin de la partida',
  finish_game: 'Terminar partida',
  results: 'Resultados',
  moves: 'Jugadas',
  mines_found: 'Minas encontradas',
  you: 'Tú',
  player: 'Jugador',
  player_n: 'Jugador {n}',

  your_name: 'Tu nombre',
  name_shown_hint: 'Otros jugadores verán este nombre',
  create_room: 'Crear sala',
  join_room: 'Unirse',
  enter_code: 'Código de sala',
  room_code: 'Código de sala',
  share_code: 'Comparte el código con tu rival',
  code_copied: 'Código copiado',
  pick_seat: 'Elige asiento',
  open_seat: 'Libre',
  waiting_host: 'Esperando a que el anfitrión empiece',
  start_game: 'Empezar partida',
  connecting: 'Conectando…',
  online_error: 'Error de conexión',
  online_unavailable: 'En línea no disponible — servidor no configurado',
  or: 'o',
  host_settings: 'Ajustes de la partida (anfitrión)',

  rules_intro:
    'Descubre casillas sin pisar una mina. El número indica cuántas minas hay al lado.',
  rule_reveal: 'Toca para descubrir una casilla.',
  rule_mark: 'Mantén pulsado — bandera → «?» → quitar.',
  rule_flood: 'Las zonas vacías se abren automáticamente.',
  rule_lives: 'En fácil se perdona la primera mina (una vida).',
  rule_mp_split:
    'En línea el tablero se reparte por igual: solo juegas con tus casillas.',
  rule_mp_emoji: 'Cuando el rival marca «?», envíale un emoji en esa casilla.',
  rule_win: 'Ganas cuando todas las casillas seguras están descubiertas.',

  dark_mode: 'Tema oscuro',
  language: 'Idioma',
  embedded: 'integrado',
  unlock_title: 'Código secreto',
  unlock_body: 'Introduce un código para quitar los anuncios.',
  unlock_placeholder: 'Introduce el código',
  unlock_submit: 'Aplicar',
  unlock_wrong: 'Código no válido',
  unlock_done: 'Anuncios eliminados ✓',
  cancel: 'Cancelar',
  board_theme: 'Color del tablero',
  downloading_update: 'Descargando actualización…',
  agreement: 'Condiciones de uso',
  agreement_hint: 'Condiciones de uso y datos',
  agreement_link: 'Al jugar, aceptas las condiciones de uso',
  buy_coffee: '☕ Invita a un café al desarrollador',
  buy_coffee_again: '☕ Otro café para el desarrollador',
  buy_coffee_hint: 'Desbloquea el estado de supporter, para siempre',
  buy_coffee_again_hint: '¡Gracias por el apoyo! Cafés: {n} · invita otro',
  coffee_thanks_title: '¡Gracias! ❤️',
  coffee_thanks_body: 'Gracias por el apoyo: significa muchísimo.',
  coffee_count: 'Has invitado al autor {n} vez/veces',
  coffee_thanks_close: '¡De nada!',
  coffee_error_title: 'La compra ha fallado',
  supporter_info_link: '¿Qué obtienes?',
  supporter_info_title: 'Estado de supporter ☕',
  supporter_info_body:
    'Obtienes el estado de supporter para siempre: fuegos artificiales dorados al ganar, una cálida pantalla de agradecimiento y un contador de cafés. Es simplemente una forma de apoyar el desarrollo; sin ello el juego es totalmente gratis.',
  supporter_info_restore:
    '¿Ya compraste antes? Abre Ajustes → «Restaurar compras».',
  restore_purchases: 'Restaurar compras',
  restore_hint: 'Recupera el estado de supporter tras reinstalar',
  restore_title: 'Restaurar',
  restore_done: 'Estado de supporter restaurado ☕',
  restore_none: 'No hay compras para restaurar',
  restore_error: 'No se pudieron restaurar las compras',
};

const uk: Dict = {
  app_title: 'Сапер',
  play: 'Грати',
  online_play: 'Онлайн',
  rules: 'Правила',
  settings: 'Налаштування',
  back: 'Назад',

  game_setup: 'Налаштування гри',
  board_size: 'Розмір поля',
  mine_amount: 'Кількість мін',
  difficulty: 'Складність',
  easy: 'Легкий',
  normal: 'Звичайний',
  easy_hint: 'Одне життя — перша міна прощається',
  normal_hint: 'Без життів — одна міна, і все',

  turn_mode: 'Хід',
  parallel: 'Одночасно',
  sequential: 'По черзі',
  parallel_hint: 'Обидва гравці грають без очікування',
  sequential_hint: 'Одна клітинка за хід, потім передача ходу',

  mines_left: 'Міни',
  lives: 'Життя',
  your_turn: 'Ваш хід',
  turn_of: 'Ходить: {name}',
  waiting_turn: 'Чекаємо суперника',

  mode_open: 'Відкрити',
  mode_flag: 'Прапорець',
  mode_question: 'Знак питання',
  mode_clear: 'Очистити',

  new_game: 'Нова гра',
  restart: 'Спочатку',
  save_game: 'Зберегти',
  game_saved: 'Гру збережено',
  continue_game: 'Продовжити',
  play_again: 'Ще раз',
  exit: 'Вихід',
  menu: 'Меню',
  close: 'Закрити',
  loading_ad: 'Завантаження реклами…',
  resume: 'Продовжити',

  you_win: 'Перемога!',
  you_lose: 'Вибух!',
  game_over: 'Гру завершено',
  finish_game: 'Завершити гру',
  results: 'Результати',
  moves: 'Ходи',
  mines_found: 'Знайдено мін',
  you: 'Ви',
  player: 'Гравець',
  player_n: 'Гравець {n}',

  your_name: 'Ваше імʼя',
  name_shown_hint: 'Імʼя побачать інші гравці',
  create_room: 'Створити кімнату',
  join_room: 'Увійти',
  enter_code: 'Код кімнати',
  room_code: 'Код кімнати',
  share_code: 'Поділіться кодом із суперником',
  code_copied: 'Код скопійовано',
  pick_seat: 'Займіть місце',
  open_seat: 'Вільно',
  waiting_host: 'Чекаємо, поки хост почне гру',
  start_game: 'Почати гру',
  connecting: 'Підключення…',
  online_error: 'Помилка підключення',
  online_unavailable: 'Онлайн недоступний — сервер не налаштовано',
  or: 'або',
  host_settings: 'Налаштування гри (хост)',

  rules_intro:
    'Відкривайте клітинки й не наступіть на міну. Число показує, скільки мін поряд.',
  rule_reveal: 'Дотик — відкрити клітинку.',
  rule_mark: 'Довге натискання — прапорець → «?» → зняти.',
  rule_flood: 'Порожні ділянки відкриваються автоматично.',
  rule_lives: 'На легкому рівні перша міна прощається (одне життя).',
  rule_mp_split:
    'В онлайні поле ділиться порівну: кожен грає лише зі своїми клітинками.',
  rule_mp_emoji: 'Якщо суперник поставив «?», надішліть йому емодзі на цю клітинку.',
  rule_win: 'Перемагаєте, коли відкрито всі безпечні клітинки.',

  dark_mode: 'Темна тема',
  language: 'Мова',
  embedded: 'вбудований',
  unlock_title: 'Секретний код',
  unlock_body: 'Введіть код, щоб прибрати рекламу.',
  unlock_placeholder: 'Введіть код',
  unlock_submit: 'Застосувати',
  unlock_wrong: 'Невірний код',
  unlock_done: 'Рекламу вимкнено ✓',
  cancel: 'Скасувати',
  board_theme: 'Тема поля',
  downloading_update: 'Завантаження оновлення…',
  agreement: 'Угода про використання',
  agreement_hint: 'Умови використання та дані',
  agreement_link: 'Граючи, ви приймаєте умови використання',
  buy_coffee: '☕ Пригости розробника кавою',
  buy_coffee_again: '☕ Ще кава розробнику',
  buy_coffee_hint: 'Відкриває статус supporter — назавжди',
  buy_coffee_again_hint: 'Дякуємо за підтримку! Кави: {n} · можна ще',
  coffee_thanks_title: 'Дякую! ❤️',
  coffee_thanks_body: 'Дякую за підтримку — це справді дуже приємно.',
  coffee_count: 'Ви пригостили автора {n} разів',
  coffee_thanks_close: 'На здоровʼя!',
  coffee_error_title: 'Не вдалося виконати покупку',
  supporter_info_link: 'Що це дає?',
  supporter_info_title: 'Статус supporter ☕',
  supporter_info_body:
    'Ви отримуєте статус supporter назавжди: золотий салют під час перемоги, теплий екран подяки та лічильник випитої кави. Це просто спосіб підтримати розробку — без нього гра повністю безкоштовна.',
  supporter_info_restore:
    'Уже купували раніше? Відкрийте Налаштування → «Відновити покупки».',
  restore_purchases: 'Відновити покупки',
  restore_hint: 'Повернути статус supporter після перевстановлення',
  restore_title: 'Відновлення',
  restore_done: 'Статус supporter відновлено ☕',
  restore_none: 'Покупок для відновлення не знайдено',
  restore_error: 'Не вдалося відновити покупки',
};

const pl: Dict = {
  app_title: 'Saper',
  play: 'Graj',
  online_play: 'Online',
  rules: 'Zasady',
  settings: 'Ustawienia',
  back: 'Wstecz',

  game_setup: 'Ustawienia gry',
  board_size: 'Rozmiar planszy',
  mine_amount: 'Liczba min',
  difficulty: 'Poziom trudności',
  easy: 'Łatwy',
  normal: 'Normalny',
  easy_hint: 'Jedno życie — pierwsza mina wybaczona',
  normal_hint: 'Bez żyć — jedna mina i koniec',

  turn_mode: 'Ruch',
  parallel: 'Jednocześnie',
  sequential: 'Na zmianę',
  parallel_hint: 'Obaj gracze grają bez czekania',
  sequential_hint: 'Jedno pole na turę, potem zmiana',

  mines_left: 'Miny',
  lives: 'Życia',
  your_turn: 'Twój ruch',
  turn_of: 'Ruch: {name}',
  waiting_turn: 'Czekamy na rywala',

  mode_open: 'Odkryj',
  mode_flag: 'Flaga',
  mode_question: 'Znak zapytania',
  mode_clear: 'Wyczyść',

  new_game: 'Nowa gra',
  restart: 'Od nowa',
  save_game: 'Zapisz',
  game_saved: 'Gra zapisana',
  continue_game: 'Kontynuuj',
  play_again: 'Jeszcze raz',
  exit: 'Wyjście',
  menu: 'Menu',
  close: 'Zamknij',
  loading_ad: 'Ładowanie reklamy…',
  resume: 'Wznów',

  you_win: 'Wygrana!',
  you_lose: 'Bum!',
  game_over: 'Koniec gry',
  finish_game: 'Zakończ grę',
  results: 'Wyniki',
  moves: 'Ruchy',
  mines_found: 'Znalezione miny',
  you: 'Ty',
  player: 'Gracz',
  player_n: 'Gracz {n}',

  your_name: 'Twoje imię',
  name_shown_hint: 'Inni gracze zobaczą tę nazwę',
  create_room: 'Utwórz pokój',
  join_room: 'Dołącz',
  enter_code: 'Kod pokoju',
  room_code: 'Kod pokoju',
  share_code: 'Udostępnij kod rywalowi',
  code_copied: 'Kod skopiowany',
  pick_seat: 'Zajmij miejsce',
  open_seat: 'Wolne',
  waiting_host: 'Czekamy, aż host rozpocznie grę',
  start_game: 'Rozpocznij grę',
  connecting: 'Łączenie…',
  online_error: 'Błąd połączenia',
  online_unavailable: 'Online niedostępny — serwer nie skonfigurowany',
  or: 'lub',
  host_settings: 'Ustawienia gry (host)',

  rules_intro:
    'Odkrywaj pola i nie nadepnij na minę. Liczba pokazuje, ile min sąsiaduje.',
  rule_reveal: 'Dotknij — odkryj pole.',
  rule_mark: 'Długie przytrzymanie — flaga → «?» → usuń.',
  rule_flood: 'Puste obszary otwierają się automatycznie.',
  rule_lives: 'Na łatwym pierwsza mina jest wybaczona (jedno życie).',
  rule_mp_split:
    'Online plansza dzieli się po równo: grasz tylko swoimi polami.',
  rule_mp_emoji: 'Gdy rywal postawi «?», wyślij mu emoji na to pole.',
  rule_win: 'Wygrywasz, gdy odkryjesz wszystkie bezpieczne pola.',

  dark_mode: 'Ciemny motyw',
  language: 'Język',
  embedded: 'wbudowany',
  unlock_title: 'Tajny kod',
  unlock_body: 'Wpisz kod, aby usunąć reklamy.',
  unlock_placeholder: 'Wpisz kod',
  unlock_submit: 'Zastosuj',
  unlock_wrong: 'Nieprawidłowy kod',
  unlock_done: 'Reklamy usunięte ✓',
  cancel: 'Anuluj',
  board_theme: 'Motyw planszy',
  downloading_update: 'Pobieranie aktualizacji…',
  agreement: 'Warunki użytkowania',
  agreement_hint: 'Warunki użytkowania i dane',
  agreement_link: 'Grając, akceptujesz warunki użytkowania',
  buy_coffee: '☕ Postaw deweloperowi kawę',
  buy_coffee_again: '☕ Kolejna kawa dla dewelopera',
  buy_coffee_hint: 'Odblokowuje status supporter — na zawsze',
  buy_coffee_again_hint: 'Dzięki za wsparcie! Kawy: {n} · możesz więcej',
  coffee_thanks_title: 'Dziękuję! ❤️',
  coffee_thanks_body: 'Dziękuję za wsparcie — to naprawdę wiele znaczy.',
  coffee_count: 'Postawiłeś autorowi {n} raz(y)',
  coffee_thanks_close: 'Nie ma za co!',
  coffee_error_title: 'Zakup nie powiódł się',
  supporter_info_link: 'Co to daje?',
  supporter_info_title: 'Status supporter ☕',
  supporter_info_body:
    'Otrzymujesz status supporter na zawsze: złote fajerwerki przy zwycięstwie, ciepły ekran podziękowania i licznik kaw. To po prostu sposób na wsparcie rozwoju — bez tego gra jest całkowicie darmowa.',
  supporter_info_restore:
    'Kupowałeś wcześniej? Otwórz Ustawienia → „Przywróć zakupy".',
  restore_purchases: 'Przywróć zakupy',
  restore_hint: 'Odzyskaj status supporter po ponownej instalacji',
  restore_title: 'Przywracanie',
  restore_done: 'Status supporter przywrócony ☕',
  restore_none: 'Brak zakupów do przywrócenia',
  restore_error: 'Nie udało się przywrócić zakupów',
};

const sk: Dict = {
  app_title: 'Míny',
  play: 'Hrať',
  online_play: 'Online',
  rules: 'Pravidlá',
  settings: 'Nastavenia',
  back: 'Späť',

  game_setup: 'Nastavenie hry',
  board_size: 'Veľkosť poľa',
  mine_amount: 'Počet mín',
  difficulty: 'Obtiažnosť',
  easy: 'Ľahká',
  normal: 'Normálna',
  easy_hint: 'Jeden život — prvá mína je odpustená',
  normal_hint: 'Bez životov — jedna mína a koniec',

  turn_mode: 'Ťah',
  parallel: 'Súčasne',
  sequential: 'Na striedačku',
  parallel_hint: 'Obaja hráči hrajú bez čakania',
  sequential_hint: 'Jedno políčko na ťah, potom sa strieda',

  mines_left: 'Míny',
  lives: 'Životy',
  your_turn: 'Tvoj ťah',
  turn_of: 'Na ťahu: {name}',
  waiting_turn: 'Čakáme na súpera',

  mode_open: 'Odkryť',
  mode_flag: 'Vlajka',
  mode_question: 'Otáznik',
  mode_clear: 'Vymazať',

  new_game: 'Nová hra',
  restart: 'Odznova',
  save_game: 'Uložiť',
  game_saved: 'Hra uložená',
  continue_game: 'Pokračovať',
  play_again: 'Znova',
  exit: 'Odísť',
  menu: 'Menu',
  close: 'Zavrieť',
  loading_ad: 'Načítava sa reklama…',
  resume: 'Pokračovať',

  you_win: 'Výhra!',
  you_lose: 'Bum!',
  game_over: 'Koniec hry',
  finish_game: 'Ukončiť hru',
  results: 'Výsledky',
  moves: 'Ťahy',
  mines_found: 'Nájdené míny',
  you: 'Ty',
  player: 'Hráč',
  player_n: 'Hráč {n}',

  your_name: 'Tvoje meno',
  name_shown_hint: 'Ostatní hráči uvidia toto meno',
  create_room: 'Vytvoriť miestnosť',
  join_room: 'Pripojiť sa',
  enter_code: 'Kód miestnosti',
  room_code: 'Kód miestnosti',
  share_code: 'Zdieľaj kód so súperom',
  code_copied: 'Kód skopírovaný',
  pick_seat: 'Vyber miesto',
  open_seat: 'Voľné',
  waiting_host: 'Čakáme, kým hostiteľ začne hru',
  start_game: 'Začať hru',
  connecting: 'Pripájanie…',
  online_error: 'Chyba pripojenia',
  online_unavailable: 'Online nie je dostupné — server nie je nastavený',
  or: 'alebo',
  host_settings: 'Nastavenia hry (hostiteľ)',

  rules_intro:
    'Odkrývaj políčka a nestúp na mínu. Číslo ukazuje, koľko mín susedí.',
  rule_reveal: 'Ťuknutie — odkryť políčko.',
  rule_mark: 'Dlhé podržanie — vlajka → «?» → zrušiť.',
  rule_flood: 'Prázdne oblasti sa otvárajú automaticky.',
  rule_lives: 'Na ľahkej úrovni je prvá mína odpustená (jeden život).',
  rule_mp_split:
    'Online sa pole delí rovnomerne: hráš len so svojimi políčkami.',
  rule_mp_emoji: 'Keď súper označí «?», pošli mu emoji na toto políčko.',
  rule_win: 'Vyhráš, keď sú odkryté všetky bezpečné políčka.',

  dark_mode: 'Tmavý motív',
  language: 'Jazyk',
  embedded: 'vstavaný',
  unlock_title: 'Tajný kód',
  unlock_body: 'Zadaj kód na odstránenie reklám.',
  unlock_placeholder: 'Zadajte kód',
  unlock_submit: 'Použiť',
  unlock_wrong: 'Neplatný kód',
  unlock_done: 'Reklamy odstránené ✓',
  cancel: 'Zrušiť',
  board_theme: 'Farba poľa',
  downloading_update: 'Sťahovanie aktualizácie…',
  agreement: 'Podmienky používania',
  agreement_hint: 'Podmienky používania a údaje',
  agreement_link: 'Hraním prijímaš podmienky používania',
  buy_coffee: '☕ Kúp vývojárovi kávu',
  buy_coffee_again: '☕ Ďalšia káva pre vývojára',
  buy_coffee_hint: 'Odomkne status supporter — navždy',
  buy_coffee_again_hint: 'Ďakujeme za podporu! Kávy: {n} · môžeš viac',
  coffee_thanks_title: 'Ďakujem! ❤️',
  coffee_thanks_body: 'Ďakujem za podporu — naozaj si to veľmi vážim.',
  coffee_count: 'Pohostili ste autora {n}-krát',
  coffee_thanks_close: 'Rado sa stalo!',
  coffee_error_title: 'Nákup zlyhal',
  supporter_info_link: 'Čo to dáva?',
  supporter_info_title: 'Status supporter ☕',
  supporter_info_body:
    'Získate status supporter navždy: zlatý ohňostroj pri výhre, milú obrazovku poďakovania a počítadlo káv. Je to jednoducho spôsob, ako podporiť vývoj — bez neho je hra úplne zadarmo.',
  supporter_info_restore:
    'Kupovali ste už predtým? Otvorte Nastavenia → „Obnoviť nákupy".',
  restore_purchases: 'Obnoviť nákupy',
  restore_hint: 'Získajte status supporter späť po preinštalovaní',
  restore_title: 'Obnovenie',
  restore_done: 'Status supporter obnovený ☕',
  restore_none: 'Nenašli sa žiadne nákupy na obnovenie',
  restore_error: 'Nákupy sa nepodarilo obnoviť',
};

export const translations: Record<Language, Dict> = { ru, en, de, es, uk, pl, sk };

export const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  uk: 'Українська',
  pl: 'Polski',
  sk: 'Slovenčina',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  uk: '🇺🇦',
  pl: '🇵🇱',
  sk: '🇸🇰',
};

export function t(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  let value = translations[lang][key] ?? translations.ru[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

/** Full terms-of-use text per language (shown on the Agreement screen). */
export const agreementByLang: Record<Language, { title: string; body: string }> = {
  ru: {
    title: 'Соглашение об использовании',
    body:
      'Это приложение — игра «Сапёр»: локальная (на одном устройстве) и онлайн-мультиплеер.\n\n' +
      'Локальная игра работает полностью офлайн: настройки, метки и сохранения хранятся только на вашем устройстве и удаляются вместе с приложением.\n\n' +
      'Онлайн-игра: чтобы синхронизировать партию между игроками, ваши ходы, выбранное имя и код комнаты передаются в реальном времени через сторонний облачный сервис. Эти данные нужны только для проведения матча, не привязаны к аккаунту и не хранятся у разработчика после игры. Не указывайте в имени персональные данные.\n\n' +
      'Реклама: приложение показывает рекламу через Google AdMob, который может использовать рекламный идентификатор устройства.\n\n' +
      'Приложение предоставляется «как есть», без каких-либо гарантий. Разработчик не несёт ответственности за трактовку правил, ход партий, поведение других игроков в онлайне, а также за любой прямой или косвенный ущерб, связанный с использованием приложения.\n\n' +
      'Запуская и используя приложение, вы подтверждаете своё согласие с настоящими условиями.',
  },
  en: {
    title: 'Terms of use',
    body:
      'This app is a game of Minesweeper: local (on one device) and online multiplayer.\n\n' +
      'Local play works fully offline: settings, marks and saves are kept only on your device and are removed together with the app.\n\n' +
      'Online play: to sync a match between players, your moves, chosen name and room code are sent in real time through a third-party cloud service. This data is used only to run the match, is not tied to an account, and is not stored by the developer after the game. Do not put personal data in your name.\n\n' +
      'Ads: the app shows ads via Google AdMob, which may use your device advertising identifier.\n\n' +
      'The app is provided "as is", without any warranties. The developer is not responsible for the interpretation of the rules, the course of matches, the behaviour of other players online, or for any direct or indirect damage related to the use of the app.\n\n' +
      'By launching and using the app, you confirm your agreement with these terms.',
  },
  de: {
    title: 'Nutzungsbedingungen',
    body:
      'Diese App ist ein Minesweeper-Spiel: lokal (auf einem Gerät) und Online-Mehrspieler.\n\n' +
      'Das lokale Spiel funktioniert vollständig offline: Einstellungen, Markierungen und Spielstände werden nur auf deinem Gerät gespeichert und mit der App entfernt.\n\n' +
      'Online-Spiel: Um eine Partie zu synchronisieren, werden deine Züge, dein gewählter Name und der Raumcode in Echtzeit über einen Cloud-Dienst eines Drittanbieters übertragen. Diese Daten dienen nur der Durchführung des Spiels, sind an kein Konto gebunden und werden vom Entwickler nach dem Spiel nicht gespeichert. Gib keine persönlichen Daten als Namen an.\n\n' +
      'Werbung: Die App zeigt Werbung über Google AdMob, das die Werbe-ID deines Geräts verwenden kann.\n\n' +
      'Die App wird „wie besehen“ ohne jegliche Gewährleistung bereitgestellt. Der Entwickler haftet nicht für die Auslegung der Regeln, den Verlauf der Partien, das Verhalten anderer Spieler online oder für direkte oder indirekte Schäden im Zusammenhang mit der Nutzung der App.\n\n' +
      'Mit dem Start und der Nutzung der App bestätigst du dein Einverständnis mit diesen Bedingungen.',
  },
  es: {
    title: 'Condiciones de uso',
    body:
      'Esta app es un juego de Buscaminas: local (en un dispositivo) y multijugador en línea.\n\n' +
      'El juego local funciona totalmente sin conexión: los ajustes, las marcas y las partidas guardadas se almacenan solo en tu dispositivo y se eliminan junto con la app.\n\n' +
      'Juego en línea: para sincronizar una partida, tus movimientos, el nombre elegido y el código de sala se envían en tiempo real a través de un servicio en la nube de terceros. Estos datos se usan solo para desarrollar la partida, no están vinculados a ninguna cuenta y el desarrollador no los conserva después del juego. No incluyas datos personales en tu nombre.\n\n' +
      'Anuncios: la app muestra anuncios mediante Google AdMob, que puede usar el identificador de publicidad de tu dispositivo.\n\n' +
      'La app se ofrece «tal cual», sin garantías de ningún tipo. El desarrollador no se responsabiliza de la interpretación de las reglas, del transcurso de las partidas, del comportamiento de otros jugadores en línea, ni de ningún daño directo o indirecto relacionado con el uso de la app.\n\n' +
      'Al iniciar y usar la app, confirmas tu aceptación de estas condiciones.',
  },
  uk: {
    title: 'Угода про використання',
    body:
      'Цей застосунок — гра «Сапер»: локальна (на одному пристрої) та онлайн-мультиплеєр.\n\n' +
      'Локальна гра працює повністю офлайн: налаштування, позначки та збереження зберігаються лише на вашому пристрої й видаляються разом із застосунком.\n\n' +
      'Онлайн-гра: щоб синхронізувати партію, ваші ходи, вибране імʼя та код кімнати передаються в реальному часі через сторонній хмарний сервіс. Ці дані потрібні лише для проведення матчу, не привʼязані до акаунта й не зберігаються розробником після гри. Не вказуйте в імені персональні дані.\n\n' +
      'Реклама: застосунок показує рекламу через Google AdMob, який може використовувати рекламний ідентифікатор пристрою.\n\n' +
      'Застосунок надається «як є», без жодних гарантій. Розробник не несе відповідальності за трактування правил, хід партій, поведінку інших гравців онлайн, а також за будь-яку пряму чи непряму шкоду, повʼязану з використанням застосунку.\n\n' +
      'Запускаючи та використовуючи застосунок, ви підтверджуєте свою згоду з цими умовами.',
  },
  pl: {
    title: 'Warunki użytkowania',
    body:
      'Ta aplikacja to gra Saper: lokalna (na jednym urządzeniu) i wieloosobowa online.\n\n' +
      'Gra lokalna działa całkowicie offline: ustawienia, oznaczenia i zapisy są przechowywane tylko na Twoim urządzeniu i są usuwane wraz z aplikacją.\n\n' +
      'Gra online: aby zsynchronizować rozgrywkę, Twoje ruchy, wybrana nazwa i kod pokoju są przesyłane w czasie rzeczywistym przez zewnętrzną usługę w chmurze. Dane te służą wyłącznie do przeprowadzenia rozgrywki, nie są powiązane z kontem i nie są przechowywane przez dewelopera po grze. Nie podawaj danych osobowych w nazwie.\n\n' +
      'Reklamy: aplikacja wyświetla reklamy przez Google AdMob, który może używać identyfikatora reklamowego urządzenia.\n\n' +
      'Aplikacja jest dostarczana „tak jak jest”, bez żadnych gwarancji. Deweloper nie ponosi odpowiedzialności za interpretację zasad, przebieg rozgrywek, zachowanie innych graczy online ani za jakiekolwiek bezpośrednie lub pośrednie szkody związane z korzystaniem z aplikacji.\n\n' +
      'Uruchamiając i używając aplikacji, potwierdzasz akceptację tych warunków.',
  },
  sk: {
    title: 'Podmienky používania',
    body:
      'Táto aplikácia je hra Míny: lokálna (na jednom zariadení) a online pre viacerých hráčov.\n\n' +
      'Lokálna hra funguje úplne offline: nastavenia, značky a uložené hry sa uchovávajú len vo vašom zariadení a odstránia sa spolu s aplikáciou.\n\n' +
      'Online hra: na synchronizáciu partie sa vaše ťahy, zvolené meno a kód miestnosti prenášajú v reálnom čase cez cloudovú službu tretej strany. Tieto údaje slúžia len na priebeh hry, nie sú viazané na účet a vývojár ich po hre neuchováva. Neuvádzajte v mene osobné údaje.\n\n' +
      'Reklamy: aplikácia zobrazuje reklamy cez Google AdMob, ktorý môže používať reklamný identifikátor zariadenia.\n\n' +
      'Aplikácia sa poskytuje „tak ako je“, bez akýchkoľvek záruk. Vývojár nezodpovedá za výklad pravidiel, priebeh partií, správanie iných hráčov online ani za akúkoľvek priamu či nepriamu škodu súvisiacu s používaním aplikácie.\n\n' +
      'Spustením a používaním aplikácie potvrdzujete svoj súhlas s týmito podmienkami.',
  },
};
