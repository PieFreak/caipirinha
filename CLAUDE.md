# Caipirinha: a Brazilian Portuguese practice app

A home-screen web app (PWA) for one learner, made to run on an iPhone alone and offline.
The name is the owner's choice (2026-11-21); the GitHub repository is named the same.

## What the owner decided (2026-11-21)

- **Free**: no Apple Developer account, no paid service, no API that costs money.
- **No server of the owner's**: the built files sit on a free static file host; the phone fetches them once.
- **Offline on the phone alone**: everything runs in the browser engine; progress is in `localStorage`.
  Nothing is sent anywhere.
- **No gamification**: no streaks, points or badges. The only headline number is the size of the library.
  Groups show a share (like a quiz score); words show a shade from red to green, gray before the first answer.
- **Learning from zero**, for travel and interest. Explanations are in English.
- **Spoken Brazilian is a side note**, never a section of its own: a word's note says "Spoken: …".
- **How well a word is known** (`src/lib/score.js`): +10% for a right answer, −15% for a wrong one, between 0% and
  100%. A new word starts at 0% (the owner's choice), so ten right answers in a row reach 100%.
- **Typos** in typed answers never fail outright: one letter off (two in a long answer) gives one chance to
  correct it, and a second try that is still a typo counts as right. Typing another real word ("ela" for "ele")
  is a mistake, not a typo.
- **Adding a word** shows, at every letter typed, what the app already has that matches (`src/lib/search.js`):
  the same word, then those that start with it, then those with a word that starts with it. The same word in the
  library cannot be added again; one the app has but the library lacks joins with one tap. The meaning field does
  the same for meanings. Accents and capitals do not hide a match, but "avó" and "avô" are two words.
- **Kinds of exercise are ticked**, any number of the four, all of them by default (there is no "Mixed" choice).
  Each question is one of the ticked kinds that can ask it; the ticks are remembered.
- **Session length** (`src/lib/lengths.js`): a share of the set, 5%, 10%, 25%, 50%, 75%, 100% or 200% (every word
  twice, in two rounds, each in its own random order). A set under 10 words offers only 50%, 100% and 200% (the
  owner's rule); two shares that come to the same number of questions show as one. The screen says how many
  questions the choice is. Counting and clock times have no set of words, so they are chosen by number (5 to 50).
  The assistant advised numbers; the owner chose shares.
- **The voice** is the device's own, the most natural one it lists (`src/lib/voices.js` ranks them: an iPhone lists
  eight synthesiser voices for Brazilian Portuguese beside Luciana, and the first by name is one of them). The owner
  found the voice "horrid" (2026-11-21), before the ranking. If the best device voice is still not good enough, the
  next step would be recorded audio made once with a free offline voice model and shipped with the app: not built,
  and it needs the owner's yes (a download of the model, and the app grows by several megabytes).
- **The look** (the owner's brief "Tropical Modern", 2026-11-21, a guideline and not a rule book): warm cream
  `#FFF8EE` as the ground, deep teal `#0F4C4C` for the main button and the Today header, tropical green `#32A66A`
  for progress, sunshine yellow `#FFC247` sparingly (what is heard, a tick, the count), ocean blue `#3567E8` for
  links and charts. Rounded cards with soft shadows; **almost no gradients** (the owner: "it looks ugly if
  overdone"), so depth is shadow and a lighter or darker tone. Headings and Portuguese words are set in Fraunces
  (open license, bundled); the rest is the device's own font. Drawings are the app's own SVG (`src/components/art/`):
  the scene on Today, a toucan that speaks Portuguese on empty screens and at the end of a session, and the
  backdrop behind every page (a pale sun, palm leaves, waves: the owner found plain cream "boring"). The backdrop
  is fixed, clipped to the window and in tints one step from the ground, and a session keeps only its sun and waves. The brand line is written "Aprenda português. Viva o Brasil!" (a
  language's name takes no capital in Portuguese). There is a dark theme in the same colors.
- **The review of 2026-11-21** (the owner asked for all of it): what follows came from it.
- **Judging typed answers** (`src/lib/text.js`, `judge` in `src/lib/session.js`):
  - Another word with the same meaning is right ("oi" when "hello" asks for "olá"); meanings are compared with
    their clarifiers, so "to be (permanent)" never accepts "estar".
  - Spoken short forms count: tô, tá, tava, pra, pro, cê are read as estou, está, estava, para, para o, você.
  - A missing or extra word is never a typo; only a space may be.
  - An accent that makes another word ("avô" for "avó", "esta" for "está", "e" for "é") gets one retry with a hint,
    then counts as wrong. A plain missing accent stays a slip ("voce").
  - Three o'clock may be typed "3". Every question has "I don't know".
- **Scores fade** by 1% for each whole day since a word was last practised (`faded` in `src/lib/score.js`, the
  owner's number); an answer counts from the faded score. "I know this" puts a word at 100% (on Today it also
  brings another new word, with Undo).
- **Today's header** (the owner chose design "1 · Lime" of four, 2026-11-22, after finding the dark teal header
  too strong and "a bit messy"): pale lime ground, palm leaves and a lime slice on the right, the greeting, the
  library count, and the one thing to do next with its button: continue an unfinished session (with "Start
  fresh"), else the daily review, else today's new words, else "All done for today".
- **Daily review**: up to 20 words, the weakest and the longest unseen in turn, none practised today.
- **Flashcards** (Setup › Flashcards, `src/views/Cards.vue`): flip through a set; nothing is judged or recorded
  (the owner: "it won't be correct or anything").
- **Verbs** (`src/lib/verbs.js`): present and past (pretérito perfeito), four Brazilian forms (eu; você/ele/ela/a
  gente; nós; vocês/eles/elas), picked or typed. Regular verbs by rule, irregular ones written out.
- **Example sentences** for every single word: `src/content/examples/` (part1 and part2 written by two helpers,
  part3 by hand), one line `word | Portuguese | English`. An AI wrote them; no native speaker has read them.
- **Nothing is lost**: an unfinished session is kept on the phone and offered on Today; restoring a backup asks
  first and can be undone; damaged stored data is repaired on loading (`repair` in `src/store.js`); a word keeps
  a copy of its text, so a word the content drops stays in the library; when a word's Portuguese is corrected,
  add old id → new id to `src/content/renames.js`, or its history is lost. Never change a word's first form
  without that line.
- **The font** (the owner, 2026-11-22): Lexend, made for easy reading (SIL Open Font License, bundled from
  `@fontsource-variable/lexend`), on by default for everything including headings and Portuguese words; Settings ›
  Font › Standard brings back the phone's font with Fraunces. In Lexend mode: no italics, no capitals-only labels.
  OpenDyslexic was tried first and turned down ("not the font I thought it was"); the owner liked its roomy
  spacing in the tab bar, which Lexend keeps.
- **Accessibility**: text follows the phone's text size (rem of `-apple-system-body`); Portuguese is marked
  `lang="pt-BR"`; each page sets the title and moves focus to its heading; tap targets are 44 px.
- **On a computer**: 1–4 choose, 1–9 place word tiles, Backspace takes one back, Enter checks or moves on,
  R replays, ? gives up, Esc ends; on flashcards Space turns over and the arrows move.
- Not built, because they break the rules above: an AI conversation partner, reminders sent by the app.

## Where it lives

- Repository: `github.com/PieFreak/caipirinha` (public; the free plan publishes only public repositories).
- Published by `.github/workflows/deploy.yml` at every push to `main`, to https://piefreak.github.io/caipirinha/.
- Commits here are made as `PieFreak <PieFreak@users.noreply.github.com>` (this repository's own git config),
  so no private e-mail address is published.

## Commands

- `npm run dev`: the app on http://localhost:5173 (no service worker in dev).
- `npm test`: the logic tests (answers, numbers, clock times, content lines, the service worker's rules).
- `npm run build`: writes `dist/`, with `sw.js` listing every built file (see `vite.config.js`).
- `python tools/make_icons.py`: redraws the icons; needs Pillow.

## Where things are

- `src/content/`: everything taught. One line per word: `pt [(m)|(f)] = en [~ how it sounds] [# note]`.
  A word is known by its Portuguese text, so the same word in two groups is one word with one history.
  `top1000.js` was written from knowledge, not from a published frequency list: its order is approximate.
- `src/lib/`: `text.js` (reading content lines, judging typed answers), `numbers.js` and `clock.js`
  (numbers to a million and clock times in words), `session.js` (building questions), `speech.js` (the phone's voice).
- `src/store.js`: what the phone remembers, and how well a word is known (`record`).
- `src/views/`: one file per screen.

## Not yet checked

- On a real iPhone: installing to the home screen, opening offline, the Brazilian voice, the keyboard
  opening by itself in typing questions, saving a backup through the share sheet.
- The Portuguese has not been read by a native speaker.
