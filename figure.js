// Анімовані фігурки для пояснення техніки.
// Поза задається кутами (градуси: 0 — вправо, 90 — вниз, -90 — вгору) або точкою, куди тягнеться кінцівка.
// Фігура дивиться вправо. «N» — ближня рука чи нога, «F» — дальня (світліша).

const BODY = { torso: 30, neck: 11, head: 7, thigh: 25, shin: 25, foot: 7, upper: 18, fore: 17, palm: 6 };

function figAt(point, angle, length) {
  const r = (angle * Math.PI) / 180;
  return [point[0] + Math.cos(r) * length, point[1] + Math.sin(r) * length];
}

function figAngle(from, to) {
  return (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
}

function figLimb(base, spec, l1, l2, joints) {
  if (Array.isArray(spec)) {
    const middle = figAt(base, spec[0], l1);
    return [middle, figAt(middle, spec[1], l2)];
  }
  const anchor = spec.rel ? joints[spec.rel] : [0, 0];
  const target = [anchor[0] + spec.to[0], anchor[1] + spec.to[1]];
  const reach = Math.min(Math.max(Math.hypot(target[0] - base[0], target[1] - base[1]), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const cos = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const alpha = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const middle = figAt(base, figAngle(base, target) + (spec.bend || 1) * alpha, l1);
  return [middle, figAt(middle, figAngle(middle, target), l2)];
}

function figFoot(spec) {
  return Array.isArray(spec) ? spec[2] || 0 : spec.ft || 0;
}

function figJoints(pose) {
  const j = { hip: pose.hip };
  j.neck = figAt(pose.hip, pose.t, BODY.torso);
  j.head = figAt(j.neck, pose.hd === undefined ? pose.t : pose.hd, BODY.neck);
  [j.kN, j.aN] = figLimb(j.hip, pose.l, BODY.thigh, BODY.shin, j);
  j.tN = figAt(j.aN, figFoot(pose.l), BODY.foot);
  [j.kF, j.aF] = figLimb(j.hip, pose.m || pose.l, BODY.thigh, BODY.shin, j);
  j.tF = figAt(j.aF, figFoot(pose.m || pose.l), BODY.foot);
  [j.eN, j.hN] = figLimb(j.neck, pose.a, BODY.upper, BODY.fore, j);
  if (pose.wr !== undefined) j.wN = figAt(j.hN, pose.wr, BODY.palm);
  [j.eF, j.hF] = figLimb(j.neck, pose.b || pose.a, BODY.upper, BODY.fore, j);
  return j;
}

function figLerp(a, b, t) {
  return a + (b - a) * t;
}

function figLerpAngle(a, b, t) {
  const diff = ((((b - a) % 360) + 540) % 360) - 180;
  return a + diff * t;
}

function figMixLimb(a, b, t) {
  if (!a) return a;
  if (Array.isArray(a) !== Array.isArray(b)) return t < 0.5 ? a : b;
  if (Array.isArray(a)) return a.map((value, index) => figLerpAngle(value, b[index] === undefined ? value : b[index], t));
  return { ...a, to: [figLerp(a.to[0], b.to[0], t), figLerp(a.to[1], b.to[1], t)], ft: figLerpAngle(a.ft || 0, b.ft || 0, t) };
}

function figMix(a, b, t) {
  const pose = {
    hip: [figLerp(a.hip[0], b.hip[0], t), figLerp(a.hip[1], b.hip[1], t)],
    t: figLerpAngle(a.t, b.t, t),
    hd: figLerpAngle(a.hd === undefined ? a.t : a.hd, b.hd === undefined ? b.t : b.hd, t),
  };
  ["a", "b", "l", "m"].forEach((key) => {
    const from = a[key] || (key === "b" ? a.a : key === "m" ? a.l : undefined);
    const to = b[key] || (key === "b" ? b.a : key === "m" ? b.l : undefined);
    if (from) pose[key] = figMixLimb(from, to, t);
  });
  if (a.wr !== undefined) pose.wr = figLerpAngle(a.wr, b.wr === undefined ? a.wr : b.wr, t);
  if (a.g !== undefined) pose.g = figLerp(a.g, b.g === undefined ? a.g : b.g, t);
  return pose;
}

const FIG_COLORS = { body: "var(--text)", far: "var(--muted)", accent: "var(--accent)", prop: "var(--line)" };

function figPts(...points) {
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

function figLine(points, color, width, extra = "") {
  return `<polyline points="${figPts(...points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

function figDumbbell(hand, angle, colors) {
  const a = figAt(hand, angle, 6);
  const b = figAt(hand, angle + 180, 6);
  const plate = (p) => figLine([figAt(p, angle + 90, 4), figAt(p, angle - 90, 4)], colors.accent, 4.5);
  return figLine([a, b], colors.accent, 2.5) + plate(a) + plate(b);
}

function figProps(props, colors) {
  return props
    .map((prop) => {
      const [kind, ...v] = prop;
      if (kind === "box") return `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" rx="3" fill="${colors.prop}"/>`;
      if (kind === "wall") return figLine([[v[0], v[1] || 8], [v[0], 118]], colors.prop, 5);
      return "";
    })
    .join("");
}

function figDraw(pose, guide, colors = FIG_COLORS) {
  const j = figJoints(pose);
  let svg = figProps(guide.props || [], colors);
  svg += figLine([[4, 120], [196, 120]], colors.prop, 3);
  const opacity = ' opacity="0.55"';
  svg += figLine([j.hip, j.kF, j.aF, j.tF], colors.far, 5, opacity);
  svg += figLine([j.neck, j.eF, j.hF], colors.far, 4.5, opacity);
  svg += figLine([j.hip, j.neck], colors.body, 6);
  svg += `<circle cx="${j.head[0].toFixed(1)}" cy="${j.head[1].toFixed(1)}" r="${BODY.head}" fill="${colors.body}"/>`;
  svg += figLine([j.hip, j.kN, j.aN, j.tN], colors.body, 5);
  svg += figLine(j.wN ? [j.neck, j.eN, j.hN, j.wN] : [j.neck, j.eN, j.hN], colors.body, 4.5);
  (guide.db || []).forEach((side) => {
    const hand = side === "F" ? j.hF : j.hN;
    const elbow = side === "F" ? j.eF : j.eN;
    const angle = guide.dbAngle === undefined ? figAngle(elbow, hand) + 90 : guide.dbAngle;
    svg += figDumbbell(hand, angle, colors);
  });
  if (pose.g !== undefined) {
    const spread = 7 - pose.g * 5;
    const top = [j.hN[0], j.hN[1] - 7];
    svg += figLine([[j.hN[0] - spread, j.hN[1] + 9], top, [j.hN[0] + spread, j.hN[1] + 9]], colors.accent, 3);
  }
  return svg;
}

function figPoseAt(guide, time) {
  const frames = guide.frames;
  if (frames.length === 1) return frames[0];
  const move = guide.ms || 900;
  const holds = frames.map((_, index) => (Array.isArray(guide.hold) ? guide.hold[index] || 0 : guide.hold === undefined ? 250 : guide.hold));
  const total = holds.reduce((sum, hold) => sum + hold + move, 0);
  let t = time % total;
  for (let index = 0; index < frames.length; index += 1) {
    if (t < holds[index]) return frames[index];
    t -= holds[index];
    if (t < move) {
      const eased = 0.5 - Math.cos((Math.PI * t) / move) / 2;
      return figMix(frames[index], frames[(index + 1) % frames.length], eased);
    }
    t -= move;
  }
  return frames[0];
}

// Верхня межа малюнка: обрізаємо порожнє місце над фігурою.
function figTop(guide) {
  let top = 124;
  const total = guide.frames.length * ((guide.ms || 900) + 600);
  for (let step = 0; step <= 40; step += 1) {
    const j = figJoints(figPoseAt(guide, (total * step) / 40));
    Object.values(j).forEach((point) => {
      if (point) top = Math.min(top, point[1]);
    });
  }
  (guide.props || []).forEach((prop) => {
    if (prop[0] === "box") top = Math.min(top, prop[2]);
  });
  return Math.max(0, Math.floor(top - BODY.head - 8));
}

function figSvg(inner, label, top = 0) {
  return `<svg viewBox="0 ${top} 200 ${128 - top}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// Створює анімацію, яка грає лише поки блок відкритий.
function mountFigure(holder, details, guide, label) {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || guide.frames.length === 1) {
    const peak = guide.frames[guide.peak === undefined ? guide.frames.length - 1 : guide.peak];
    const shown = guide.frames.length === 1 ? [guide.frames[0]] : [guide.frames[0], peak];
    const top = figTop(guide);
    holder.innerHTML = shown.map((pose) => figSvg(figDraw(pose, guide), label, top)).join("");
    holder.classList.toggle("is-pair", shown.length > 1);
    return;
  }
  holder.innerHTML = figSvg(figDraw(guide.frames[0], guide), label, figTop(guide));
  const svg = holder.firstChild;
  let frame = null;
  let start = 0;
  function tick(now) {
    if (!details.open || !holder.isConnected) {
      frame = null;
      return;
    }
    if (!start) start = now;
    svg.innerHTML = figDraw(figPoseAt(guide, now - start), guide);
    frame = requestAnimationFrame(tick);
  }
  details.addEventListener("toggle", () => {
    if (details.open && frame === null) {
      start = 0;
      frame = requestAnimationFrame(tick);
    }
  });
}

if (typeof module !== "undefined") module.exports = { figDraw, figPoseAt, figSvg, figJoints };
