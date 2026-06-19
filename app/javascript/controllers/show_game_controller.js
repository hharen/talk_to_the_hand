import { Controller } from "@hotwired/stimulus"
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision"
import { classifyHand } from "lib/gesture_classifier"
import { numberToGestures, gestureToValue, describeGesture } from "lib/number_codec"

// Show mode: app shows a random number 1-99, the user signs it to the camera.
// Two-gesture numbers are captured by auto-advance: hold each gesture steady
// and it is captured, then the next gesture is expected.
export default class extends Controller {
  static targets = [
    "video", "prompt", "step", "feedback", "live",
    "startButton", "stopButton", "captured", "status",
    "solution", "solutionButton", "skipButton",
  ]

  static values = { holdMs: { type: Number, default: 800 } }

  connect() {
    this.running = false
    this.landmarker = null
    this.stream = null
    this.rafId = null
    this.resetHold()
  }

  disconnect() {
    this.stop()
  }

  resetHold() {
    this.currentKey = null
    this.holdStart = 0
    this.emitted = false
  }

  async start() {
    if (this.running) return

    // Show a target number immediately so the prompt is never just a placeholder,
    // even while the camera and gesture model are still loading.
    this.newRound()
    this.startButtonTarget.classList.add("hidden")
    this.stopButtonTarget.classList.remove("hidden")

    this.setStatus("Starting camera…")
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }, audio: false,
      })
      this.videoTarget.srcObject = this.stream
      await this.videoTarget.play()
    } catch (e) {
      this.fail(`Camera unavailable: ${e.message}`)
      return
    }

    if (!this.landmarker) {
      this.setStatus("Loading gesture model…")
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        )
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        })
      } catch (e) {
        this.fail(`Could not load model: ${e.message}`)
        return
      }
    }

    this.running = true
    this.setStatus("Watching…")
    this.loop()
  }

  fail(message) {
    this.feedbackTarget.textContent = message
    this.feedbackTarget.className = "mt-5 text-lg font-medium min-h-7 text-amber-400"
    this.setStatus("")
    this.startButtonTarget.classList.remove("hidden")
    this.stopButtonTarget.classList.add("hidden")
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
  }

  stop() {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.hasVideoTarget) this.videoTarget.srcObject = null
    if (this.hasStartButtonTarget) this.startButtonTarget.classList.remove("hidden")
    if (this.hasStopButtonTarget) this.stopButtonTarget.classList.add("hidden")
    this.setStatus("Stopped.")
    if (this.hasLiveTarget) this.liveTarget.textContent = "—"
    this.promptTarget.textContent = "Press Start"
    this.promptTarget.className = "mt-2 text-2xl font-medium text-neutral-500"
    this.solutionTarget.classList.add("hidden")
    this.solutionButtonTarget.classList.add("hidden")
    this.skipButtonTarget.classList.add("hidden")
  }

  newRound() {
    this.target = Math.floor(Math.random() * 99) + 1
    this.expected = numberToGestures(this.target)
    this.stepIndex = 0
    this.captured = []
    this.resetHold()
    this.promptTarget.textContent = this.target
    this.promptTarget.className = "mt-2 text-7xl font-semibold tabular-nums text-neutral-50"
    this.feedbackTarget.textContent = ""
    this.feedbackTarget.className = "mt-5 text-lg font-medium min-h-7"
    this.solutionTarget.textContent = ""
    this.solutionTarget.classList.add("hidden")
    this.solutionButtonTarget.classList.remove("hidden")
    this.skipButtonTarget.classList.remove("hidden")
    this.renderCaptured()
    this.updateStep()
  }

  showSolution() {
    const parts = this.expected.map((g) => describeGesture({ fingers: g.fingers, orientation: g.orientation, thumb: g.thumb }))
    this.solutionTarget.textContent = `Solution: ${parts.join(" → ")}`
    this.solutionTarget.classList.remove("hidden")
    this.solutionButtonTarget.classList.add("hidden")
  }

  skip() {
    this.newRound()
  }

  updateStep() {
    const total = this.expected.length
    const place = this.expected[this.stepIndex]?.place
    if (place === "combined") {
      this.stepTarget.textContent = "Show fingers sideways with thumb up"
      return
    }
    const label = place === "tens" ? "tens" : "ones"
    this.stepTarget.textContent =
      total > 1
        ? `Show gesture ${this.stepIndex + 1} of ${total} (${label})`
        : `Show the ${label} gesture`
  }

  renderCaptured() {
    if (!this.hasCapturedTarget) return
    this.capturedTarget.textContent = this.captured.length
      ? `Captured: ${this.captured.join(" → ")}`
      : ""
  }

  loop() {
    if (!this.running) return
    const now = performance.now()
    let raw = null
    if (this.videoTarget.readyState >= 2) {
      const result = this.landmarker.detectForVideo(this.videoTarget, now)
      if (result.landmarks && result.landmarks.length) {
        raw = classifyHand(result.landmarks[0])
      }
    }

    this.liveTarget.textContent = raw ? describeGesture(raw) : "—"

    const key = raw ? `${raw.fingers}-${raw.orientation}-${raw.thumb}` : null
    if (key !== this.currentKey) {
      this.currentKey = key
      this.holdStart = now
      this.emitted = false
    } else if (key && !this.emitted && now - this.holdStart >= this.holdMsValue) {
      this.emitted = true
      this.onStableGesture(raw)
    }

    this.rafId = requestAnimationFrame(() => this.loop())
  }

  onStableGesture(raw) {
    const expected = this.expected[this.stepIndex]
    if (!expected) return
    const value = gestureToValue(raw, expected.place)

    if (value === expected.value) {
      this.captured.push(value)
      this.renderCaptured()
      this.stepIndex += 1
      if (this.stepIndex >= this.expected.length) {
        this.roundComplete()
      } else {
        this.feedbackTarget.textContent = "Good — next gesture…"
        this.feedbackTarget.className = "mt-5 text-lg font-medium min-h-7 text-sky-400"
        this.updateStep()
      }
    } else {
      const got = value != null ? value : describeGesture(raw)
      this.feedbackTarget.textContent = `Not quite — read as ${got}. Try again.`
      this.feedbackTarget.className = "mt-5 text-lg font-medium min-h-7 text-amber-400"
    }
  }

  roundComplete() {
    this.feedbackTarget.textContent = `Correct! That was ${this.target}.`
    this.feedbackTarget.className = "mt-5 text-lg font-medium min-h-7 text-emerald-400"
    this.updateStepDone()
    setTimeout(() => {
      if (this.running) this.newRound()
    }, 1800)
  }

  updateStepDone() {
    this.stepTarget.textContent = "✓"
  }

  setStatus(text) {
    if (this.hasStatusTarget) this.statusTarget.textContent = text
  }
}
