// Classify a single MediaPipe hand (21 landmarks) into a raw gesture:
//   { fingers: 0-4, orientation: "up"|"down"|"horizontal"|"fist", thumb: bool }
//
// Landmarks are objects with normalized { x, y, z }. Image space: y grows
// downward, so a smaller y is "higher" on screen. The up/down axis is mirror
// invariant; left/right are both treated as "horizontal".

const FINGERS = [
  { mcp: 5, pip: 6, tip: 8 },   // index
  { mcp: 9, pip: 10, tip: 12 }, // middle
  { mcp: 13, pip: 14, tip: 16 }, // ring
  { mcp: 17, pip: 18, tip: 20 }, // pinky
]

const THUMB_TIP = 4
const THUMB_MCP = 2

// Cosine of the bend angle at the PIP joint. ~1 = straight finger, <= 0 = folded.
// This is orientation independent, so it works whether fingers point up, down or
// sideways (unlike comparing tip/pip distance to the wrist).
function jointCosine(a, mid, b) {
  const v1 = { x: a.x - mid.x, y: a.y - mid.y }
  const v2 = { x: b.x - mid.x, y: b.y - mid.y }
  const m1 = Math.hypot(v1.x, v1.y)
  const m2 = Math.hypot(v2.x, v2.y)
  if (m1 === 0 || m2 === 0) return -1
  return (v1.x * v2.x + v1.y * v2.y) / (m1 * m2)
}

function fingerExtended(lm, finger) {
  // A straight finger has an almost straight line through MCP-PIP-TIP, so the
  // angle at PIP is close to 180° (cosine close to -1). A curled finger bends.
  return jointCosine(lm[finger.mcp], lm[finger.pip], lm[finger.tip]) < -0.5
}

function orientationOf(dx, dy) {
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? "up" : "down"
  }
  return "horizontal"
}

function thumbPointingUp(lm) {
  const tip = lm[THUMB_TIP]
  const mcp = lm[THUMB_MCP]
  // Straight thumb (MCP-IP-TIP roughly in line) pointing upward.
  const extended = jointCosine(lm[THUMB_MCP], lm[3], lm[THUMB_TIP]) < -0.4
  const dx = tip.x - mcp.x
  const dy = tip.y - mcp.y
  const up = Math.abs(dy) >= Math.abs(dx) && dy < 0
  return extended && up && tip.y < lm[5].y
}

export function classifyHand(landmarks) {
  if (!landmarks || landmarks.length < 21) return null

  const thumb = thumbPointingUp(landmarks)
  const extended = FINGERS.filter((f) => fingerExtended(landmarks, f))
  const count = extended.length

  if (count === 0) {
    if (thumb) {
      return { fingers: 0, orientation: "up", thumb: true }
    }
    return { fingers: 0, orientation: "fist", thumb: false }
  }

  // Average pointing direction across the extended fingers.
  let dx = 0
  let dy = 0
  for (const f of extended) {
    dx += landmarks[f.tip].x - landmarks[f.mcp].x
    dy += landmarks[f.tip].y - landmarks[f.mcp].y
  }
  dx /= count
  dy /= count

  return { fingers: count, orientation: orientationOf(dx, dy), thumb }
}
