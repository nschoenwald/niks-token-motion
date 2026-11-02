/**
 * Nik's Token Motion
 *
 * Makes token movement feel smooth and responsive. Movement styles:
 * - Glide: one acceleration / deceleration profile over the whole movement path instead of a constant speed per
 *   segment. Short moves start and stop softly, long moves reach a higher top speed and can be capped.
 * - Lift & Place: like Glide, but the token is lifted off the table, carried and set down like a chess piece.
 * - Step: the token hops one grid space at a time like a miniature: lift, carry, set down, short rest.
 * The lift is visual only (mesh scale, offset and a shadow); the token's elevation never changes.
 * The drag preview glides toward its grid space instead of jumping there, and is lifted while dragged.
 *
 * Compatible with Foundry VTT V14.
 */

const MODULE_ID = "niks-token-motion";

/** Movement styles. */
const STYLE = {
    DEFAULT: "default",
    GLIDE: "glide",
    LIFT: "lift",
    STEP: "step"
};

/** Which movements use the movement style. */
const APPLY_TO = {
    DRAGGING: "dragging",
    NO_KEYBOARD: "no-keyboard",
    ALL: "all"
};

/** Token Warp's module id and the settings of it this module overrides. */
const TOKEN_WARP_ID = "tokenwarp";
const TOKEN_WARP_SPEED_SETTING = `${TOKEN_WARP_ID}.defaultTokenAnimationSpeed`;

/** Movement actions that never hop square by square; with the Step style they are lifted and placed instead. */
const AERIAL_ACTIONS = new Set(["fly", "jump"]);

/** Time constant (ms) of the drag preview smoothing per setting value; missing = no smoothing. */
const PREVIEW_TAU = {
    snappy: 35,
    smooth: 70
};

/** Distance (px) below which the smoothed drag preview snaps onto its target. */
const PREVIEW_SNAP_DISTANCE = 0.5;

/** Time constant (ms) of the drag preview lifting up and setting down. */
const PREVIEW_LIFT_TAU = 45;

/** Lift & Place: time (ms) to lift the token up and to set it down, and the settle after touching down. */
const LIFT_UP_MS = 140;
const LIFT_DOWN_MS = 160;
const SETTLE_MS = 90;

/** Depth of the settle after touching down, as a fraction of the lift (the token is pressed down briefly). */
const SETTLE_DEPTH = 0.3;

/** Step: share of a hop spent moving; the rest the token rests on its grid space. */
const HOP_MOVE = 0.8;

/** Step: shortest hop (ms) before hopping two spaces at a time, and the most hops before Lift & Place is used. */
const MIN_HOP_MS = 90;
const MAX_HOPS = 25;

/** Upward offset of a lifted token, in grid sizes per unit of lift height. */
const LIFT_RISE = 0.6;

/**
 * Shadow of a lifted token: opacity at full lift and offset to the bottom right (token sizes per unit of lift height).
 * The shadow is as big as the token, so the offset must be large enough for it to show beside the token.
 */
const SHADOW_ALPHA = 0.6;
const SHADOW_OFFSET = { x: 1.25, y: 1.75 };

// ─── Utility ───────────────────────────────────────────────

const log = (...args) => console.log(`${MODULE_ID} |`, ...args);
const setting = (key) => game.settings.get(MODULE_ID, key);

/** Smoothstep from 0 to 1. */
const smooth = (t) => {
    const c = Math.clamp(t, 0, 1);
    return c * c * (3 - (2 * c));
};

/** Cubic ease-in-out from 0 to 1. */
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (Math.pow((-2 * t) + 2, 3) / 2));

/** Is Token Warp active? */
const tokenWarpActive = () => !!game.modules.get(TOKEN_WARP_ID)?.active;

/** Lift height as a fraction of the token size; 0 turns the lift visuals off. */
const liftHeight = () => setting("lift-height") / 100;

/** Glide plans of the tokens whose movement animation is being dispatched right now. */
const plans = new WeakMap();

/** Smoothing state of drag preview tokens. */
const previewStates = new WeakMap();

/** Lift state of tokens: lift value, unlifted mesh scale and shadow. */
const lifts = new WeakMap();

// ─── Settings Registration ─────────────────────────────────

function registerSettings() {
    game.settings.register(MODULE_ID, "movement-style", {
        name: "NTM.Settings.MovementStyle.Name",
        hint: "NTM.Settings.MovementStyle.Hint",
        scope: "world",
        config: true,
        default: STYLE.STEP,
        type: String,
        choices: {
            [STYLE.STEP]: "NTM.Settings.MovementStyle.Step",
            [STYLE.LIFT]: "NTM.Settings.MovementStyle.Lift",
            [STYLE.GLIDE]: "NTM.Settings.MovementStyle.Glide",
            [STYLE.DEFAULT]: "NTM.Settings.MovementStyle.Default"
        }
    });

    game.settings.register(MODULE_ID, "apply-to", {
        name: "NTM.Settings.ApplyTo.Name",
        hint: "NTM.Settings.ApplyTo.Hint",
        scope: "world",
        config: true,
        default: APPLY_TO.NO_KEYBOARD,
        type: String,
        choices: {
            [APPLY_TO.DRAGGING]: "NTM.Settings.ApplyTo.Dragging",
            [APPLY_TO.NO_KEYBOARD]: "NTM.Settings.ApplyTo.NoKeyboard",
            [APPLY_TO.ALL]: "NTM.Settings.ApplyTo.All"
        }
    });

    game.settings.register(MODULE_ID, "top-speed", {
        name: "NTM.Settings.TopSpeed.Name",
        hint: "NTM.Settings.TopSpeed.Hint",
        scope: "world",
        config: true,
        default: 24,
        type: Number,
        range: { min: 4, max: 60, step: 1 }
    });

    game.settings.register(MODULE_ID, "acceleration", {
        name: "NTM.Settings.Acceleration.Name",
        hint: "NTM.Settings.Acceleration.Hint",
        scope: "world",
        config: true,
        default: 40,
        type: Number,
        range: { min: 10, max: 200, step: 5 }
    });

    game.settings.register(MODULE_ID, "max-duration", {
        name: "NTM.Settings.MaxDuration.Name",
        hint: "NTM.Settings.MaxDuration.Hint",
        scope: "world",
        config: true,
        default: 3,
        type: Number,
        range: { min: 0, max: 10, step: 0.5 }
    });

    game.settings.register(MODULE_ID, "hop-duration", {
        name: "NTM.Settings.HopDuration.Name",
        hint: "NTM.Settings.HopDuration.Hint",
        scope: "world",
        config: true,
        default: 220,
        type: Number,
        range: { min: 120, max: 500, step: 10 }
    });

    game.settings.register(MODULE_ID, "lift-height", {
        name: "NTM.Settings.LiftHeight.Name",
        hint: "NTM.Settings.LiftHeight.Hint",
        scope: "world",
        config: true,
        default: 8,
        type: Number,
        range: { min: 0, max: 20, step: 1 }
    });

    game.settings.register(MODULE_ID, "shadow", {
        name: "NTM.Settings.Shadow.Name",
        hint: "NTM.Settings.Shadow.Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(MODULE_ID, "terrain", {
        name: "NTM.Settings.Terrain.Name",
        hint: "NTM.Settings.Terrain.Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(MODULE_ID, "preview-smoothing", {
        name: "NTM.Settings.PreviewSmoothing.Name",
        hint: "NTM.Settings.PreviewSmoothing.Hint",
        scope: "client",
        config: true,
        default: "snappy",
        type: String,
        choices: {
            off: "NTM.Settings.PreviewSmoothing.Off",
            snappy: "NTM.Settings.PreviewSmoothing.Snappy",
            smooth: "NTM.Settings.PreviewSmoothing.Smooth"
        }
    });
}

/**
 * Add a "Reset to Defaults" button to this module's section of the settings window. Like core's Reset Defaults, it
 * only fills in the form; the values are saved with Save Changes. Players only see (and reset) the client settings.
 */
function addResetButton(application, element) {
    const section = element.querySelector(`section[data-category="${MODULE_ID}"]`);
    if (!section || section.querySelector(".ntm-reset-defaults")) return;

    const group = document.createElement("div");
    group.className = "form-group ntm-reset-defaults";
    group.innerHTML = `
        <label>${game.i18n.localize("NTM.Settings.Reset.Name")}</label>
        <div class="form-fields">
            <button type="button">
                <i class="fa-solid fa-arrow-rotate-left" inert></i>
                <span>${game.i18n.localize("NTM.Settings.Reset.Button")}</span>
            </button>
        </div>
        <p class="hint">${game.i18n.localize("NTM.Settings.Reset.Hint")}</p>`;
    group.querySelector("button").addEventListener("click", () => {
        const form = application.form;
        for (const [key, config] of game.settings.settings.entries()) {
            if ((config.namespace !== MODULE_ID) || !config.config) continue;
            const input = form[key];
            if (!input) continue;
            if (input.type === "checkbox") input.checked = config.default;
            else input.value = config.default;
            input.dispatchEvent(new Event("change"));
        }
        ui.notifications.info("NTM.Settings.Reset.Info", { localize: true });
    });
    section.append(group);
}

/**
 * Tell GMs in Token Warp's settings that its animation speed is overridden while a movement style other than Foundry
 * default is selected (Token Warp's per-actor speed overrides are too, see README).
 */
function addTokenWarpNote(application, element) {
    if (!tokenWarpActive() || (setting("movement-style") === STYLE.DEFAULT)) return;
    const input = element.querySelector(`[name="${TOKEN_WARP_SPEED_SETTING}"]`);
    const group = input?.closest(".form-group");
    if (!group || group.querySelector(".ntm-token-warp-note")) return;
    const note = document.createElement("p");
    note.className = "hint ntm-token-warp-note";
    note.textContent = game.i18n.localize("NTM.TokenWarp.SpeedOverridden");
    group.append(note);
}

// ─── Movement Profile ──────────────────────────────────────

/**
 * Create a velocity profile for the given effective length (in grid spaces): constant acceleration up to the top
 * speed, cruise, then constant deceleration. If the result is longer than the maximum duration, time is scaled down
 * so the curve keeps its shape.
 * @param {number} length    Effective length in grid spaces (> 0)
 * @returns {{duration: number, distanceAt: (ms: number) => number, timeAt: (distance: number) => number}}
 */
function createProfile(length) {
    const acceleration = setting("acceleration");
    const peak = Math.min(setting("top-speed"), Math.sqrt(length * acceleration));
    const rampTime = peak / acceleration;
    const rampDistance = peak * rampTime / 2;
    const cruiseTime = Math.max(length - (2 * rampDistance), 0) / peak;
    const total = (2 * rampTime) + cruiseTime;
    const maxDuration = setting("max-duration");
    const scale = (maxDuration > 0) && (total > maxDuration) ? maxDuration / total : 1;

    return {
        /** Duration in ms. */
        duration: total * scale * 1000,

        /** Distance covered after the given time (ms). */
        distanceAt(ms) {
            const t = Math.clamp(ms / 1000 / scale, 0, total);
            if (t < rampTime) return acceleration * t * t / 2;
            if (t < rampTime + cruiseTime) return rampDistance + (peak * (t - rampTime));
            const remaining = total - t;
            return length - (acceleration * remaining * remaining / 2);
        },

        /** Time (ms) at which the given distance is reached. */
        timeAt(distance) {
            const d = Math.clamp(distance, 0, length);
            let t;
            if (d < rampDistance) t = Math.sqrt(2 * d / acceleration);
            else if (d < length - rampDistance) t = rampTime + ((d - rampDistance) / peak);
            else t = total - Math.sqrt(2 * (length - d) / acceleration);
            return t * scale * 1000;
        }
    };
}

/**
 * Lift & Place: lift of the token at the given time of the movement. Rises at the start (unless it is already lifted
 * from dragging), sets down before the end and is pressed down briefly when it touches the table.
 * @param {number} time            Time since the movement started (ms)
 * @param {number} duration        Duration of the movement (ms)
 * @param {boolean} startLifted    Does the token start lifted?
 * @returns {number}               The lift, 1 = fully lifted, negative while settling
 */
function placeLift(time, duration, startLifted) {
    const up = startLifted ? 0 : Math.min(LIFT_UP_MS, duration * 0.3);
    const down = Math.min(LIFT_DOWN_MS, duration * 0.3);
    const settle = Math.min(SETTLE_MS, duration * 0.2);
    const landing = duration - settle;
    if (time >= landing) return settle > 0 ? -SETTLE_DEPTH * Math.sin(Math.PI * Math.min((time - landing) / settle, 1)) : 0;
    let lift = 1;
    if ((up > 0) && (time < up)) lift = smooth(time / up);
    if (time > landing - down) lift = Math.min(lift, smooth((landing - time) / down));
    return lift;
}

/** Step: progress of the token along one hop. It moves first, then rests on its grid space. */
const hopProgress = (u) => (u >= HOP_MOVE ? 1 : easeInOutCubic(u / HOP_MOVE));

/**
 * Step: lift of the token during one hop: an arc while moving, then a short settle on the grid space.
 * @param {number} u               Progress of the hop (0 to 1)
 * @param {boolean} startLifted    Does the hop start lifted (first hop after dragging)?
 */
function hopLift(u, startLifted) {
    if (u >= HOP_MOVE) return -SETTLE_DEPTH * Math.sin(Math.PI * Math.min((u - HOP_MOVE) / (1 - HOP_MOVE), 1));
    const t = u / HOP_MOVE;
    if (startLifted && (t < 0.5)) return 1;
    return Math.sin(Math.PI * t);
}

// ─── Movement Plan ─────────────────────────────────────────

/** Length of a movement segment in grid spaces, measured like core's movement animation duration. */
function segmentLength(from, to) {
    const { size, distancePixels } = canvas.dimensions;
    const dx = (to.x ?? from.x) - from.x;
    const dy = (to.y ?? from.y) - from.y;
    const dz = ((to.elevation ?? from.elevation) - from.elevation) * distancePixels;
    const dw = (to.width ?? from.width) - from.width;
    const dh = (to.height ?? from.height) - from.height;
    const dd = (to.depth ?? from.depth) - from.depth;
    return Math.max(Math.hypot(dx, dy, dz) / size, Math.hypot(dw, dh, dd) * 0.5);
}

/**
 * Speed of a movement action relative to the default movement speed, taken from the action's default animation
 * options (e.g. crawl is 0.5, teleportation is infinite, dnd5e halves actions the actor has no speed for).
 * @returns {number}    0 for actions that are not animated
 */
function actionSpeedFactor(document, action) {
    const defaults = CONFIG.Token.movement.actions[action]?.getAnimationOptions(document) ?? {};
    if (defaults.duration === 0) return 0;
    const defaultSpeed = CONFIG.Token.movement.defaultSpeed;
    return (defaults.movementSpeed ?? defaultSpeed) * (defaults.speedMultiplier ?? 1) / defaultSpeed;
}

/**
 * How much slower than normal a segment is animated: slower movement actions and, if enabled, difficult terrain.
 * @returns {number}    0 for instant actions
 */
function segmentSlowdown(document, action, terrain) {
    const factor = actionSpeedFactor(document, action);
    if (!(factor > 0) || !Number.isFinite(factor)) return 0;
    let slowdown = 1 / factor;
    if (setting("terrain") && (terrain instanceof foundry.data.TerrainData)) slowdown *= Math.min(terrain.difficulty, 10);
    return slowdown;
}

/** Weight of a movement segment on the glide profile: its length times its slowdown. Instant segments weigh 0. */
function segmentWeight(document, from, to, action, terrain) {
    const slowdown = segmentSlowdown(document, action, terrain);
    return slowdown ? segmentLength(from, to) * slowdown : 0;
}

/** Does this movement use the movement style, according to the settings and the update options? */
function shouldGlide(document, movement, options) {
    if ((setting("movement-style") === STYLE.DEFAULT) || (options.animate === false)) return false;

    // Respect explicit animation timing from macros and other modules. Token Warp stamps its own animation speed on
    // every move (overwriting any other), so with Token Warp active a movement speed is not a reason to step aside.
    // Its `animate: false` moves (no animations, walls block, teleport, out of bounds) are still respected above
    if (options.animation?.duration !== undefined) return false;
    if ((options.animation?.movementSpeed !== undefined) && !tokenWarpActive()) return false;

    const applyTo = setting("apply-to");
    if ((applyTo === APPLY_TO.DRAGGING) && (movement.method !== "dragging")) return false;
    if ((applyTo === APPLY_TO.NO_KEYBOARD) && (movement.method === "keyboard")) return false;

    // Leave movement actions with their own easing or fixed duration (from other modules) alone
    for (const waypoint of movement.passed.waypoints) {
        const defaults = CONFIG.Token.movement.actions[waypoint.action]?.getAnimationOptions(document) ?? {};
        if (defaults.easing || defaults.duration) return false;
    }
    return true;
}

/** Grid spaces of the direct path between two token positions, from the space of `from` to the space of `to`. */
function pathSpaces(document, from, to) {
    return canvas.grid.getDirectPath([document.getCenterPoint(from), document.getCenterPoint(to)]);
}

/**
 * Step: timing of the hops. Hops last the hop duration (times the segment's slowdown); if all hops together would
 * take longer than the maximum duration they get shorter, down to a minimum, then the token hops two spaces at a time.
 * @returns {{hopTime: number, stride: number}|null}    null if there would be too many hops
 */
function createStepTiming(document, segments) {
    let hops = 0;
    let slowHops = 0;
    for (const { from, to } of segments) {
        const slowdown = segmentSlowdown(document, to.action, to.terrain);
        if (!slowdown || !(segmentLength(from, to) > 0)) continue;
        const spaces = Math.max(pathSpaces(document, from, to).length - 1, 1);
        hops += spaces;
        slowHops += spaces * slowdown;
    }
    const baseHopTime = setting("hop-duration");
    const maxDuration = setting("max-duration") * 1000;
    const tooLong = (hopTime, stride) => (maxDuration > 0) && (hopTime * slowHops / stride > maxDuration);
    let hopTime = baseHopTime;
    let stride = 1;
    if (tooLong(hopTime, stride)) hopTime = Math.max(maxDuration / slowHops, MIN_HOP_MS);
    if (tooLong(hopTime, stride) || (hops > MAX_HOPS)) {
        stride = 2;
        hopTime = maxDuration > 0 ? Math.clamp(2 * maxDuration / slowHops, MIN_HOP_MS, baseHopTime) : baseHopTime;
    }
    if (Math.ceil(hops / stride) > MAX_HOPS) return null;
    return { hopTime, stride };
}

/**
 * Build the plan for a movement: the style, the total weight of the animated path and its profile, or the hop timing.
 * Mirrors the path core animates, which skips intermediate waypoints that aren't explicit.
 * @returns {object|null}    The plan, or null if the movement should animate as usual
 */
function createPlan(token, movement, options, userId) {
    const document = token.document;
    if (!movement.passed.waypoints.length || !shouldGlide(document, movement, options)) return null;
    const segments = [];
    let from = movement.origin;
    let total = 0;
    for (const to of movement.passed.waypoints) {
        if (to.intermediate && !to.explicit) continue;
        segments.push({ from, to });
        total += segmentWeight(document, from, to, to.action, to.terrain);
        from = to;
    }
    if (!(total > 0)) return null;

    let style = setting("movement-style");
    let step = null;
    if (style === STYLE.STEP) {
        const ground = !canvas.grid.isGridless && segments.every(({ to }) => !AERIAL_ACTIONS.has(to.action));
        step = ground ? createStepTiming(document, segments) : null;
        if (!step) style = STYLE.LIFT;
    }

    // The dragging user saw the preview lifted, so the token starts lifted on their screen
    const startLifted = (style !== STYLE.GLIDE) && (movement.method === "dragging") && (userId === game.user.id)
        && (liftHeight() > 0);

    return {
        style,
        profile: style === STYLE.STEP ? null : createProfile(total),
        total,
        consumed: 0,
        cursor: { ...movement.origin },
        startLifted,
        step,
        anchors: segments.map(({ to }) => to),
        anchorIndex: 0
    };
}

/**
 * Step: the hop positions for one animated segment. Hops land on grid spaces relative to the next movement waypoint,
 * which is snapped, so they stay on the grid even when core splits a segment at a region boundary. Falls back to a
 * single hop if a hop would pass through a wall that the straight line doesn't.
 */
function hopPositions(token, plan, from, to) {
    const document = token.document;
    const spaces = pathSpaces(document, from, to);
    if (spaces.length <= 2) return [to];

    const anchor = plan.anchors[plan.anchorIndex] ?? to;
    const anchorCenter = document.getCenterPoint(anchor);
    const anchorSpace = canvas.grid.getCenterPoint(canvas.grid.getOffset(anchorCenter));
    const positions = [];
    const last = spaces.length - 1;
    for (let k = plan.step.stride; k < last; k += plan.step.stride) {
        const center = canvas.grid.getCenterPoint(spaces[k]);
        const elevation = from.elevation + (((to.elevation ?? from.elevation) - from.elevation) * k / last);
        positions.push({
            x: Math.round(anchor.x + center.x - anchorSpace.x),
            y: Math.round(anchor.y + center.y - anchorSpace.y),
            elevation
        });
    }
    positions.push(to);

    // Hops go through grid spaces next to the straight line: don't let them cut a wall corner
    let previous = document.getMovementOrigin(from);
    for (const position of positions) {
        const next = document.getMovementOrigin({ ...from, ...position });
        if (token.checkCollision(next, { origin: previous, type: "move", mode: "any" })) return [to];
        previous = next;
    }
    return positions;
}

/** Is the position the same as the waypoint (within the 1 px core may shift it by for auto-rotation)? */
const reachesWaypoint = (position, waypoint) => (Math.abs((position.x ?? 0) - waypoint.x) <= 2)
    && (Math.abs((position.y ?? 0) - waypoint.y) <= 2);

// ─── Lift Visuals ──────────────────────────────────────────

/** Get or create the lift state of a token. The mesh is unlifted when the state is created. */
function liftState(token) {
    let state = lifts.get(token);
    if (!state && token.mesh) {
        state = { value: 0, scaleX: token.mesh.scale.x, scaleY: token.mesh.scale.y, shadow: null };
        lifts.set(token, state);
    }
    return state;
}

/** Create the soft shadow of a token: stacked ellipses, below the token mesh in the primary group. */
function createShadow(token) {
    const shadow = new foundry.canvas.primary.PrimaryGraphics({ name: `${token.objectId}.${MODULE_ID}.shadow` });
    const { width, height } = token.document.getSize();
    for (let i = 0; i < 8; i++) {
        const f = 1 - (i * 0.05);
        shadow.beginFill(0x000000, 0.2);
        shadow.drawEllipse(0, 0, width * 0.5 * f, height * 0.5 * f);
        shadow.endFill();
    }
    shadow.eventMode = "none";
    canvas.primary.addChild(shadow);
    return shadow;
}

/** Remove a token's shadow. */
function destroyShadow(state) {
    if (state?.shadow && !state.shadow.destroyed) state.shadow.destroy();
    if (state) state.shadow = null;
}

/** Show, place or hide a token's shadow for its current lift. (x, y) is the token's center on the table. */
function updateShadow(token, state, x, y) {
    const height = liftHeight();
    const lift = state.value;
    if (!setting("shadow") || !(height > 0) || !(lift > 0.001) || !token.mesh.visible) {
        if (state.shadow) state.shadow.visible = false;
        return;
    }
    if (!state.shadow || state.shadow.destroyed) state.shadow = createShadow(token);
    const shadow = state.shadow;
    shadow.visible = true;
    shadow.position.set(x + (SHADOW_OFFSET.x * height * lift * token.w), y + (SHADOW_OFFSET.y * height * lift * token.h));
    shadow.scale.set(1 + (0.12 * lift));
    shadow.alpha = SHADOW_ALPHA * lift * token.mesh.alpha;
    shadow.elevation = token.mesh.elevation;
    shadow.sortLayer = token.mesh.sortLayer;
    shadow.sort = token.mesh.sort - 0.5;
}

/**
 * Draw a token's mesh at its lifted (and, for drag previews, smoothed) position and scale. Core sets the mesh, which
 * is not a child of the token container, from the document in its refresh methods; this runs after them.
 */
function applyMeshTransform(token) {
    const mesh = token.mesh;
    if (!mesh || mesh.destroyed) return;
    let { x, y } = token.center;
    const preview = previewStates.get(token);
    if (preview) {
        x += preview.x - token.document.x;
        y += preview.y - token.document.y;
    }
    const state = lifts.get(token);
    const lift = state?.value ?? 0;
    const height = liftHeight();
    mesh.position.set(x, y - (Math.max(lift, 0) * height * LIFT_RISE * canvas.dimensions.size));
    if (!state) return;
    const scale = 1 + (height * lift);
    mesh.scale.set(state.scaleX * scale, state.scaleY * scale);
    updateShadow(token, state, x, y);
}

/** Set a token's lift and redraw it. */
function setLift(token, value) {
    const state = liftState(token);
    if (!state) return;
    state.value = value;
    applyMeshTransform(token);
}

/** Put a token back down: unlifted mesh, no shadow. */
function resetLift(token) {
    const state = lifts.get(token);
    if (!state) return;
    destroyShadow(state);
    state.value = 0;
    applyMeshTransform(token);
    lifts.delete(token);
}

// ─── Wrappers ──────────────────────────────────────────────

/**
 * Token#_onUpdate: core dispatches all movement animation segments synchronously from here, so the plan is only
 * visible to Token#animate for the duration of this call.
 */
function onUpdateWrapper(wrapped, changed, options, userId) {
    const movement = options._movement?.[this.document.id];
    const plan = movement ? createPlan(this, movement, options, userId) : null;
    if (!plan) return wrapped(changed, options, userId);
    plans.set(this, plan);
    let result;
    try {
        result = wrapped(changed, options, userId);
    } finally {
        plans.delete(this);
    }

    // Put the token down once its movement animation chain is done (unless another movement was chained to it)
    if (plan.style !== STYLE.GLIDE) {
        const promise = this.movementAnimationPromise;
        if (!promise) resetLift(this);
        else promise.finally(() => {
            if (!this.destroyed && !this.movementAnimationPromise) resetLift(this);
        });
    }
    return result;
}

/**
 * Token#animate, Glide and Lift & Place: give each movement segment the slice of the global profile it covers. The
 * segment's duration is the profile time between its start and end weight; its easing maps local progress onto the
 * profile, so the chained segments together accelerate and decelerate once.
 */
function animateGlide(token, wrapped, plan, to, options, weight) {
    const start = plan.consumed;
    const end = Math.min(start + weight, plan.total);
    plan.consumed = end;
    if (end - start < 1e-9) return wrapped(to, { ...options, duration: 0 });

    const { profile, startLifted } = plan;
    const startTime = profile.timeAt(start);
    const duration = profile.timeAt(end) - startTime;
    const span = end - start;
    const easing = pt => (pt >= 1 ? 1 : (profile.distanceAt(startTime + (pt * duration)) - start) / span);
    if (plan.style === STYLE.GLIDE) return wrapped(to, { ...options, duration, easing });
    const ontick = (elapsedMS, animation) => {
        const time = startTime + Math.min(animation.time, duration);
        setLift(token, placeLift(time, profile.duration, startLifted));
    };
    return wrapped(to, { ...options, duration, easing, ontick });
}

/** Token#animate, Step: split the segment into hops of one (or two) grid spaces, chained one after the other. */
function animateStep(token, wrapped, plan, from, to, options, slowdown) {
    if (!slowdown || !(segmentLength(from, to) > 0)) return wrapped(to, { ...options, duration: 0 });
    const duration = plan.step.hopTime * slowdown;
    let promise;
    for (const position of hopPositions(token, plan, from, to)) {
        const startLifted = plan.startLifted;
        plan.startLifted = false;
        const ontick = (elapsedMS, animation) => {
            setLift(token, hopLift(Math.min(animation.time / duration, 1), startLifted));
        };
        promise = wrapped(position, { ...options, duration, easing: hopProgress, ontick });
    }
    return promise;
}

/** Token#animate: route movement segments of a planned movement to the style; everything else passes through. */
function animateWrapper(wrapped, to, options = {}) {
    const plan = plans.get(this);
    const isMovement = (options.name === this.movementAnimationName)
        && foundry.documents.TokenDocument.MOVEMENT_FIELDS.some(k => k in to);
    if (!plan || !isMovement || ((plan.style !== STYLE.STEP) && (plan.consumed >= plan.total))) {
        return wrapped(to, options);
    }

    const action = options.action ?? this.document.movementAction;
    const from = plan.cursor;
    plan.cursor = { ...from, ...to };
    if (plan.style === STYLE.STEP) {
        const result = animateStep(this, wrapped, plan, from, to, options,
            segmentSlowdown(this.document, action, options.terrain));
        const anchor = plan.anchors[plan.anchorIndex];
        if (anchor && reachesWaypoint(to, anchor)) plan.anchorIndex++;
        return result;
    }
    return animateGlide(this, wrapped, plan, to, options, segmentWeight(this.document, from, to, action, options.terrain));
}

/** Token#stopAnimation: a stopped movement puts the token down. */
function stopAnimationWrapper(wrapped, ...args) {
    const result = wrapped(...args);
    resetLift(this);
    return result;
}

// ─── Drag Preview ──────────────────────────────────────────

/** Is the drag preview lifted while dragging? */
const previewLiftEnabled = () => (setting("movement-style") !== STYLE.DEFAULT) && (liftHeight() > 0);

/** Is this preview token part of a drag right now (and not, e.g., the Token Config preview)? */
const isDragged = (token) => !!token.layer?._draggedToken;

/**
 * Move a preview token's smoothed position toward its document position and its lift toward its target every frame,
 * until both have arrived.
 */
function startPreviewTicker(token, state) {
    const ticker = canvas.app.ticker;
    const stop = () => {
        ticker.remove(step);
        state.ticking = false;
    };
    function step() {
        if (token.destroyed) return stop();
        const tau = PREVIEW_TAU[setting("preview-smoothing")];
        const k = tau ? 1 - Math.exp(-ticker.deltaMS / tau) : 1;
        state.x += (token.document.x - state.x) * k;
        state.y += (token.document.y - state.y) * k;
        const arrived = Math.hypot(token.document.x - state.x, token.document.y - state.y) < PREVIEW_SNAP_DISTANCE;
        if (arrived) {
            state.x = token.document.x;
            state.y = token.document.y;
        }

        const target = previewLiftEnabled() && isDragged(token) ? 1 : 0;
        const lift = liftState(token);
        let lifted = true;
        if (lift) {
            lift.value += (target - lift.value) * (1 - Math.exp(-ticker.deltaMS / PREVIEW_LIFT_TAU));
            lifted = Math.abs(target - lift.value) < 0.002;
            if (lifted) lift.value = target;
        }
        applyMeshTransform(token);
        if (arrived && lifted) stop();
    }
    state.ticking = true;
    ticker.add(step, undefined, PIXI.UPDATE_PRIORITY.OBJECTS);
}

/** Drag previews: start smoothing and lifting on their first refresh, then keep the ticker running while they move. */
function updatePreview(token) {
    const smoothing = !!PREVIEW_TAU[setting("preview-smoothing")];
    if (!smoothing && !previewLiftEnabled() && !previewStates.has(token)) return;
    let state = previewStates.get(token);

    // First refresh: the preview starts where its original token is
    if (!state) {
        state = { x: token.document.x, y: token.document.y, ticking: false };
        previewStates.set(token, state);
    }
    applyMeshTransform(token);
    if (!state.ticking) startPreviewTicker(token, state);
}

// ─── Refresh Wrappers ──────────────────────────────────────

/** Token#_refreshPosition: redraw drag previews and lifted tokens at their smoothed / lifted position. */
function refreshPositionWrapper(wrapped, ...args) {
    const result = wrapped(...args);
    if (this.isPreview) updatePreview(this);
    else if (lifts.has(this)) applyMeshTransform(this);
    return result;
}

/** Token#_refreshMeshSizeAndScale: remember the unlifted scale core just set, then apply the lift on top. */
function refreshMeshSizeAndScaleWrapper(wrapped, ...args) {
    const result = wrapped(...args);
    const state = lifts.get(this);
    if (state && this.mesh) {
        state.scaleX = this.mesh.scale.x;
        state.scaleY = this.mesh.scale.y;
        applyMeshTransform(this);
    }
    return result;
}

// ─── Patching (with libWrapper support) ────────────────────

/**
 * Wrap a Token method.
 * @param {string} method              The method name
 * @param {Function} wrapperFn         The wrapper (wrapped, ...args)
 * @param {boolean} [configured]       Wrap the configured Token class (e.g. dnd5e's Token5e) instead of core's Token,
 *                                     so the wrapper runs after the subclass's own changes
 */
function wrapTokenMethod(method, wrapperFn, configured = false) {
    const path = configured ? "CONFIG.Token.objectClass" : "foundry.canvas.placeables.Token";
    if (game.modules.get("lib-wrapper")?.active) {
        try {
            libWrapper.register(MODULE_ID, `${path}.prototype.${method}`, wrapperFn, "WRAPPER");
            return;
        } catch (e) {
            log(`libWrapper registration of Token#${method} failed, using manual patch:`, e);
        }
    }

    // Manual patch fallback
    const proto = (configured ? CONFIG.Token.objectClass : foundry.canvas.placeables.Token).prototype;
    const original = proto[method];
    proto[method] = function (...args) {
        return wrapperFn.call(this, original.bind(this), ...args);
    };
}

// ─── Hooks ─────────────────────────────────────────────────

Hooks.once("init", () => {
    log("Initializing");
    registerSettings();
    wrapTokenMethod("_onUpdate", onUpdateWrapper);
    wrapTokenMethod("animate", animateWrapper);
    wrapTokenMethod("stopAnimation", stopAnimationWrapper);
    Hooks.on("renderSettingsConfig", addResetButton);
    Hooks.on("renderSettingsConfig", addTokenWarpNote);

    // The shadow lives in the primary group, not in the token: remove it with the token
    Hooks.on("destroyToken", token => destroyShadow(lifts.get(token)));
});

// The mesh refreshes are wrapped on the configured Token class once every package has set it in init: dnd5e's
// Token5e scales the mesh after calling super, and the lift must be applied on top of that
Hooks.once("setup", () => {
    wrapTokenMethod("_refreshPosition", refreshPositionWrapper, true);
    wrapTokenMethod("_refreshMeshSizeAndScale", refreshMeshSizeAndScaleWrapper, true);
});
