---
name: remotion-best-practices
description: Best practices for Remotion - Video creation in React
metadata:
  tags: remotion, video, react, animation, composition
---

## When to use

Use this skills whenever you are dealing with Remotion code to obtain the domain-specific knowledge.

## Captions

When dealing with captions or subtitles, load the [[resource:cf46ddcf-2645-4701-9f2d-e5cef4071f81]] file for more information.

## Using FFmpeg

For some video operations, such as trimming videos or detecting silence, FFmpeg should be used. Load the [[resource:fc14bde0-fae1-4d9d-8825-97a8dba88b69]] file for more information.

## Audio visualization

When needing to visualize audio (spectrum bars, waveforms, bass-reactive effects), load the [[resource:d7c5f408-e3d0-49db-92c7-5f5b8bc6db76]] file for more information.

## How to use

Read individual rule files for detailed explanations and code examples:

- [[resource:e64ed9d2-4498-439f-aa5b-64340feaf51d]] - 3D content in Remotion using Three.js and React Three Fiber
- [[resource:f23d1da6-a037-4cd0-bbfd-5bc86be96d7a]] - Fundamental animation skills for Remotion
- [[resource:a6ef6dfd-6123-4156-aa3c-3a6810cbf5b2]] - Importing images, videos, audio, and fonts into Remotion
- [rules/audio.md](rules/audio.md) - Using audio and sound in Remotion - importing, trimming, volume, speed, pitch
- [rules/calculate-metadata.md](rules/calculate-metadata.md) - Dynamically set composition duration, dimensions, and props
- [rules/can-decode.md](rules/can-decode.md) - Check if a video can be decoded by the browser using Mediabunny
- [rules/charts.md](rules/charts.md) - Chart and data visualization patterns for Remotion (bar, pie, line, stock charts)
- [rules/compositions.md](rules/compositions.md) - Defining compositions, stills, folders, default props and dynamic metadata
- [[resource:ef00153e-f9c7-4a34-af44-b32bc12991d6]] - Extract frames from videos at specific timestamps using Mediabunny
- [rules/fonts.md](rules/fonts.md) - Loading Google Fonts and local fonts in Remotion
- [rules/get-audio-duration.md](rules/get-audio-duration.md) - Getting the duration of an audio file in seconds with Mediabunny
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) - Getting the width and height of a video file with Mediabunny
- [rules/get-video-duration.md](rules/get-video-duration.md) - Getting the duration of a video file in seconds with Mediabunny
- [[resource:b326ce75-5193-4c39-9584-bcdc9f957b30]] - Displaying GIFs synchronized with Remotion's timeline
- [rules/images.md](rules/images.md) - Embedding images in Remotion using the Img component
- [rules/light-leaks.md](rules/light-leaks.md) - Light leak overlay effects using @remotion/light-leaks
- [[resource:bf2fd52a-f8b8-48ee-bac5-82321e120a7b]] - Embedding Lottie animations in Remotion
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) - Measuring DOM element dimensions in Remotion
- [[resource:f226656c-5563-4233-88c0-99ec65079e8e]] - Measuring text dimensions, fitting text to containers, and checking overflow
- [rules/sequencing.md](rules/sequencing.md) - Sequencing patterns for Remotion - delay, trim, limit duration of items
- [[resource:f141accb-a91f-4797-bb95-f18e7d5e4806]] - Using TailwindCSS in Remotion
- [[resource:a02b6ef6-45cf-4f5e-be26-bd482314fba6]] - Typography and text animation patterns for Remotion
- [rules/timing.md](rules/timing.md) - Interpolation curves in Remotion - linear, easing, spring animations
- [rules/transitions.md](rules/transitions.md) - Scene transition patterns for Remotion
- [[resource:c6e9cd1f-e178-4e3e-abfc-2c92e4029d59]] - Rendering out a video with transparency
- [rules/trimming.md](rules/trimming.md) - Trimming patterns for Remotion - cut the beginning or end of animations
- [[resource:c979d433-9649-4cd4-b682-cdfb8672dc62]] - Embedding videos in Remotion - trimming, volume, speed, looping, pitch
- [[resource:eedd3b6e-0f50-43e5-aa6f-5900da78546f]] - Make a video parametrizable by adding a Zod schema
- [rules/maps.md](rules/maps.md) - Add a map using Mapbox and animate it
- [[resource:a68c887f-df07-410f-ab4f-6cedcdc7227a]] - Adding AI-generated voiceover to Remotion compositions using ElevenLabs TTS
