---
name: pn-shader-authoring
description: Guides GLSL/WGSL shader authoring for Three.js, postprocessing, and custom materials. Use when writing shaders; covers structure, common patterns, performance, and debugging.
---

# Shader authoring skill

## When to use

- Writing or refactoring vertex or fragment shaders
- Creating custom Three.js ShaderMaterial or RawShaderMaterial
- Adding custom postprocessing passes
- Migrating custom shaders to WebGPU (prefer TSL per pn-threejs-core for GLSL/WGSL portability)
- Implementing noise, lighting models, or SDF effects
- Optimizing or debugging shader performance

## GLSL structure

1. **Precision:** Use `precision highp float;` (or `mediump` for mobile) in fragment shaders. Vertex shaders inherit from fragment or use explicit precision.
2. **Uniforms:** Declare all uniforms at top; use descriptive names. Pass only what is needed; avoid large uniform blocks when possible.
3. **Varyings:** Keep varyings minimal; interpolate only necessary data (e.g. `vUv`, `vNormal`, `vWorldPosition`).
4. **Defines:** Use `#define` for constants (e.g. `#define PI 3.14159265`). Avoid magic numbers in shader body.

## Three.js ShaderMaterial patterns

- **Built-in uniforms:** Three.js provides `modelViewMatrix`, `projectionMatrix`, `normalMatrix`, `cameraPosition`, etc. Use `ShaderChunk` or copy from Three.js examples when appropriate.
- **RawShaderMaterial:** Use when you need full control (no built-in chunks). Include required attributes and uniforms manually.
- **Updating uniforms:** Set uniforms in `useFrame` or render loop. Avoid creating new objects per frame; reuse uniform objects.
- **Texture units:** Bind textures to correct units; set `uniforms.map.value` and `uniforms.map.texelSize` when needed for postprocessing.

## Common patterns

### Noise
- **Simplex / Perlin:** Use established implementations (e.g. from Shadertoy, Inigo Quilez). Optimize for your use case (2D vs 3D).
- **FBM (Fractal Brownian Motion):** Layer noise at different frequencies for terrain, clouds, or organic patterns. Control octaves and lacunarity for performance.

### Lighting models
- **Phong:** Ambient + diffuse (N·L) + specular (R·V)^n. Use for simple non-PBR.
- **PBR:** Use physically based BRDF (e.g. Cook-Torrance) when matching Three.js PBR workflow.
- **Toon:** Step or smoothstep on N·L for cel-shading. Add rim light with fresnel.

### UV manipulation
- **Tiling:** `fract(uv * scale)` for seamless tiling. Use `texture2D` with `repeat` wrap.
- **Distortion:** Use noise or flow maps to distort UVs for water, heat haze.
- **Triplanar:** Project texture from three axes for terrain or procedural objects.

### SDF (Signed Distance Fields)
- **Raymarching:** Use for procedural shapes, clouds, or effects. Limit steps for performance.
- **2D SDFs:** Combine primitives (circle, box, etc.) with smooth min/max for logos or UI.

## Postprocessing custom passes

- **EffectComposer:** Add custom `Pass` with `render()` that uses your shader. Set `renderToScreen` on final pass.
- **Full-screen quad:** Render to texture; sample previous pass as input. Use `tDiffuse` or custom uniform names.
- **Resolution:** Match pass resolution to composer; use half-res for expensive effects when acceptable.
- **Order:** Document pass order; ensure inputs (e.g. depth, normals) are available when needed.

## Performance

- **Branching:** Minimize dynamic branching (if/else on varying data). Prefer `mix()` or step functions when possible.
- **Texture lookups:** Reduce texture fetches; use mipmaps; avoid dependent lookups in loops.
- **Overdraw:** Reduce overlapping transparent or additive passes. Use early-z when possible.
- **Precision:** Use `mediump` for colors or values that don't need high precision on mobile.
- **Loops:** Unroll small loops when known at compile time; avoid variable loop counts when possible.

## Debugging

- **Color output:** Map intermediate values to color (e.g. `gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0)`) to visualize normals, UVs, depth.
- **Step through:** Expose uniforms (e.g. `uDebug`) to toggle effects or adjust values at runtime.
- **Validation:** Use browser WebGL debug extensions or Three.js `debug.checkShaderErrors` to catch compile/link errors.
- **Incremental:** Build shaders incrementally; verify each pass before adding complexity.

## Output

- Working shaders with explicit precision, documented uniforms, and no magic numbers.
- Reference pn-threejs-core for scene and postprocessing setup; pn-game-logic for game-specific effects.
