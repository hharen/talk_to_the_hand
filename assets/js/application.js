import { Application } from "@hotwired/stimulus"
import HandColorController from "controllers/hand_color_controller"
import ShowGameController from "controllers/show_game_controller"
import RecognizeGameController from "controllers/recognize_game_controller"

const application = Application.start()
application.debug = false
window.Stimulus = application

application.register("hand-color", HandColorController)
application.register("show-game", ShowGameController)
application.register("recognize-game", RecognizeGameController)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
  })
}
