# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web

## Stack

Next.js App Router, chosen by the user. The water, weather, lighting, and surface events use WebGL; the fishing boat uses Three.js with a local GLB asset.

## Users

The site owner edits the featured scene in a browser-local CMS. Visitors experience one Japanese lakeside view by scrolling through a full day and pressing or dragging a pointer across the lake.

## Product Purpose

A quiet Japanese waterside scene centered on a distant torii. Scroll moves the light from 04:00 through the following 04:00 while natural events briefly alter the sky, shore, and water.

## Capabilities and Constraints

- One continuous page preserves the photographed water and centered torii. Scrolling advances time rather than switching between slides.
- The daylight cycle runs 04:00–04:00: dawn 04:00–06:00, day 06:00–14:00, evening 14:00–18:00, dusk 18:00–20:00, and night 20:00–04:00.
- The lake moves with visible, continuous, perspective-aware swells while idle. Scrolling moves time and adds a wind gust that bends the swells without making impact rings; after a cooldown, it can also start a random event. Pressing or dragging on the water sends small local rings outward from the pointer while briefly easing down the broad swells; those swells return after contact.
- Weather and fog build gradually. Cloud cover gathers in moving patches before rain falls in drifting clusters; rainfall and falling seasonal particles create surface disturbance.
- Events include mist, rain, sun, overcast sky, storms, a faint spirit, fish, dolphins, bird flock fly-bys with a torii landing/take-off sequence, gusts, distant rain, aurora, a fishing boat, seasonal blossoms/fireworks/leaves/snow, torii moss, murky/clear water, single meteors, meteor showers, and solar/lunar eclipses.
- Random events are weighted within the current time period. The first event waits 8–14 seconds, then each event is followed by a 6–12 second pause. A substantial scroll can also start an event after a 6.5 second cooldown; event timing continues while the page is idle, and natural event strength is randomly chosen from three levels.
- Every selected event remains active for exactly 300 real seconds. It fades in and out gradually; short appearances such as a boat, animal, meteor, or fireworks repeat on a spaced cycle during that period.
- The editor includes a test control for every event at levels 1, 2, and 3. Solar and lunar eclipse previews ease the time of day to the matching light before the eclipse begins.
- A fisherman and CC0 fishing boat can pass far away, cross closer to the viewer, or move from the shore. The boat event is weighted to appear regularly in every time period. A tapered wake follows its path across the same water surface.
- Japan's four seasons appear through natural particles: drifting spring blossoms, summer fireworks, autumn leaves that float on the surface and create ripples, and winter snow.
- Clouds and mist remain available throughout the day and accumulate in moving patches before rain starts in groups beneath them. Rain, fog, cloud, and snow density rises and then thins gradually; a dry storm has its own lightning-only event.
- The browser-local editor can change the featured subject and headline. Changes stay in this browser; shared publishing and login are out of scope.
- Bird, fish, extracted maple-leaf, and Quaternius ghost GLB models are local project assets and appear only during their event. Each bird cycle has two or three visible fly-bys; on the torii scene, the lead gull lands on the crossbeam, steps along it, preens, flutters, and takes off. Distance varies between far, medium, and near routes; fish swim or leap with a water wake; autumn leaves tumble at multiple distances, and a close leaf gust can briefly fill the view before blowing away. The ghost uses its bundled flying-idle animation.
- Photo and model sources are grouped behind an Info button. The scene itself has no visible time readout or explanatory copy.

## Product Principles

- Keep the torii seated at the waterline and visually connected to the reflection.
- Keep broad, visible swells moving between events. Pointer presses and drags make local rings at the contact point while briefly calming the larger swells; scroll sends a wind gust through the same waves without creating impact rings.
- Let time pass in one place with gradual color transitions, not horizontal slide navigation.
- Keep the scene clean and let Info and the editor stay secondary to it.
