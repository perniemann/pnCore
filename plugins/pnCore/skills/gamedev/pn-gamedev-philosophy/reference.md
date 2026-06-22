# Game Development Philosophy — Reference

Execution framework for applying the rulebook. For the core philosophy and Do/Don't rules, see [SKILL.md](SKILL.md).

---

## Gamedev Audit Workflow (run in order)

### Phase 1 | Game Loop Audit

- Identify update vs render separation
- Check timestep strategy (fixed vs variable)
- Verify accumulator pattern for physics
- Check update order documentation
- Profile frame time; identify dominant cost (CPU vs GPU)

**Pass criteria:** Fixed timestep for physics; explicit update order; frame budget known.

---

### Phase 2 | Scene and Hierarchy Audit

- Map object hierarchy and grouping
- Check naming consistency (prefixes/suffixes)
- Identify disposal points (scene switch, mesh remove)
- Verify no per-frame allocations in hot paths
- Check asset reuse (instancing, shared materials)

**Pass criteria:** Clear hierarchy; disposal on remove; no allocation in render loop.

---

### Phase 3 | Performance Audit

- Measure frame time against budget (60 FPS = 16.7ms)
- Check draw call count; identify batching opportunities
- Verify LOD usage for distant objects
- Check shadow and post-processing budget
- Profile memory (renderer.info, VRAM)

**Pass criteria:** Within frame budget; draw calls optimized; memory stable.

---

### Phase 4 | State and Input Audit

- Map game states and transitions
- Check input mapping (raw → logical actions)
- Verify state entry/exit handlers
- Check save/load serialization (plain data only)
- Verify input buffering for responsiveness

**Pass criteria:** Explicit state machine; decoupled input; serializable save format.

---

### Phase 5 | Physics Audit (if applicable)

- Verify fixed timestep for physics
- Check sync order (physics → game state → render)
- Verify collision groups/filters
- Check separation of collision logic from physics

**Pass criteria:** Physics in fixed step; correct sync order; no logic in wrong place.

---

## Agent Templates (copy-paste)

### Game Loop Block

```
Target FPS:
Frame budget (ms):
Timestep:
Update order:
Physics timestep:
Interpolation strategy:
```

### Scene Hierarchy Block

```
Group:
Purpose:
Objects:
Naming convention:
Disposal trigger:
```

### Performance Budget Block

```
Target platform:
Frame budget:
Draw call target:
LOD strategy:
Shadow budget:
Post-processing passes:
```

### State Machine Block

```
States:
Transitions:
Entry handlers:
Exit handlers:
Save/load scope:
```

---

## Red Flag Checklist (fast QA)

Fail the game/scene if any are true:

- [ ] Physics uses variable delta
- [ ] No disposal on scene/mesh removal
- [ ] Per-frame allocation in render loop
- [ ] Frame time exceeds budget with no mitigation
- [ ] No explicit update order
- [ ] State managed by scattered booleans
- [ ] Input coupled directly to game logic
- [ ] Save format includes non-serializable data
- [ ] Undocumented hierarchy or pass order
- [ ] No profiling before optimization
