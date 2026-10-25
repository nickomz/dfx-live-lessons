# DFX Live Lessons

[Español](README.es.md)

A free, open-source web app for writing **lessons that show up inside Ableton Live** when a project is opened. Built for music production teachers who want to leave their students instructions, screenshots and links right inside the set.

**Use it here: https://nickomz.github.io/dfx-live-lessons/**

## What it does

Live can show a custom lesson in a panel next to the set: pages with text, images and links. The format has been around for years, but Ableton never documented it and writing it by hand is tedious. DFX Live Lessons lets you write the lesson while seeing how it will look in Live, and gives you the files ready to use.

- **You write on a replica of Live's lesson panel.** What you see is what your student sees.
- **It only offers what Live can show:** bold, italic, bullets, images, dividers and links (to other pages, websites, email, or another Set in the same project).
- **Paste from Google Docs or Notion** and the formatting is converted to what Live understands.
- **Drag, pick or paste images** (great for Ableton screenshots). They are resized automatically.
- **Exports in all 7 languages Live supports**, with the same content, so the lesson shows up whatever language your student's Live is set to.
- **Works on desktop and mobile.**

## How to use it

1. Open the app and choose **New lesson**.
2. Build your pages: text, images and links.
3. Click **Export** and type the name of your set, exactly as the `.als` file is named (without the extension).
4. Unzip the download and move the `[Set name] Lessons` folder into the project folder, next to the `.als`:

   ```
   My Set Project/
   ├── My Set.als
   └── My Set Lessons/
       ├── LessonsEN.txt   (and the other languages)
       ├── image.png
       └── Large/
   ```

5. Open the set in Live. The lesson appears on its own.

To **edit a lesson you already have**, drag its `… Lessons` folder or its `.zip` onto the app, or use **Open** (on mobile, pick the `.zip` from Files).

**Important:** the folder name must be the set name plus ` Lessons`. Each `.als` has its own lesson. If you rename the set or use Save As, rename or duplicate the lesson folder too.

## Compatibility

- **Live 11 or later.**
- If you are on Live 12.4.0 to 12.4.4, update to the latest 12.4: those versions could crash when opening a set with a lesson.

## Privacy

Everything happens in your browser. No accounts, no server, and nothing you write leaves your computer. Your draft is saved in the browser so you don't lose your work.

## Feedback

Found a bug or have an idea? Use **Feedback** in the app's footer. It takes a minute and helps decide what comes next.

## Development

Requires Node 24 or later.

```bash
npm install
npm test
```

`npm test` runs the tests for the engine that reads and writes lessons. On a Mac with Live installed, it also round-trips every lesson that ships with Live and its Packs (without copying them into the repo).

Project docs (in Spanish):

- [`docs/BRIEF.md`](docs/BRIEF.md): what is being built, scope and done criteria.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): development stages and what comes next.
- [`docs/formato.md`](docs/formato.md): the lesson format as tested in Live 12.4.7 and 11.3.

## Support the project

It's free and will stay free. If it helps you, you can [buy me a coffee](https://paypal.me/nickomz).

## License

Code under the [MIT](LICENSE) license: you can use, modify and share it freely. The DFX logo is not covered by that license.

DFX Live Lessons is an independent project, not affiliated with or endorsed by Ableton. Ableton and Live are trademarks of Ableton AG.
