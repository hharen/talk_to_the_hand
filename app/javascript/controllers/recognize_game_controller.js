import { Controller } from "@hotwired/stimulus"
import { numberToGestures } from "lib/number_codec"

// Recognize mode: app shows the gesture(s) as SVGs (cloned from server-rendered
// hidden templates) and the user types the number they represent.
export default class extends Controller {
  static targets = [
    "prompt", "input", "feedback", "panel", "templates",
  ]

  connect() {
    this.running = false
    this.start()
  }

  start() {
    this.running = true
    this.panelTarget.classList.remove("hidden")
    this.newRound()
  }

  stop() {
    this.running = false
    this.panelTarget.classList.add("hidden")
    this.promptTarget.innerHTML = ""
    this.feedbackTarget.textContent = ""
  }

  newRound() {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = null
    }
    this.target = Math.floor(Math.random() * 99) + 1
    const gestures = numberToGestures(this.target)
    this.promptTarget.innerHTML = ""

    gestures.forEach((g, i) => {
      const key = `${g.place}-${g.value}`
      const template = this.templatesTarget.querySelector(`[data-gesture-key="${key}"]`)
      if (!template) return
      const wrapper = document.createElement("div")
      wrapper.className = "flex flex-col items-center"
      wrapper.innerHTML = template.innerHTML
      const caption = document.createElement("span")
      caption.className = "mt-1 text-xs uppercase tracking-wide text-neutral-500"
      caption.textContent = g.place
      wrapper.appendChild(caption)
      this.promptTarget.appendChild(wrapper)

      if (i < gestures.length - 1) {
        const sep = document.createElement("div")
        sep.className = "text-3xl text-neutral-600 self-center"
        sep.textContent = "→"
        this.promptTarget.appendChild(sep)
      }
    })

    this.inputTarget.value = ""
    this.inputTarget.disabled = false
    this.feedbackTarget.textContent = ""
    this.feedbackTarget.className = "text-lg font-medium min-h-7"
    this.inputTarget.focus()
  }

  submit(event) {
    event.preventDefault()
    this.check()
  }

  inputChanged() {
    if (this.checkTimer) clearTimeout(this.checkTimer)
    if (!this.running || this.inputTarget.disabled) return
    if (this.inputTarget.value.trim() === "") return
    if (parseInt(this.inputTarget.value, 10) === this.target) {
      this.check()
      return
    }
    this.checkTimer = setTimeout(() => this.check(), 1000)
  }

  check() {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = null
    }
    if (!this.running || this.inputTarget.disabled) return
    const guess = parseInt(this.inputTarget.value, 10)
    if (Number.isNaN(guess)) return

    if (guess === this.target) {
      this.feedbackTarget.textContent = `Correct! ${this.target}.`
      this.feedbackTarget.className = "text-lg font-medium min-h-7 text-emerald-400"
      this.inputTarget.disabled = true
      setTimeout(() => {
        if (this.running) this.newRound()
      }, 1400)
    } else {
      this.feedbackTarget.textContent = "Not quite — try again."
      this.feedbackTarget.className = "text-lg font-medium min-h-7 text-amber-400"
      this.inputTarget.select()
    }
  }

  reveal() {
    if (!this.running) return
    this.feedbackTarget.textContent = `It was ${this.target}.`
    this.feedbackTarget.className = "text-lg font-medium min-h-7 text-neutral-400"
    this.inputTarget.disabled = true
    setTimeout(() => {
      if (this.running) this.newRound()
    }, 1400)
  }
}
