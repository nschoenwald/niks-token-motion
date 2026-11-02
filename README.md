# Nik's Token Motion

A FoundryVTT module that makes token movement feel smooth and tactile. Tokens speed up and slow down along their whole
path instead of moving at one constant speed, long moves no longer crawl across the map, and tokens can be lifted and
set down like chess pieces or hop square by square like miniatures on a table.

---

## Compatibility

- **Foundry VTT**: V14
- **System**: System-agnostic (works with any game system)
- **Recommended**: [libWrapper](https://foundryvtt.com/packages/lib-wrapper)

---

## Features

### Movement styles

Pick one for the world with **Movement Style**:

| Style | What you see |
|---|---|
| **Step** (default) | The token hops one grid space at a time like a miniature: lift, carry, set down, short rest, next space. |
| **Lift & Place** | The token is lifted off the table, carried along the Glide curve and set down with a small settle, like a chess piece. |
| **Glide** | The token speeds up, cruises and slows down smoothly over the whole path. |
| **Foundry default** | Foundry's own animation, unchanged. |

Lifting is purely visual: the token looks bigger, rises slightly and casts a soft shadow on the table. Its elevation,
vision and position on the map are never changed by it.

With **Step**:

- Flying and jumping tokens, and every move on a gridless scene, use **Lift & Place**, since they don't tap from
  space to space.
- Long moves use shorter hops so they stay within the **Maximum Move Duration**. When that isn't enough, the token
  hops two spaces at a time, and moves over 50 spaces use Lift & Place.
- Hops land on grid spaces. If hopping would cut a wall corner, the token moves straight along that stretch instead.

### Faster long moves

Foundry moves every token at a constant 6 grid spaces per second, with no easing. With Glide and Lift & Place, a token
accelerates at the start of a move, cruises at up to the **Top Speed**, and decelerates at the end. The curve covers
the whole path: tokens don't stop and restart at waypoints or region boundaries.

Because the speed builds up over the move, long moves get much faster while short moves stay readable. With the
default settings:

| Distance | Foundry default | Glide / Lift & Place | Step |
|---|---|---|---|
| 1 space | 0.17 s | 0.32 s | 0.22 s |
| 5 spaces | 0.83 s | 0.71 s | 1.1 s |
| 30 spaces | 5.0 s | 1.85 s | about 3 s (two spaces per hop) |
| 100 spaces | 16.7 s | 3.0 s (capped) | 3.0 s (Lift & Place) |

What still works as before:

- Slower movement actions (such as crawling or swimming) and difficult terrain still slow the token down, and
  teleporting movement is still instant.
- Macros and modules that set their own animation duration or speed keep their timing.
- Keyboard moves keep Foundry's default speed unless you choose otherwise.

### Drag preview

While you drag a token, the preview glides toward the grid space under your cursor instead of jumping from space to
space. Choose **Snappy**, **Smooth** or **Off** per user. Unless the Movement Style is Foundry default, the preview is
also lifted while you hold it. With Lift & Place and Step it stays lifted on your screen after you let go, until it is
set down. This only changes how the preview looks; snapping, the ruler and the final position are unchanged.

---

## Settings

| Setting | Scope | Default | Description |
|---|---|---|---|
| Movement Style | World | Step | Step, Lift & Place, Glide or Foundry default. |
| Apply To | World | All moves except keyboard | Dragged tokens only, all moves except keyboard, or all moves. |
| Top Speed | World | 24 spaces/s | Glide and Lift & Place: the fastest a token moves on long moves. |
| Acceleration | World | 40 spaces/s² | Glide and Lift & Place: how quickly tokens speed up and slow down. |
| Maximum Move Duration | World | 3 s | Very long moves are sped up to fit. 0 means no limit. |
| Hop Duration | World | 220 ms | Step: how long one hop takes, including the short rest. |
| Lift Height | World | 8 % | How much bigger a lifted token looks. 0 turns lifting off. |
| Shadow Under Lifted Tokens | World | On | A soft shadow stays on the table below a lifted token. |
| Slow Down in Difficult Terrain | World | On | Difficult terrain slows tokens down, as in core Foundry. |
| Drag Preview Smoothing | Client | Snappy | Off, Snappy or Smooth. |

The movement settings are world settings so every player sees the same motion.

**Reset to Defaults**, at the end of the module's settings, fills in the default values for this module only. Click
**Save Changes** to apply them. Players only see their own Drag Preview Smoothing setting, so the button resets only
that one for them.

---

## Token Warp

[Token Warp](https://foundryvtt.com/packages/tokenwarp) sets an animation speed on every move. While the Movement Style
isn't Foundry default, Nik's Token Motion takes over the timing instead, so Token Warp's **Default Token Animation
Speed** and its per-actor animation speed overrides have no effect. Token Warp's settings show a note about this.

Token Warp's moves without animation still happen instantly: **No Animations**, **Walls Block**, its teleport keys
and moves clamped to the scene's edge. They exist so tokens don't reveal the map on their way, and Token Motion
doesn't animate them.

Set the Movement Style to Foundry default to use Token Warp's speeds again.

---

## Notes

- Tokens with **Auto-Rotate** still pause briefly to turn at each corner, as in core Foundry.
- If a token is moved again while it is still moving, the second move starts once the first one has finished, as in core
  Foundry.

---

## Modules by Nik

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.

### ⚔️ Combat & Token Tools
* **[Nik's Action HUD](https://github.com/nschoenwald/niks-action-hud)** – Sleek, modern canvas-docked Action HUD for quick access to attacks, spells, inventory, and utility rolls.
* **[Nik's Effects Panel](https://github.com/nschoenwald/niks-effects-panel)** – Floating panel next to the sidebar that shows the selected token's active effects, to check, disable or remove them without opening the character sheet.
* **[Nik's Token Tags](https://github.com/nschoenwald/niks-token-tags)** – Automatically numbers duplicate combatant NPCs (A, B, C…) with color-coded letter overlays.
* **[Nik's Shared NPC Initiative](https://github.com/nschoenwald/niks-shared-npc-initiative)** – Groups NPCs of the same type in combat so they share a single initiative roll.
* **[Nik's Movement Control](https://github.com/nschoenwald/niks-movement-control)** – GM controls to toggle player movement and automatically restrict/allow movement on combat start and end.
* **[Nik's Token Motion](https://github.com/nschoenwald/niks-token-motion)** – Tokens hop square by square like miniatures, lift and set down like chess pieces, or glide smoothly, and long moves no longer crawl across the map.
* **[Nik's Tiny Change Logs](https://github.com/nschoenwald/niks-tiny-changelogs)** – Compact, single-line chat messages logging token HP and Temp HP changes.

### 🎨 Visuals & Display
* **[Nik's Dynamic Roll Area](https://github.com/nschoenwald/niks-dynamic-roll-area)** – Dynamically restricts Dice So Nice 3D dice rolling area to exclude the sidebar / chat log across all screen resolutions and window sizes.

### ⚙️ Utilities & System Management
* **[Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks)** – Soft-lock and hard-lock client settings and keybindings across all connected players.
* **[Nik's Compendium Search Tweaks](https://github.com/nschoenwald/niks-compendium-search-tweaks)** – Configure which compendium packs are included or excluded from native sidebar search.
* **[Nik's Copy Environment](https://github.com/nschoenwald/niks-copy-environment)** – Copy the list of systems, modules, and versions, and export/import game and player settings.
* **[Nik's Show & Tell](https://github.com/nschoenwald/niks-show-and-tell)** – Share popout images to chat and paste image files directly into chat messages.
* **[Nik's Zoom / Pan Options](https://github.com/nschoenwald/niks-zoom-pan-options)** – Touchpad and scroll wheel pan/zoom controls and canvas navigation enhancements.
* **[Nik's Scene Transformations](https://github.com/nschoenwald/niks-scene-transformations)** – Rotate scenes or add playable space around them, with tokens, walls, lights, tiles and regions moved along so everything stays in place.
* **[Nik's Wall Height](https://github.com/nschoenwald/niks-wall-height)** – Give walls a bottom and top elevation, so tokens, lights and sounds above or below a wall ignore it.

---

## License

MIT. See [LICENSE](LICENSE).
