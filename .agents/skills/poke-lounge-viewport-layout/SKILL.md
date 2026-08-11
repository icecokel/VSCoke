---
name: poke-lounge-viewport-layout
description: Keep Poke Lounge browser and mobile screens, modals, menus, and growing option lists inside the actual game frame. Use when creating or changing Poke Lounge UI, responsive CSS, overlays, cards, selections, or layout tests.
---

# Poke Lounge Viewport Layout

Read `docs/poke-lounge-viewport-layout.md` before changing Poke Lounge layout code.

## Workflow

1. Treat `.gameFrame` and `#game-root` as the visual boundary; do not use browser viewport height as a substitute.
2. Make fixed game surfaces fill that boundary with a definite height and `min-height: 0` when nested grid or flex children must shrink.
3. Keep a finite control set responsive enough to fit. Give data-driven or growing lists their own constrained scroll region; never rely on page or game-root scrolling to expose controls.
4. Preserve desktop and mobile breakpoints. Check the shortest supported desktop frame and each affected mobile layout.
5. Add or update a focused Playwright assertion that the surface stays inside `#game-root` and the last item is reachable when a list can grow.
