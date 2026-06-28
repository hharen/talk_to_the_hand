# Renders skin-toned back-of-hand SVG gesture icons for the wind-tunnel hand code.
# Ported from the original Rails HandSignsHelper so the Jekyll site keeps the
# exact same geometry without duplicating SVG markup across pages.
#
# Usage in Liquid templates:
#   {% hand_sign tens 3 %}            -> tens gesture for 30 (digit 3)
#   {% hand_sign ones 7 size:84 %}    -> ones gesture for 7 at 84px
#   {% hand_sign combined 75 %}       -> combined gesture for 75
#   {% hand_sign preview size:72 %}   -> neutral 4-fingers-up preview hand
module HandSigns
  SKIN_FILL = "#e6b48c".freeze
  SKIN_STROKE = "#b07a52".freeze

  ROT_CX = 120
  ROT_CY = 132

  FINGERS = [
    [92,  104, 56, 15],
    [111, 96,  64, 16],
    [130, 100, 56, 15],
    [148, 110, 44, 13],
  ].freeze

  PALM_D =
    "M80,150 C78,118 84,104 94,100 C102,96 114,94 120,94 " \
    "C126,94 138,96 146,100 C156,104 162,118 160,150 " \
    "C160,184 146,194 120,194 C94,194 80,184 80,150 Z".freeze

  module_function

  # ---- Gesture descriptors --------------------------------------------------

  def combined_gesture(number)
    tens = number / 10
    { place: :combined, value: number, fingers: tens - 5, orientation: :horizontal, thumb: true }
  end

  def tens_gesture(tens)
    case tens
    when 1..4
      { place: :tens, value: tens * 10, fingers: tens, orientation: :down, thumb: false }
    when 5
      { place: :tens, value: 50, fingers: 0, orientation: :fist, thumb: false }
    when 6..9
      { place: :tens, value: tens * 10, fingers: tens - 5, orientation: :horizontal, thumb: false }
    end
  end

  def ones_gesture(ones)
    case ones
    when 1..4
      { place: :ones, value: ones, fingers: ones, orientation: :down, thumb: false }
    when 5
      { place: :ones, value: 5, fingers: 0, orientation: :horizontal, thumb: true }
    when 6..9
      { place: :ones, value: ones, fingers: ones - 5, orientation: :up, thumb: false }
    end
  end

  # ---- Rendering ------------------------------------------------------------

  def hand_sign_svg(gesture, size: 180)
    geo = hand_geometry(gesture)
    body = primitives(geo)

    inner = geo[:rotation].zero? ? body : %(<g transform="rotate(#{geo[:rotation]} #{ROT_CX} #{ROT_CY})">#{body}</g>)

    <<~SVG
      <svg viewBox="0 0 240 240" width="#{size}" height="#{size}" role="img"
           class="hand-sign" xmlns="http://www.w3.org/2000/svg">
        <g fill="var(--hand-skin, #{SKIN_FILL})" stroke="var(--hand-skin-stroke, #{SKIN_STROKE})" stroke-width="3"
           stroke-linejoin="round" stroke-linecap="round">
          #{inner}
        </g>
      </svg>
    SVG
  end

  def hand_geometry(gesture)
    fingers = gesture[:fingers].to_i
    orientation = gesture[:orientation].to_sym
    thumb = gesture[:thumb]

    extended = []
    bumps = []
    thumb_spec = nil
    rotation = 0

    if thumb
      FINGERS.each_with_index do |(bx, by, len, w), i|
        i < fingers ? extended << [bx, by, len, w] : bumps << [bx, by, w]
      end
      thumb_spec = [86, 166, 44, 19, -90]
      rotation = 90
    elsif orientation == :fist
      FINGERS.each { |bx, by, _len, w| bumps << [bx, by, w] }
      rotation = 90
    else
      FINGERS.each_with_index do |(bx, by, len, w), i|
        i < fingers ? extended << [bx, by, len, w] : bumps << [bx, by, w]
      end
      rotation = orientation == :down ? 180 : (orientation == :horizontal ? 90 : 0)
    end

    { extended: extended, bumps: bumps, thumb: thumb_spec, rotation: rotation }
  end

  def capsule(bx, by, length, width, angle: 0, scale_w: 1.0, extra: "")
    w = width * scale_w
    half = w / 2.0
    tip = by - length
    h = length + half + 10
    rect = %(<rect x="#{r(bx - half)}" y="#{r(tip)}" width="#{r(w)}" height="#{r(h)}" rx="#{r(half)}" #{extra}/>)
    angle.zero? ? rect : %(<g transform="rotate(#{angle} #{r(bx)} #{r(by)})">#{rect}</g>)
  end

  def bump(bx, by, width, scale_w: 1.0, extra: "")
    w = width * scale_w
    half = w / 2.0
    %(<rect x="#{r(bx - half)}" y="#{r(by - 14)}" width="#{r(w)}" height="26" rx="#{r(half)}" #{extra}/>)
  end

  def primitives(geo, palm: PALM_D)
    out = +%(<path d="#{palm}"/>)
    geo[:extended].each { |bx, by, len, w| out << capsule(bx, by, len, w) }
    geo[:bumps].each { |bx, by, w| out << bump(bx, by, w) }
    if (t = geo[:thumb])
      out << capsule(t[0], t[1], t[2], t[3], angle: t[4])
    end
    out
  end

  def r(value)
    value.round(1)
  end
end

# Liquid tag: {% hand_sign <type> [value] [size:N] %}
#   type: tens | ones | combined | preview
class HandSignTag < Liquid::Tag
  def initialize(tag_name, markup, tokens)
    super
    @markup = markup.strip
  end

  def render(context)
    parts = @markup.split(/\s+/)
    type = parts.shift

    size = 180
    value = nil
    parts.each do |token|
      if token =~ /\Asize:(.+)\z/
        size = resolve(Regexp.last_match(1), context).to_i
      else
        value = resolve(token, context).to_i
      end
    end

    gesture =
      case type
      when "tens"     then HandSigns.tens_gesture(value)
      when "ones"     then HandSigns.ones_gesture(value)
      when "combined" then HandSigns.combined_gesture(value)
      when "preview"  then { place: :preview, fingers: 4, orientation: :up, thumb: false }
      else
        raise Liquid::SyntaxError, "Unknown hand_sign type: #{type.inspect}"
      end

    HandSigns.hand_sign_svg(gesture, size: size)
  end

  # A token is either a literal integer or the name of a Liquid variable
  # available in the current render context (used inside {% for %} loops).
  def resolve(token, context)
    return token.to_i if token =~ /\A\d+\z/

    context[token]
  end
end

Liquid::Template.register_tag("hand_sign", HandSignTag)
