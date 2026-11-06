# Changelog

## 14.4.0

- **German translation:** the module settings are now available in German.

## 14.3.0

- **Group Speed setting:** tokens moved together, for example dragged as a group, now move at the same speed and stay side by side. By default they all move at standard speed, even if one is prone, crawling or in difficult terrain. You can instead have the whole group move at the speed of its slowest or fastest token, or let each token move at its own speed.
- With individual speeds, a slowed token now falls behind by exactly as much as it is slowed. Before, the difference shrank on short moves and almost vanished on long ones.
- **Step in rhythm:** tokens moved together now hop to the same beat instead of each at its own pace.
- **Maximum Move Duration for groups:** the group as a whole arrives within the limit, and all its tokens are sped up by the same amount.
- Slowed tokens now also take exactly as much longer when they move alone (twice as long at half speed), and speed up and slow down more gently.

## 14.2.0

- **Step on gridless scenes:** tokens now hop on gridless scenes too, in even steps of about one grid size, instead of using Lift & Place.

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
