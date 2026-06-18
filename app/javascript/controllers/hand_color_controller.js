import { Controller } from "@hotwired/stimulus"

// Lets the user pick a skin tone for the gesture hands. The choice is stored in
// localStorage and applied as CSS custom properties on <html>, so every page
// (and every hand SVG, which reads var(--hand-skin)) follows the selection.
const STORAGE_KEY = "handSkin"

export default class extends Controller {
  static targets = ["swatch"]

  connect() {
    const saved = this.read()
    if (saved) this.apply(saved.fill, saved.stroke)
    this.mark(saved ? saved.fill : null)
  }

  choose(event) {
    const el = event.currentTarget
    const { fill, stroke } = el.dataset
    this.apply(fill, stroke)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fill, stroke }))
    this.mark(fill)
  }

  apply(fill, stroke) {
    const style = document.documentElement.style
    style.setProperty("--hand-skin", fill)
    style.setProperty("--hand-skin-stroke", stroke)
  }

  read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch (_e) {
      return null
    }
  }

  mark(fill) {
    if (!this.hasSwatchTarget) return
    this.swatchTargets.forEach((swatch) => {
      const selected = fill
        ? swatch.dataset.fill === fill
        : swatch.dataset.default === "true"
      swatch.setAttribute("aria-pressed", selected ? "true" : "false")
      swatch.classList.toggle("ring-2", selected)
      swatch.classList.toggle("ring-white", selected)
      swatch.classList.toggle("ring-offset-2", selected)
      swatch.classList.toggle("ring-offset-neutral-950", selected)
    })
  }
}
