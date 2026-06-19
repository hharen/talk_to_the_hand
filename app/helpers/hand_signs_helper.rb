module HandSignsHelper
  # ---- Gesture composition (number -> ordered gesture descriptors) -----------
  #
  # Rules:
  #   * single digit (1..9)        -> ones gesture only
  #   * exact tens (10,20,..,90)   -> tens gesture only
  #   * 55,65,75,85,95             -> one combined gesture (fingers side + thumb)
  #   * otherwise                  -> tens gesture, then ones gesture
  #
  # Each descriptor: { place:, value:, fingers:, orientation:, thumb: }
  def gesture_sequence(number)
    number = number.to_i
    tens = number / 10
    ones = number % 10

    return [combined_gesture(number)] if ones == 5 && tens >= 5

    sequence = []
    sequence << tens_gesture(tens) if tens.positive?
    sequence << ones_gesture(ones) if ones.positive?
    sequence
  end

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

  # ---- Rendering -------------------------------------------------------------

  SKIN_FILL = "#e6b48c".freeze
  SKIN_STROKE = "#b07a52".freeze

  # Render a solid, skin-toned back-of-hand icon for a gesture descriptor.
  def hand_sign_svg(gesture, size: 180)
    geo = hand_geometry(gesture)
    body = primitives(geo)

    inner = geo[:rotation].zero? ? body : %(<g transform="rotate(#{geo[:rotation]} #{ROT_CX} #{ROT_CY})">#{body}</g>)

    <<~SVG.html_safe
      <svg viewBox="0 0 240 240" width="#{size}" height="#{size}" role="img"
           class="hand-sign" xmlns="http://www.w3.org/2000/svg">
        <g fill="var(--hand-skin, #{SKIN_FILL})" stroke="var(--hand-skin-stroke, #{SKIN_STROKE})" stroke-width="3"
           stroke-linejoin="round" stroke-linecap="round">
          #{inner}
        </g>
      </svg>
    SVG
  end

  private

  ROT_CX = 120
  ROT_CY = 132

  # Finger anchors for the neutral "fingers up, back of hand" frame:
  #   [base_x, base_y, length, width]
  FINGERS = [
    [92,  104, 56, 15],
    [111, 96,  64, 16],
    [130, 100, 56, 15],
    [148, 110, 44, 13],
  ].freeze

  # Back-of-hand palm silhouette (no wrist / no arm — rounded at the base).
  PALM_D =
    "M80,150 C78,118 84,104 94,100 C102,96 114,94 120,94 " \
    "C126,94 138,96 146,100 C156,104 162,118 160,150 " \
    "C160,184 146,194 120,194 C94,194 80,184 80,150 Z".freeze

  # Build geometry primitives for a gesture (before any rotation is applied).
  #   extended: [[bx,by,len,w], ...]  fingers pointing up
  #   bumps:    [[bx,by,w], ...]      folded finger knuckles
  #   thumb:    [bx,by,len,w,angle] or nil   (thumb is short and stubby)
  def hand_geometry(gesture)
    fingers = gesture[:fingers].to_i
    orientation = gesture[:orientation].to_sym
    thumb = gesture[:thumb]

    extended = []
    bumps = []
    thumb_spec = nil
    rotation = 0

    if thumb
      # Horizontal hand + thumb up: ones "5" (0 fingers) and combined 55-95.
      FINGERS.each_with_index do |(bx, by, len, w), i|
        i < fingers ? extended << [bx, by, len, w] : bumps << [bx, by, w]
      end
      thumb_spec = [86, 166, 44, 19, -90] # points left -> up after the 90° turn
      rotation = 90
    elsif orientation == :fist
      # 50: closed fist, no thumb, shown horizontally (like the 60-90 family).
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

  # A rounded capsule rising from (bx,by); angle 0 points up.
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

  # Solid skin-toned silhouette (palm + fingers + bumps + thumb).
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
