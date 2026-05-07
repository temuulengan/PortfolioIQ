#!/usr/bin/env sh
# Copy the InteractionManager shim into node_modules to persist across installs
set -e
SRC="src/patches/InteractionManager.js"
DEST_DIR="node_modules/react-native/Libraries/Interaction"
DEST="$DEST_DIR/InteractionManager.js"

if [ -f "$SRC" ]; then
  mkdir -p "$DEST_DIR"
  cp "$SRC" "$DEST"
  echo "Applied InteractionManager shim to $DEST"
else
  echo "Shim source $SRC not found — skipping"
fi
