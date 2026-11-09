---
name: Water Interval
description: A quiet Japanese lakeside view as light and seasons pass.
colors:
  deep-water: "#0a2635"
  warm-light: "#e8a27e"
  moonlight: "#d5e2ea"
  paper: "#f3f0e7"
  ink: "#172b34"
typography:
  display:
    fontFamily: "Yu Mincho, Hiragino Mincho ProN, Noto Serif Thai, Georgia, serif"
    fontSize: "clamp(38px, 5.2vw, 69px)"
    fontWeight: 400
    lineHeight: 1.34
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Noto Sans Thai, Thonburi, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "Yu Mincho, Georgia, serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "0px"
  round: "50%"
spacing:
  xs: "7px"
  sm: "14px"
  md: "23px"
  lg: "34px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "43px"
---

# Design System: Water Interval

## Overview

**Creative North Star: "A Day Passing Over Water"**

One Japanese lakeside view holds the page: a torii sits at the waterline with Mount Fuji and seasonal leaves carried by the wind. The WebGL scene moves from dawn to night as the visitor scrolls; clouds gather in moving patches before rain, and occasional wildlife and celestial events cross the same composition. Long, visible water swells continue while the scene is idle; scroll drives a wind gust through those waves without creating impact rings. Pressing or dragging on the water sends local ripples outward from the pointer while easing down the broad swells; those swells return after contact.

The interface stays quiet. The headline anchors the lower left. A compact Info control holds source credits, and the browser-local editor changes the featured subject and headline. No time readout, atmosphere switch, explanatory copy, or slide transition competes with the scene.

**Key Characteristics:**
- One continuous full-viewport waterside scene
- A continuously moving lake surface with visible broad swells, pointer-driven local ripples, and perspective-correct natural impacts
- Muted dawn, daylight, sunset, dusk, and moonlit palettes
- Random weather and wildlife events with 3D fish and gulls, close maple leaves, drifting blossoms, snow, aurora, meteors, eclipses, dry lightning, and fireworks
- CC0 3D fishing boat, fish, gull, ghost, and extracted leaf models with event-only paths and movement
- Small Info and edit controls with a warm paper editor panel

## Colors

The palette moves from deep water and night blue toward muted peach light; paper and ink stay reserved for the editor and source panel.

### Primary
- **Deep Water** (#0a2635): Page base and the cool end of the lake palette.
- **Warm Light** (#e8a27e): Dawn and late-day atmospheric treatment.

### Secondary
- **Moonlight** (#d5e2ea): Cool highlights and night-time atmosphere.

### Neutral
- **Paper** (#f3f0e7): Editor and source panel surface.
- **Ink** (#172b34): Editor text and save control.

## Typography

**Display Font:** Yu Mincho with Hiragino Mincho ProN, Noto Serif Thai, and Georgia fallbacks.
**Body Font:** Noto Sans Thai with Thonburi fallback.
**Label Font:** No separate mono face.

The display face gives the Thai headline a quiet, literary presence. Body copy stays plain and compact in controls so it does not compete with the landscape.

## Layout

The scene is sticky and full viewport within a tall scroll surface. Scroll progress scrubs the lighting across one 04:00-to-04:00 day. The headline anchors to the lower left; Info and edit controls sit in the top right; the editor slides in from the right. On narrow screens, the headline and controls move inward and the editor fills the viewport.

## Elevation & Depth

The photographed landscape, waterline, reflected scene, and perspective-corrected shader provide depth. The editor and Info source panel use one broad shadow to separate from the scene.

## Shapes

Controls and editor fields use square corners. The Info control and edit mark are circular. Fine translucent lines divide the header without forming cards.

## Components

- **Info control:** A compact source panel for landscape photography, NASA lunar map, and CC0 models.
- **Scene editor:** A warm paper side panel for changing the featured subject and headline and testing all 28 events at three levels; scene edits save only in this browser.
- **Scene canvas:** One continuous WebGL landscape with an animated water plane, seasonal assets, and event layers.

## Do's and Don'ts

### Do
- Keep the torii seated at the lake surface and retain its reflection.
- Keep visible long swells moving continuously. A press or drag sends local rings from the pointer and briefly calms the larger swells; scrolling changes time and wind, and timed events also run while idle.
- Make weather, animals, boats, and seasonal details arrive softly and fade out.
- Let scroll move time, light, and a wind gust through the same view without creating pointer-driven circular impact rings.

### Don't
- Don't use horizontal slide transitions between scenes.
- Don't mirror the full screen to fake a water reflection.
- Don't replace moving water with a static decorative pattern.
- Don't add visible controls or explanatory labels over the landscape.
