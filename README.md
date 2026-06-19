# Talk to the Hand 🤚

A trainer for the indoor skydiving (wind tunnel) hand-signal code used to
communicate windspeeds from 1 to 99. No accounts, no scores — just practice.

## Modes

- **Show** — the app gives you a number; you sign it to your device camera and
  in-browser gesture recognition checks your hand.
- **Recognize** — the app shows the gesture(s); you read them and type the
  windspeed. Correct answers are recognized as you type.

## The gesture code

Numbers are shown with the **back of the hand** as a *tens* gesture followed by
a *ones* gesture (single digits and exact tens use just one gesture).

- **Tens:** 10-40 = 1-4 fingers pointing down; 50 = fist (no thumb); 60-90 =
  1-4 fingers pointing sideways.
- **Ones:** 1-4 = fingers up; 6-9 = fingers down; 5 = thumb up.
- **55/65/75/85/95:** a single combined gesture — fingers to the side with the
  thumb up.

See the in-app **gesture guide** (`/help`) for illustrations.

## Stack

- Ruby 4 / Rails 8
- Hotwire (Turbo + Stimulus), importmap, Propshaft
- Tailwind CSS v4
- No database

## Running locally

```sh
bin/setup            # install dependencies
bin/rails tailwindcss:build
bin/rails server     # http://localhost:3000
```

When adding new Tailwind utility classes, rebuild with
`bin/rails tailwindcss:build`.
