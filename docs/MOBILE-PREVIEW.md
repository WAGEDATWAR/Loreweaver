# Mobile preview builds

Every milestone completion ships a debug APK so the surface can be evaluated on a real phone. The APK
is a preview, not a release: it is debug-signed, installs alongside nothing, and is git-ignored.

Owner: `PLAN.md` "Milestone previews". Tooling lives in `scripts/build-apk.sh` + `scripts/build.mjs`.

## What the build is

The app has no bundler, so the "web bundle" is a straight copy. `scripts/bundle.mjs` copies
`index.html`, `src/` and the favicons into `www/`; `npx cap sync android` puts that payload into the
Android assets and the Capacitor shell loads it from `https://localhost`. Everything is packaged, so the
APK works offline and the tokenizer worker's vendored rank files travel with it.

Carried over from the web app unchanged:

- IndexedDB primary storage with the `localStorage` fallback and the namespace migration.
- The file `<input>` import path and download-based exports (File System Access is absent on Android).
- The real worker tokenizer.

## Commands

| Command | Does |
|---|---|
| `npm run apk:dry` | verifies SDK, JDK and gradle wiring, no compile |
| `npm run apk` / `npm run apk:debug` | bundles, syncs, and assembles a debug APK |
| `npm run apk:install` | same, then `adb install -r` to the connected device |

Artifacts land in `android/dist/loreweaver-preview_<variant>_<utcstamp>_<shorthash>.apk`, named from the
commit so a preview is identifiable. `versionCode` is the commit count and `versionName` mirrors
`package.json`; both are rewritten at build time. Override the name with `BUILD_STRING`.

Requirements: the Android SDK (`ANDROID_HOME` or the default `%LOCALAPPDATA%\Android\Sdk`), a JDK 17+,
and Git Bash on Windows (`BASH_PATH` overrides the lookup).

## Milestone rule

1. The milestone's gate is green on `main` **before** an APK is cut.
2. Build the APK, install it, and record the filename and the commit in `CHANGELOG.md` under that
   milestone.
3. A preview does not block the next milestone; it is an evaluation artifact.

The release build (`npm run apk -- --variant release`) stays unsigned until a keystore is configured; use
the debug APK for evaluation until then.

## Known preview limits

- Debug-signed, so it cannot update over a release install.
- CDP-driven e2e does not run on the device; the browser suite is the regression gate and the APK covers
  device-only behavior.
- No share-sheet wiring yet (DEF-066); imports and exports go through the file picker and downloads.
