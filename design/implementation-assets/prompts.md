# Assets originales · fase 2

## Personajes — cuatro fotogramas por agente

```text
Use case: stylized-concept. Asset type: a production sprite sheet for Phaser, ORIGINAL pixel-art humans with 4 TRUE idle frames each. Use attached IVANIA artwork only as style and costume reference. NOT a mockup. PNG genuine alpha transparency, no ground, shadows, background, text, labels or effects.
Precise 1024x1024 atlas: 4 equal 256px columns and 2 equal 512px rows. Exactly eight figures. Each figure centered at x=128,384,640,896; feet baseline y=448 in top row and y=960 in bottom row. Keep every head and foot at EXACTLY the same height in all four frames. Characters stand relaxed front-facing, 3/4 slight right, arms at sides, feet planted, NOT walking. Character body height ~320px, width ~128px, generous transparent padding. Pixel grid logical pixels enlarged by 8x, crisp 8x8 square clusters, NO antialiased edges. Deep navy outline, warm skin, three shades per material.
Top row ANA: recognizable chestnut short bob haircut, turquoise open jacket, cream shirt, charcoal trousers, small brown shoes. No scarf.
Bottom row SOFIA: recognizable blue-black ponytail silhouette, plum jacket, ochre scarf, navy trousers, small dark shoes.
Four idle states left-to-right for BOTH rows: 1 neutral eyes open; 2 inhale jacket/shoulder highlights raised by ONE logical pixel while head/feet stay in place; 3 exhale neutral eyes HALF CLOSED; 4 neutral eyes fully CLOSED for a blink. Differences subtle but visible in pixels. These are coherent animation frames of the same person, same pose, body proportions and palette. No horizontal movement or translated copies. No conversation, working or current-action symbols. Polished game sprites, original character art, coherent with the attached cafe and world palette. No Terraria sprites.
```

Herramienta: image_gen integrada. Referencia de estilo: design/visual-direction-v1/desktop.png. No se usaron recursos externos ni imágenes de Terraria.

## Atlas de fachadas y vegetación

```text
Use case: stylized-concept. Asset type: ACTUAL transparent production sprite atlas, not a mockup. Original IVANIA production pixel art matching the attached approved style reference, orthogonal SIDE ELEVATION, crisp stepped clusters, no isometric perspective. Warm clay #b8664e, cream #f0e4c5, ink #152431, pine #264d48, sage #67916b, turquoise #69c6b6, amber #e6b776. Never copy Terraria art. No text, no letters, no UI, no people, no animals, no watermark, no ground shadows.
Create a 1536x1024 PNG with genuine ALPHA transparency in all empty space (not a checkerboard drawn into image). Exact 3 columns by 2 rows of 512x512 cells, NO grid lines. Every asset stays strictly within its own cell with 32px transparent safety margins. Objects in the top row end on y=480; objects in bottom row end on y=992, all fully visible and uncut. No asset crosses its cell.
Top left cell: detailed warm plaster house, asymmetrical terracotta shingled roof, chimney, timber porch, shutters, flowering window boxes. Full facade with door at bottom; no garden floor.
Top middle cell: charming cafe facade, teal striped awning, warm shop windows with shelves and hanging lamps, wooden door right, vines on roof edge. A wide EMPTY dark navy sign above awning (we add text at runtime). No text baked in. Cafe approximately as wide as house, shorter.
Top right cell: red brick workplace, three sections of sawtooth slate blue roof, tall arched windows amber reflections, deep teal door. Empty small dark sign. No machines.
Bottom left cell: one tall lush broadleaf oak, crooked richly textured trunk, spreading scalloped leafy canopy with intentional pixel clusters, visible transparent gaps. Entire tree from root to top.
Bottom middle cell: one tall slender birch, white and charcoal trunk with many delicate branches, sage leafy clusters and transparent gaps. Entire tree.
Bottom right cell: a cluster of original garden decoration as ONE independent sprite: weathered picket fence segment with three slats, low flowering shrubs with tiny cream/lavender flowers and ferns. No large ground slab.
Polished pixel-game production art, detailed at a logical 128-160px object size enlarged in the atlas, a consistent pixel scale across every asset. No blurry painting, no vector geometric placeholders, no soft alpha fringe. All silhouettes opaque pixels up to a hard transparent boundary. Do not include the reference background or HUD.
```

## Capas de fondo

```text
Use case: stylized-concept. Asset type: three independent repeating horizontal PARALLAX LAYERS on one 1536x1024 PNG atlas. Original IVANIA production pixel art matching the attached approved style reference, orthogonal SIDE ELEVATION, crisp stepped clusters, no isometric perspective. Warm clay #b8664e, cream #f0e4c5, ink #152431, pine #264d48, sage #67916b, turquoise #69c6b6, amber #e6b776. Never copy Terraria art. No text, no letters, no UI, no people, no animals, no watermark, no ground shadows.
Use the attached reference only for art direction. NO houses or buildings or town, NO foreground ground, NO characters. Exact 3 horizontal bands, each 1536x~341 pixels, strict boundaries.
TOP band y=0..340: fully opaque warm pale amber sky, small cream pixel clouds, gentle banded shades rather than smooth gradient; no sun disk. Sky only.
MIDDLE band y=341..681: isolated distant muted slate-lavender-blue mountain range spanning entire width; genuine alpha transparent sky above ridgeline, opaque mountains reaching bottom of band. Very detailed angular pixel ridge silhouettes, about 60 percent band occupied. No trees in this band.
BOTTOM band y=682..1023: isolated lush dark desaturated pine and deciduous forest ridge, genuine alpha transparent above all crowns; forest fills lower 75 percent and reaches bottom. Overlapping blue green and muted sage trees, fine intentional pixel clusters, atmospheric but crisp. No ground strip.
All three bands span full image width. Intended as separate layers cropped by Phaser frame rectangles, never as one whole background. Keep mountain and forest skyline tops at least 30px below top boundary of their respective bands, no bleed. Left and right endpoints visually repeat. Absolutely no fake checkerboard, no text.
```
