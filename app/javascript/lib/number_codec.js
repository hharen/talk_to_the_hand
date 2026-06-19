// Encoding/decoding of wind-tunnel windspeed hand signals (1..99).
//
// A "gesture" describes a single hand shape:
//   { place: "tens" | "ones", value, fingers: 0-4, orientation, thumb }
//   orientation: "up" | "down" | "horizontal" | "fist"
//
// Composition rules:
//   * single digit (1..9)      -> ones gesture only
//   * exact tens (10,20,..,90) -> tens gesture only
//   * otherwise                -> tens gesture, then ones gesture

export function tensGesture(tens) {
  if (tens >= 1 && tens <= 4) {
    return { place: "tens", value: tens * 10, fingers: tens, orientation: "down", thumb: false }
  }
  if (tens === 5) {
    return { place: "tens", value: 50, fingers: 0, orientation: "fist", thumb: false }
  }
  if (tens >= 6 && tens <= 9) {
    return { place: "tens", value: tens * 10, fingers: tens - 5, orientation: "horizontal", thumb: false }
  }
  return null
}

export function onesGesture(ones) {
  if (ones >= 1 && ones <= 4) {
    return { place: "ones", value: ones, fingers: ones, orientation: "down", thumb: false }
  }
  if (ones === 5) {
    return { place: "ones", value: 5, fingers: 0, orientation: "horizontal", thumb: true }
  }
  if (ones >= 6 && ones <= 9) {
    return { place: "ones", value: ones, fingers: ones - 5, orientation: "up", thumb: false }
  }
  return null
}

export function numberToGestures(number) {
  number = parseInt(number, 10)
  const tens = Math.floor(number / 10)
  const ones = number % 10
  if (ones === 5 && tens >= 5) return [combinedGesture(number)]
  const seq = []
  if (tens > 0) seq.push(tensGesture(tens))
  if (ones > 0) seq.push(onesGesture(ones))
  return seq
}

// 55,65,75,85,95: a single gesture — fingers pointing sideways plus thumb up.
export function combinedGesture(number) {
  const tens = Math.floor(number / 10)
  return { place: "combined", value: number, fingers: tens - 5, orientation: "horizontal", thumb: true }
}

// Interpret a raw recognized gesture into a digit value, given the expected
// place ("tens" or "ones"). Returns a number or null when not understood.
export function gestureToValue(raw, place) {
  if (!raw) return null
  const { fingers, orientation, thumb } = raw

  if (place === "combined") {
    if (!thumb) return null
    if (orientation === "horizontal" && fingers >= 1 && fingers <= 4) return (fingers + 5) * 10 + 5
    if (fingers === 0) return 55
    return null
  }

  if (place === "tens") {
    if (orientation === "fist") return 50
    if (orientation === "down" && fingers >= 1 && fingers <= 4) return fingers * 10
    if (orientation === "horizontal" && fingers >= 1 && fingers <= 4) return (fingers + 5) * 10
    return null
  }

  // ones
  if (thumb && fingers === 0) return 5
  if (orientation === "down" && fingers >= 1 && fingers <= 4) return fingers
  if (orientation === "up" && fingers >= 1 && fingers <= 4) return fingers + 5
  return null
}

// Compare a captured raw gesture against an expected gesture descriptor.
export function gesturesMatch(expected, raw) {
  if (!expected || !raw) return false
  return gestureToValue(raw, expected.place) === expected.value
}

const ORIENTATION_LABEL = {
  up: "pointing up",
  down: "pointing down",
  horizontal: "pointing sideways",
  fist: "closed fist",
}

export function describeGesture(raw) {
  if (!raw) return "no hand"
  if (raw.thumb && raw.fingers === 0) return "thumb up"
  if (raw.orientation === "fist") return "closed fist"
  if (raw.fingers === 0) return "no fingers extended"
  const f = raw.fingers === 1 ? "1 finger" : `${raw.fingers} fingers`
  const thumb = raw.thumb ? " + thumb up" : ""
  return `${f} ${ORIENTATION_LABEL[raw.orientation] || ""}${thumb}`.trim()
}
