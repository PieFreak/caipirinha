# Caipirinha

A small app for learning Brazilian Portuguese on the phone. It works offline, needs no account,
and nothing you do in it leaves the device.

- Five new words a day, with spelling, meaning and the phone's Brazilian voice.
- Practice by picking from four, typing, listening, or putting words in order, in either direction.
- Groups: greetings, common phrases, days, months, the time, counting to a million,
  and the 1 000 most common words.
- A library of every word you have met, shaded from red to green by how well you know it.
- A log of your sessions and graphs of how you are doing.

## Putting it on an iPhone

1. Open https://piefreak.github.io/caipirinha/ in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Open it from the new icon. From then on it works without a connection.

Progress is kept on the phone. Removing the icon deletes it, so save a backup now and then (Settings › Backup).

## Working on it

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build   # writes dist/
```

Every push to `main` builds and publishes the app (`.github/workflows/deploy.yml`).
The words and phrases are plain text in `src/content/`, one per line.
