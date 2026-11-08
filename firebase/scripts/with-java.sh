#!/usr/bin/env bash
# Locate a Java runtime and exec the given command with it on PATH.
#
# The Firestore and Storage emulators are Java programs. Homebrew no longer
# ships a Java bottle for Intel macOS 12, so NN keeps a verified Eclipse
# Temurin JDK in the developer's home directory instead. This script finds
# whichever runtime is present so the emulators work on any machine.
set -euo pipefail

find_java_home() {
  # macOS ships a /usr/bin/java stub that exists but fails when run, so test
  # that Java actually works rather than that the file is present.
  if java -version >/dev/null 2>&1; then
    return 1
  fi
  for candidate in \
    "$HOME/.local/jdk/Contents/Home" \
    "$HOME/.local/jdk" \
    "$(/usr/libexec/java_home 2>/dev/null || true)" \
    "$(brew --prefix openjdk 2>/dev/null || true)/libexec/openjdk.jdk/Contents/Home"
  do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 2
}

if JAVA_HOME_FOUND="$(find_java_home)"; then
  export JAVA_HOME="$JAVA_HOME_FOUND"
  export PATH="$JAVA_HOME/bin:$PATH"
elif [ $? -eq 2 ]; then
  echo "error: no Java runtime found." >&2
  echo "The Firestore and Storage emulators require one. Install Eclipse" >&2
  echo "Temurin to ~/.local/jdk, or any JDK on PATH, then retry." >&2
  exit 1
fi

exec "$@"
