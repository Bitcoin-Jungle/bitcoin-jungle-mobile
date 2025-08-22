#!/usr/bin/env bash
set -euo pipefail

GRADLE_FILE="android/app/build.gradle"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

# --- helpers ---
die() { echo "❌ $*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

have git || die "git not found"
have gh  || die "GitHub CLI (gh) not found. Install & run: gh auth login"

# --- extract version info ---
[ -f "$GRADLE_FILE" ] || die "Gradle file not found at $GRADLE_FILE"

VERSION_NAME=$(grep -m1 versionName "$GRADLE_FILE" | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/') || true
VERSION_CODE=$(grep -m1 versionCode "$GRADLE_FILE" | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/') || true

[ -n "${VERSION_NAME:-}" ] || die "Could not parse versionName from $GRADLE_FILE"
[ -n "${VERSION_CODE:-}" ] || die "Could not parse versionCode from $GRADLE_FILE"

TAG="v${VERSION_NAME}"
TITLE="Release ${VERSION_NAME} (build ${VERSION_CODE})"
NOTES="Automated release of version ${VERSION_NAME}, build ${VERSION_CODE}."
APK_NAME="app-${VERSION_NAME}-b${VERSION_CODE}.apk"

echo "📦 Preparing release"
echo "  versionName: $VERSION_NAME"
echo "  versionCode: $VERSION_CODE"
echo "  tag:         $TAG"
echo "  apk name:    $APK_NAME"

# --- sanity checks for git ---
# Ensure we're on a branch that tracks a remote
git rev-parse --is-inside-work-tree >/dev/null || die "Not inside a git repo"
REMOTE="${REMOTE:-origin}"

# Optional: require clean working tree (safer for reproducibility)
if [ -z "${ALLOW_DIRTY:-}" ] && [ -n "$(git status --porcelain)" ]; then
  die "Working tree not clean. Commit/stash changes or set ALLOW_DIRTY=1 to override."
fi

# --- build APK ---
echo "🔨 Building release APK..."
( cd android && ./gradlew clean :app:assembleRelease )

[ -f "$APK_PATH" ] || die "APK not found at $APK_PATH"
cp "$APK_PATH" "$APK_NAME"
sha256sum "$APK_NAME" > "$APK_NAME.sha256"

# --- create/push tag if missing ---
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "🏷️ Tag $TAG already exists locally."
else
  echo "🏷️ Creating annotated tag $TAG..."
  git tag -a "$TAG" -m "Release $VERSION_NAME (build $VERSION_CODE)"
fi

# Push tag (idempotent)
echo "📤 Pushing tag $TAG to $REMOTE..."
git push "$REMOTE" "$TAG"

# --- create/update GitHub release ---
if gh release view "$TAG" >/dev/null 2>&1; then
  echo "📝 Release $TAG exists; will upload assets (clobber)."
else
  echo "🚀 Creating GitHub Release $TAG..."
  gh release create "$TAG" \
    --title "$TITLE" \
    --notes "$NOTES"
fi

echo "⬆️ Uploading APK + checksum..."
gh release upload "$TAG" "$APK_NAME" "$APK_NAME.sha256" --clobber

echo "✅ Done! Release $TAG with $APK_NAME is published."
echo "🔗 Tip: Point Obtainium at your repo’s Releases URL."
