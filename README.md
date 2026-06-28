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
- **Ones:** 1-4 = fingers down; 6-9 = fingers up; 5 = thumb up.
- **55/65/75/85/95:** a single combined gesture — fingers to the side with the
  thumb up.

See the in-app **gesture guide** (`/help`) for illustrations.

## Stack

- [Jekyll](https://jekyllrb.com/) static site (Ruby)
- Layouts + includes (shared header/footer, no duplication)
- A small Jekyll plugin (`_plugins/hand_sign.rb`) renders the hand-sign SVGs
- Stimulus (vendored, offline-friendly) for the interactive modes
- MediaPipe Tasks Vision (CDN) for in-browser hand recognition
- Tailwind CSS v4 (compiled to a static stylesheet)
- Installable **PWA** (web manifest + service worker, offline-capable)
- No database, no server-side code

## Running locally

Prerequisites: Ruby + Bundler, and Node (for the Tailwind build).

```sh
bundle install                 # install Jekyll + plugins
npm install                    # install the Tailwind CLI
npm run build:css              # compile assets/css/main.css
bundle exec jekyll serve       # http://localhost:4000
```

When adding new Tailwind utility classes, rebuild the stylesheet with
`npm run build:css` (or run `npm run watch:css` while developing). The compiled
`assets/css/main.css` is committed so the site works without a build step.

## Project layout

```
_config.yml              # Jekyll configuration
_layouts/default.html    # page shell (head + header + main + footer)
_includes/               # head, header, footer, legend partials
_plugins/hand_sign.rb    # {% hand_sign %} Liquid tag -> gesture SVGs
index.html               # home (/)
show.html                # /show
recognize.html           # /recognize
help.html                # /help
assets/js/               # Stimulus controllers + gesture libs (vendored Stimulus)
assets/css/main.css      # compiled Tailwind output
manifest.json            # PWA manifest
service-worker.js        # PWA offline cache
```

> The hand-sign SVGs are generated at build time by a local Jekyll plugin, so
> the site must be built with `bundle exec jekyll build` (custom plugins are not
> supported by GitHub Pages' default build — use a CI build or `gh-pages`
> artifact deploy instead).

