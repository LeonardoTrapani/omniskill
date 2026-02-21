---
name: vue-debug-guides
description: Vue 3 debugging and error handling for runtime errors, warnings, async failures, and SSR/hydration issues. Use when diagnosing or fixing Vue issues.
---

Vue 3 debugging and error handling for runtime issues, warnings, async failures, and hydration bugs.
For development best practices and common gotchas, use `vue-best-practices`.

### Reactivity
- Tracing unexpected re-renders and state updates → See [reactivity-debugging-hooks](reference/reactivity-debugging-hooks.md)
- Ref values not updating due to missing .value access → See [[resource:924d46ee-5e89-4b6a-9304-64846256b934]]
- State stops updating after destructuring reactive objects → See [[resource:d01124e0-0c5f-4446-bdd9-2e14151a2707]]
- Refs inside arrays, Maps, or Sets not unwrapping → See [refs-in-collections-need-value](reference/refs-in-collections-need-value.md)
- Nested refs rendering as [object Object] in templates → See [template-ref-unwrapping-top-level](reference/template-ref-unwrapping-top-level.md)
- Reactive proxy identity comparisons always return false → See [reactivity-proxy-identity-hazard](reference/reactivity-proxy-identity-hazard.md)
- Third-party instances breaking when proxied → See [reactivity-markraw-for-non-reactive](reference/reactivity-markraw-for-non-reactive.md)
- Watchers only firing once per tick unexpectedly → See [[resource:da98f5fa-1526-4ecb-b195-1a3e9fa57187]]

### Computed
- Computed getter triggers mutations or requests unexpectedly → See [computed-no-side-effects](reference/computed-no-side-effects.md)
- Mutating computed values causes changes to disappear → See [computed-return-value-readonly](reference/computed-return-value-readonly.md)
- Computed value never updates after conditional logic → See [computed-conditional-dependencies](reference/computed-conditional-dependencies.md)
- Sorting or reversing arrays breaks original state → See [computed-array-mutation](reference/computed-array-mutation.md)
- Passing parameters to computed properties fails → See [[resource:e1d5774b-64dc-4e6a-8510-481cfec5fff9]]

### Watchers
- Async operations overwriting with stale data → See [watch-async-cleanup](reference/watch-async-cleanup.md)
- Creating watchers inside async callbacks → See [[resource:c56d4e4c-21e0-461d-adbc-8c84eddcd380]]
- Watcher never triggers for reactive object properties → See [watch-reactive-property-getter](reference/watch-reactive-property-getter.md)
- Async watchEffect misses dependencies after await → See [[resource:9faf807f-25ea-4bb5-a4c3-5475d485ae83]]
- DOM reads are stale inside watcher callbacks → See [[resource:d8be8ffa-2d39-427b-bbe5-d03f8b5555c4]]
- Deep watchers report identical old/new values → See [watch-deep-same-object-reference](reference/watch-deep-same-object-reference.md)
- watchEffect runs before template refs update → See [watcheffect-flush-post-for-refs](reference/watcheffect-flush-post-for-refs.md)

### Components
- Child component throws "component not found" error → See [local-components-not-in-descendants](reference/local-components-not-in-descendants.md)
- Click listener doesn't fire on custom component → See [[resource:9aedda62-1463-41fc-84b6-7c10518f8d3c]]
- Parent can't access child ref data in script setup → See [[resource:b3c6e429-efe0-4927-a39e-efe804230f81]]
- HTML template parsing breaks Vue component syntax → See [[resource:da805b6a-b243-41aa-bc8b-c3b73a7181a3]]
- Wrong component renders due to naming collisions → See [[resource:b1ba7d69-5522-4ef2-94ee-b8685617a202]]
- Parent styles don't apply to multi-root component → See [[resource:94d4cf54-8d6b-4836-b620-179fc1046158]]

### Props & Emits
- Variables referenced in defineProps cause errors → See [[resource:d80d7fe3-6cab-4860-ae82-11bd22d19034]]
- Component emits undeclared event causing warnings → See [declare-emits-for-documentation](reference/declare-emits-for-documentation.md)
- defineEmits used inside function or conditional → See [[resource:fc16fa77-cfbe-426f-b543-0906ca81de31]]
- defineEmits has both type and runtime arguments → See [defineEmits-no-runtime-and-type-mixed](reference/defineEmits-no-runtime-and-type-mixed.md)
- Native event listeners not responding to clicks → See [native-event-collision-with-emits](reference/native-event-collision-with-emits.md)
- Component event fires twice when clicking → See [[resource:a4da95f5-6bed-4541-a508-bdae2cd96b84]]

### Templates
- Getting template compilation errors with statements → See [[resource:b4fe39f0-6869-404f-815e-74c4db36a9d7]]
- "Cannot read property of undefined" runtime errors → See [v-if-null-check-order](reference/v-if-null-check-order.md)
- Dynamic directive arguments not working properly → See [dynamic-argument-constraints](reference/dynamic-argument-constraints.md)
- v-else elements rendering unconditionally always → See [v-else-must-follow-v-if](reference/v-else-must-follow-v-if.md)
- Mixing v-if with v-for causes precedence bugs and migration breakage → See [[resource:b4700e3c-474c-4a35-84e2-036bf32f3b20]]
- Template function calls mutating state cause unpredictable re-render bugs → See [[resource:b21af887-45fb-477f-8134-59c6ebe8412d]]
- Child components in loops showing undefined data → See [v-for-component-props](reference/v-for-component-props.md)
- Array order changing after sorting or reversing → See [v-for-computed-reverse-sort](reference/v-for-computed-reverse-sort.md)
- List items disappearing or swapping state unexpectedly → See [[resource:fee84d30-b042-4b7f-b460-07a22497b367]]
- Getting off-by-one errors with range iteration → See [[resource:d73df31d-8e00-4d5d-8a7c-8748c30ad8ba]]
- v-show or v-else not working on template elements → See [[resource:98d61b5f-ca40-4932-a699-f599796e8d03]]

### Template Refs
- Ref becomes null when element is conditionally hidden → See [template-ref-null-with-v-if](reference/template-ref-null-with-v-if.md)
- Ref array indices don't match data array in loops → See [[resource:f890cfd1-33d4-4fee-974c-f3d2cbd345dd]]
- Refactoring template ref names breaks silently in code → See [[resource:9df1d440-8784-4982-8c0a-192e36574ffa]]

### Forms & v-model
- Initial form values not showing when using v-model → See [v-model-ignores-html-attributes](reference/v-model-ignores-html-attributes.md)
- Textarea content changes not updating the ref → See [textarea-no-interpolation](reference/textarea-no-interpolation.md)
- iOS users cannot select dropdown first option → See [select-initial-value-ios-bug](reference/select-initial-value-ios-bug.md)
- Parent and child components have different values → See [[resource:a3573599-1cd3-4986-a36a-0235ebe11407]]
- Object property changes not syncing to parent → See [[resource:ee40f2ad-5524-46ea-8334-acce116dc535]]
- Real-time search/validation broken for Chinese/Japanese input → See [[resource:c5e63549-5f24-40eb-ad7e-0ac0dd904804]]
- Number input returns empty string instead of zero → See [[resource:fc26e423-82c8-4800-97f0-f6b2a745bd90]]
- Custom checkbox values not submitted in forms → See [checkbox-true-false-value-form-submission](reference/checkbox-true-false-value-form-submission.md)

### Events & Modifiers
- Chaining multiple event modifiers produces unexpected results → See [event-modifier-order-matters](reference/event-modifier-order-matters.md)
- Keyboard shortcuts don't fire with system modifier keys → See [keyup-modifier-timing](reference/keyup-modifier-timing.md)
- Keyboard shortcuts fire with unintended modifier combinations → See [exact-modifier-for-precise-shortcuts](reference/exact-modifier-for-precise-shortcuts.md)
- Combining passive and prevent modifiers breaks event behavior → See [no-passive-with-prevent](reference/no-passive-with-prevent.md)

### Lifecycle
- Memory leaks from unremoved event listeners → See [cleanup-side-effects](reference/cleanup-side-effects.md)
- DOM access fails before component mounts → See [lifecycle-dom-access-timing](reference/lifecycle-dom-access-timing.md)
- DOM reads return stale values after state changes → See [[resource:a0cb2994-d8c0-4bf4-919c-a3a42dd4fc8f]]
- SSR rendering differs from client hydration → See [lifecycle-ssr-awareness](reference/lifecycle-ssr-awareness.md)
- Lifecycle hooks registered asynchronously never run → See [[resource:98d471e9-10e1-432d-ba0b-7e9c52a7d4dd]]

### Slots
- Accessing child component data in slot content returns undefined values → See [slot-render-scope-parent-only](reference/slot-render-scope-parent-only.md)
- Mixing named and scoped slots together causes compilation errors → See [[resource:d6878844-ecc9-4303-b8a6-8f2bf5051910]]
- Using v-slot on native HTML elements causes compilation errors → See [slot-v-slot-on-components-or-templates-only](reference/slot-v-slot-on-components-or-templates-only.md)
- Unexpected content placement from implicit default slot behavior → See [[resource:f5ece8ae-1b90-4a51-87ed-6a7f4e9e3868]]
- Scoped slot props missing expected name property → See [[resource:917306db-3028-4fd9-9b87-1ea76fa9dcd6]]
- Wrapper components breaking child slot functionality → See [slot-forwarding-to-child-components](reference/slot-forwarding-to-child-components.md)

### Provide/Inject
- Calling provide after async operations fails silently → See [provide-inject-synchronous-setup](reference/provide-inject-synchronous-setup.md)
- Tracing where provided values come from → See [[resource:f96058b8-774c-4b7a-bcd1-db789b4a0a87]]
- Injected values not updating when provider changes → See [[resource:d87a4675-0eca-4fd5-969e-64ac5c7662e6]]
- Multiple components share same default object → See [provide-inject-default-value-factory](reference/provide-inject-default-value-factory.md)

### Attrs
- Both internal and fallthrough event handlers execute → See [attrs-event-listener-merging](reference/attrs-event-listener-merging.md)
- Explicit attributes overwritten by fallthrough values → See [fallthrough-attrs-overwrite-vue3](reference/fallthrough-attrs-overwrite-vue3.md)
- Attributes applying to wrong element in wrappers → See [inheritattrs-false-for-wrapper-components](reference/inheritattrs-false-for-wrapper-components.md)

### Composables
- Composable called outside setup context or asynchronously → See [[resource:f62d777c-f670-463a-b95b-b9d15c1a82bc]]
- Composable reactive dependency not updating when input changes → See [[resource:d96de9ef-bf70-4484-b34e-388e1ed6735a]]
- Composable mutates external state unexpectedly → See [[resource:04491fe0-42b3-4c76-b72e-fcee6ddd6b98]]
- Destructuring composable returns breaks reactivity unexpectedly → See [[resource:042810df-0da0-4e14-a251-7e13d487ca02]]

### Composition API
- Lifecycle hooks failing silently after async operations → See [composition-api-script-setup-async-context](reference/composition-api-script-setup-async-context.md)
- Parent component refs unable to access exposed properties → See [[resource:c71e2b89-8d7b-408b-9083-93438f0efca7]]
- Functional-programming patterns break expected Vue reactivity behavior → See [[resource:a10768cc-5f64-4a0b-979a-9367e0d09b44]]
- React Hook mental model causes incorrect Composition API usage → See [composition-api-vs-react-hooks-differences](reference/composition-api-vs-react-hooks-differences.md)

### Animation
- Animations fail to trigger when DOM nodes are reused → See [[resource:bcc2cb24-9114-478a-a004-e7715c08277e]]
- TransitionGroup list updates feel laggy under load → See [animation-transitiongroup-performance](reference/animation-transitiongroup-performance.md)

### TypeScript
- Mutable prop defaults leak state between component instances → See [ts-withdefaults-mutable-factory-function](reference/ts-withdefaults-mutable-factory-function.md)
- reactive() generic typing causes ref unwrapping mismatches → See [ts-reactive-no-generic-argument](reference/ts-reactive-no-generic-argument.md)
- Template refs throw null access errors before mount or after v-if unmount → See [[resource:a4288767-b4a2-4a38-b8ff-d73c033382b7]]
- Optional boolean props behave as false instead of undefined → See [ts-defineprops-boolean-default-false](reference/ts-defineprops-boolean-default-false.md)
- Imported defineProps types fail with unresolvable or complex type references → See [ts-defineprops-imported-types-limitations](reference/ts-defineprops-imported-types-limitations.md)
- Untyped DOM event handlers fail under strict TypeScript settings → See [[resource:d3d70aa3-dfdb-4ea9-bd3e-71fca9fdc913]]
- Dynamic component refs trigger reactive component warnings → See [[resource:e8b93d20-b9d0-44be-9c43-ee7fd3ebae9e]]
- Union-typed template expressions fail type checks without narrowing → See [[resource:99b6c20b-2dbc-49cd-a0c9-a35b48b7dfe9]]

### Async Components
- Route components misconfigured with defineAsyncComponent lazy loading → See [[resource:de7dcdef-352c-422b-965b-04469fce8439]]
- Network failures or timeouts loading components → See [[resource:cf38294e-84aa-4bcb-85d8-b77515955043]]
- Template refs undefined after component reactivation → See [async-component-keepalive-ref-issue](reference/async-component-keepalive-ref-issue.md)

### Render Functions
- Render function output stays static after state changes → See [[resource:c852dd21-8360-4085-aba5-016df6ef711d]]
- Reused vnode instances render incorrectly → See [[resource:a757ef10-0cf6-498c-a0e4-0b54d3242510]]
- String component names render as HTML elements → See [rendering-resolve-component-for-string-names](reference/rendering-resolve-component-for-string-names.md)
- Accessing vnode internals breaks on Vue updates → See [[resource:f296453f-bfff-4d6e-b59a-3d27fe9262f7]]
- Vue 2 render function patterns crash in Vue 3 → See [[resource:c4c013db-f4c7-48ff-868b-dc3056e52efd]]
- Slot content not rendering from h() → See [rendering-render-function-slots-as-functions](reference/rendering-render-function-slots-as-functions.md)

### KeepAlive
- Child components mount twice with nested Vue Router routes → See [keepalive-router-nested-double-mount](reference/keepalive-router-nested-double-mount.md)
- Memory grows when combining KeepAlive with Transition animations → See [keepalive-transition-memory-leak](reference/keepalive-transition-memory-leak.md)

### Transitions
- JavaScript transition hooks hang without done callback → See [[resource:0086a0b5-68be-4374-a7e8-2d642ab8400e]]
- Move animations fail on inline list elements → See [transition-group-flip-inline-elements](reference/transition-group-flip-inline-elements.md)
- List items jump instead of smoothly animating → See [[resource:bac8489a-a6c1-4501-a000-43f09da09630]]
- Vue 2 to Vue 3 TransitionGroup wrapper changes break layout → See [[resource:fd38608b-eb60-48e2-91d1-f20ade2eb9ba]]
- Nested transitions cut off before finishing → See [[resource:9c658a60-dce0-432b-871d-3e51d768a1f9]]
- Scoped styles stop working in reusable transition wrappers → See [transition-reusable-scoped-style](reference/transition-reusable-scoped-style.md)
- RouterView transitions animate unexpectedly on first render → See [transition-router-view-appear](reference/transition-router-view-appear.md)
- Mixing CSS transitions and animations causes timing issues → See [transition-type-when-mixed](reference/transition-type-when-mixed.md)
- Cleanup hooks missed during rapid transition swaps → See [[resource:ba81fc9b-22b3-491c-8b7d-9dd376851a63]]

### Teleport
- Teleport target element not found in DOM → See [teleport-target-must-exist](reference/teleport-target-must-exist.md)
- Teleported content breaks SSR hydration → See [[resource:bfe8c651-710d-49ba-ab05-a697e23083eb]]
- Scoped styles not applying to teleported content → See [[resource:be5c3192-eda8-4994-a776-0c92837d2faa]]

### Suspense
- Need to handle async errors from Suspense components → See [suspense-no-builtin-error-handling](reference/suspense-no-builtin-error-handling.md)
- Using Suspense with server-side rendering → See [suspense-ssr-hydration-issues](reference/suspense-ssr-hydration-issues.md)
- Async component loading/error UI ignored under Suspense → See [[resource:d35faa7d-59c4-405c-b81c-8767267e3cf5]]

### SSR
- HTML differs between server and client renders → See [[resource:efde7d21-6098-49c5-8287-e48e4fff7485]]
- User state leaks between requests from shared singleton stores → See [state-ssr-cross-request-pollution](reference/state-ssr-cross-request-pollution.md)
- Browser-only APIs crash server rendering in universal code paths → See [[resource:a36ef07c-7b34-45b4-8b3a-c0692617e539]]

### Performance
- List children re-render unnecessarily because parent passes unstable props → See [[resource:e9654589-e93e-44e3-8f5a-3d2d5d0f0ba9]]
- Computed objects retrigger effects despite equivalent values → See [perf-computed-object-stability](reference/perf-computed-object-stability.md)

### SFC (Single File Components)
- Trying to use named exports from component script blocks → See [sfc-named-exports-forbidden](reference/sfc-named-exports-forbidden.md)
- Variables not updating in template after changes → See [[resource:a65c4aed-ee05-483a-876e-91a12db5fe5a]]
- Scoped styles not applying to child component elements → See [sfc-scoped-css-child-component-styling](reference/sfc-scoped-css-child-component-styling.md)
- Scoped styles not applying to dynamic v-html content → See [[resource:fb4b1ebc-9ef5-4df0-ab86-a17a83265fe1]]
- Scoped styles not applying to slot content → See [sfc-scoped-css-slot-content](reference/sfc-scoped-css-slot-content.md)
- Tailwind classes missing when built dynamically → See [tailwind-dynamic-class-generation](reference/tailwind-dynamic-class-generation.md)
- Recursive components not rendering due to name conflicts → See [[resource:084218da-abd4-49ea-9a35-c89eafe073d4]]

### Plugins
- Debugging why global properties cause naming conflicts → See [[resource:c169108f-4d03-4e43-8da0-aab9135108fd]]
- Plugin not working or inject returns undefined → See [[resource:aa6a5d2c-f083-43b4-a644-2d2a42a6cbd7]]
- Plugin global properties are unavailable in setup-based components → See [[resource:a2d75d32-23d1-4a26-ac7c-4a4d12edd8f5]]
- Plugin type augmentation mistakes break ComponentCustomProperties typing → See [plugin-typescript-type-augmentation](reference/plugin-typescript-type-augmentation.md)

### App Configuration
- App configuration methods not working after mount call → See [configure-app-before-mount](reference/configure-app-before-mount.md)
- Chaining app config off mount() fails because mount returns component instance → See [mount-return-value](reference/mount-return-value.md)
- require.context-based component auto-registration fails in Vite → See [dynamic-component-registration-vite](reference/dynamic-component-registration-vite.md)
