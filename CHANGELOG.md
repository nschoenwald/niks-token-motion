# Changelog

## 14.1.0

- **Works with Token Warp:** Token Motion's movement styles now take effect with Token Warp active, instead of Token Warp's animation speed. Token Warp's instant moves (No Animations, Walls Block, teleports) still stay instant.

## 14.0.0

First release.

- **Movement styles:** choose Step (the default), Lift & Place, Glide, or Foundry's default movement for the world.
- **Glide:** tokens speed up at the start of a move and slow down at the end, as one smooth motion over the whole path, including waypoints.
- **Lift & Place:** tokens are lifted off the table, carried and set down like chess pieces.
- **Step:** tokens hop one grid space at a time like miniatures. Flying and jumping tokens, gridless scenes and very long moves use Lift & Place instead.
- Lifted tokens look slightly bigger and cast a soft shadow. Lift height and the shadow are configurable, and lifting never changes a token's elevation or vision.
- **Faster long moves:** speed builds up over the move, so crossing a large map takes a couple of seconds instead of a long crawl. Top speed, acceleration, hop duration and a maximum move duration are configurable.
- Slower movement actions and difficult terrain still slow tokens down, and teleporting stays instant.
- Keyboard moves keep Foundry's default speed by default.
- **Drag preview:** the token you drag glides between grid spaces instead of jumping (Snappy, Smooth or Off, per user) and is lifted while you hold it.
- **Reset to Defaults** button in the module settings restores this module's default values.
