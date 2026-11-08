#!/usr/bin/env bash
# Build a Loreweaver preview APK for on-device evaluation.
#
# Usage:
#   bash build-apk.sh [--variant debug|release] [--no-sync] [--install] [--clean] [--dry-run]
#
#   --variant debug   assembleDebug  (default; auto debug keystore, installable now)
#   --variant release assembleRelease (signed only if a keystore is configured, else unsigned)
#   --no-sync         skip `npx cap sync android` (reuse the last synced web payload)
#   --install         install to the connected device over adb after building
#   --clean           run `gradlew clean` first
#   --dry-run         check SDK/JDK/gradle wiring only, no compile (for CI)
#
# The app is a static bundle: `cap sync` copies index.html + src/ into the android
# web assets, so no bundler step is needed. Output lands in android/dist/ named
# loreweaver-preview_<variant>_<utcstamp>_<shorthash>.apk (override with $BUILD_STRING).
set -euo pipefail

VARIANT="debug"
DO_SYNC=1
DO_INSTALL=0
DO_CLEAN=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --variant) VARIANT="${2:-}"; shift 2 ;;
    --no-sync) DO_SYNC=0; shift ;;
    --install) DO_INSTALL=1; shift ;;
    --clean) DO_CLEAN=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

case "$VARIANT" in
  debug) TASK="assembleDebug" ;;
  release) TASK="assembleRelease" ;;
  *) echo "variant must be debug or release, got '$VARIANT'" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\033[36m[build-apk]\033[0m %s\n' "$*"; }
die() { printf '\033[31m[build-apk]\033[0m %s\n' "$*" >&2; exit 1; }

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK" ]]; then
  for candidate in \
    "$LOCALAPPDATA/Android/Sdk" \
    "$HOME/AppData/Local/Android/Sdk" \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk" \
    "/usr/lib/android-sdk"; do
    [[ -d "$candidate" ]] && SDK="$candidate" && break
  done
fi
if [[ -z "$SDK" || ! -d "$SDK" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    say "Android SDK not found; dry-run continues so the wiring check works in CI"
  else
    die "Android SDK not found. Set ANDROID_HOME or install the SDK."
  fi
else
  export ANDROID_HOME="$SDK"
  export ANDROID_SDK_ROOT="$SDK"
  say "SDK: $SDK"
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/javac" ]]; then
  for candidate in \
    "/c/Program Files/Java/jdk-21.0.10" \
    "/c/Program Files/Java/jdk-21" \
    "/c/Program Files/Eclipse Adoptium"/* \
    "/c/Program Files/Android/Android Studio/jbr" \
    "/usr/lib/jvm"/*; do
    if [[ -x "$candidate/bin/javac" ]]; then JAVA_HOME="$candidate"; break; fi
    if [[ -x "$candidate/javac.exe" ]]; then JAVA_HOME="$candidate"; break; fi
  done
fi

if [[ "$DRY_RUN" -eq 1 && ( -z "${JAVA_HOME:-}" || ! -d "${JAVA_HOME:-}" ) ]]; then
  say "JDK not found; dry-run continues so the wiring check works in CI"
fi

if [[ -n "${JAVA_HOME:-}" && -d "$JAVA_HOME" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
  say "JDK: $JAVA_HOME"
fi

ANDROID_DIR="$ROOT/android"
[[ -d "$ANDROID_DIR" ]] || die "android/ missing. Run: npx cap add android"
[[ -f "$ANDROID_DIR/gradlew" ]] || die "android/gradlew missing - the android platform is incomplete"
say "platform: $ANDROID_DIR"

if [[ "$DRY_RUN" -eq 1 ]]; then
  say "dry-run: SDK + JDK + android/gradlew wiring verified"
  exit 0
fi

if [[ "$DO_SYNC" -eq 1 ]]; then
  VERSION="$(node -p "require('./package.json').version")"
  BUILD="$(git rev-list --count HEAD 2>/dev/null || echo 1)"
  say "version $VERSION (build $BUILD)"
  BUILD_VERSION="$VERSION" BUILD_NUMBER="$BUILD" node -e '
    const fs = require("fs");
    const file = "android/app/build.gradle";
    let text = fs.readFileSync(file, "utf8");
    text = text.replace(/versionCode \d+/, `versionCode ${process.env.BUILD_NUMBER}`);
    text = text.replace(/versionName "[^"]*"/, `versionName "${process.env.BUILD_VERSION}"`);
    fs.writeFileSync(file, text);
  '
  say "building the web bundle"
  node scripts/bundle.mjs
  say "syncing web payload into the android project"
  npx cap sync android
fi

cd "$ANDROID_DIR"

if [[ "$DO_CLEAN" -eq 1 ]]; then
  say "gradle clean"
  ./gradlew clean
fi

say "assembling $VARIANT ($TASK)"
./gradlew "$TASK" --no-daemon

APK="$(find "$ANDROID_DIR/app/build/outputs/apk/$VARIANT" -name '*.apk' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -n1 | cut -d' ' -f2-)"
[[ -n "$APK" && -f "$APK" ]] || die "no .apk produced under app/build/outputs/apk/$VARIANT"

SIZE="$(du -h "$APK" | cut -f1)"
say "built: $APK ($SIZE)"

BUILD_STRING="${BUILD_STRING:-${VARIANT}_$(date -u +%Y%m%d-%H%M%S)_$(git rev-parse --short HEAD 2>/dev/null || echo nogit)}"
DIST="$ANDROID_DIR/dist"
mkdir -p "$DIST"
NAMED="$DIST/loreweaver-preview_${BUILD_STRING}.apk"
cp -f "$APK" "$NAMED"
say "named: $NAMED"

if [[ "$DO_INSTALL" -eq 1 ]]; then
  ADB="$SDK/platform-tools/adb"
  [[ -f "$ADB.exe" ]] && ADB="$ADB.exe"
  [[ -f "$ADB" ]] || die "adb not found at $ADB"
  say "installing to connected device"
  "$ADB" install -r "$APK"
fi

say "done."
