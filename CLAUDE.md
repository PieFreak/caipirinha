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
- **On a computer**, keys 1 to 4 pick a choice and Enter moves on.
- **Kinds of exercise are ticked**, any number of the four, all of them by default (there is no "Mixed" choice).
  Each question is one of the ticked kinds that can ask it; the ticks are remembered.
- **Session length**: 5 to 50 in fives, or all, for every set. More questions than the set has words brings the
  words round again, each round in a new random order, so every word is asked equally often (give or take one).
- **The voice** is the device's own, the most natural one it lists (`src/lib/voices.js` ranks them: an iPhone lists
  eight synthesiser voices for Brazilian Portuguese beside Luciana, and the first by name is one of them). The owner
  found the voice "horrid" (2026-11-21), before the ranking. If the best device voice is still not good enough, the
  next step would be recorded audio made once with a free offline voice model and shipped with the app: not built,
  and it needs the owner's yes (a download of the model, and the app grows by several megabytes).
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
