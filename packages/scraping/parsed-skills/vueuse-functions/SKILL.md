---
name: vueuse-functions
description: Apply VueUse composables where appropriate to build concise, maintainable Vue.js / Nuxt features.
license: MIT
metadata:
    author: SerKo <https://github.com/serkodev>
    version: "1.1"
compatibility: Requires Vue 3 (or above) or Nuxt 3 (or above) project


# VueUse Functions

This skill is a decision-and-implementation guide for VueUse composables in Vue.js / Nuxt projects. It maps requirements to the most suitable VueUse function, applies the correct usage pattern, and prefers composable-based solutions over bespoke code to keep implementations concise, maintainable, and performant.

## When to Apply

- Apply this skill whenever assisting user development work in Vue.js / Nuxt.
- Always check first whether a VueUse function can implement the requirement.
- Prefer VueUse composables over custom code to improve readability, maintainability, and performance.
- Map requirements to the most appropriate VueUse function and follow the function’s invocation rule.
- Please refer to the `Invocation` field in the below functions table. For example:
  - `AUTO`: Use automatically when applicable.
  - `EXTERNAL`: Use only if the user already installed the required external dependency; otherwise reconsider, and ask to install only if truly needed.
  - `EXPLICIT_ONLY`: Use only when explicitly requested by the user.
  > *NOTE* User instructions in the prompt or `AGENTS.md` may override a function’s default `Invocation` rule.

## Functions

All functions listed below are part of the [VueUse](https://vueuse.org/) library, each section categorizes functions based on their functionality.

IMPORTANT: Each function entry includes a short `Description` and a detailed `Reference`. When using any function, always consult the corresponding document in `./references` for Usage details and Type Declarations.

### State

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createGlobalState`](references/createGlobalState.md) | Keep states in the global scope to be reusable across Vue instances | AUTO |
| [`createInjectionState`](references/createInjectionState.md) | Create global state that can be injected into components | AUTO |
| [[resource:f67de419-d798-47fd-bb26-27140b836959]] | Make a composable function usable with multiple Vue instances | AUTO |
| [[resource:e4b89591-c481-4fae-9313-00fc2ea0909b]] | Extended `inject` with ability to call `provideLocal` to provide the value in the same component | AUTO |
| [`provideLocal`](references/provideLocal.md) | Extended `provide` with ability to call `injectLocal` to obtain the value in the same component | AUTO |
| [[resource:f5613ee4-0d41-4c1e-8291-d7bc9b786c42]] | Reactive async state | AUTO |
| [`useDebouncedRefHistory`](references/useDebouncedRefHistory.md) | Shorthand for `useRefHistory` with debounced filter | AUTO |
| [`useLastChanged`](references/useLastChanged.md) | Records the timestamp of the last change | AUTO |
| [`useLocalStorage`](references/useLocalStorage.md) | Reactive [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | AUTO |
| [[resource:d22d06f6-d53e-4909-bbff-4d1d275be744]] | Manually track the change history of a ref when the using calls `commit()` | AUTO |
| [`useRefHistory`](references/useRefHistory.md) | Track the change history of a ref | AUTO |
| [[resource:c94ae144-1379-4150-8056-259b1342090f]] | Reactive [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [[resource:9ac58bbc-5002-40fc-b8aa-1ce6596cc434]] | Create a reactive ref that can be used to access & modify [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [[resource:c40e3931-6da3-4421-8bbe-b5dabc84ccb3]] | Reactive Storage in with async support | AUTO |
| [[resource:fcb62a56-0d9d-42a7-88f7-c598f84be824]] | Shorthand for `useRefHistory` with throttled filter | AUTO |

### Elements

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useActiveElement`](references/useActiveElement.md) | Reactive `document.activeElement` | AUTO |
| [`useDocumentVisibility`](references/useDocumentVisibility.md) | Reactively track [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState) | AUTO |
| [[resource:f476a0a4-4896-4e41-b36d-3b7ce4cc0bb6]] | Make elements draggable | AUTO |
| [[resource:04bb1f3e-6177-4d38-bba0-6e3471ab7012]] | Create a zone where files can be dropped | AUTO |
| [`useElementBounding`](references/useElementBounding.md) | Reactive [bounding box](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) of an HTML element | AUTO |
| [`useElementSize`](references/useElementSize.md) | Reactive size of an HTML element | AUTO |
| [`useElementVisibility`](references/useElementVisibility.md) | Tracks the visibility of an element within the viewport | AUTO |
| [[resource:d7736973-d0f0-4c9d-a3a2-7a447568f511]] | Detects that a target element's visibility | AUTO |
| [`useMouseInElement`](references/useMouseInElement.md) | Reactive mouse position related to an element | AUTO |
| [[resource:aee21b3d-7a3a-4a54-95e6-cdacf0063f70]] | Watch for changes being made to the DOM tree | AUTO |
| [[resource:db79f55f-4d85-42f8-879a-c312d32e0b54]] | Get parent element of the given element | AUTO |
| [[resource:ebe10e21-f890-4244-ab1a-9c8c329337b9]] | Reports changes to the dimensions of an Element's content or the border-box | AUTO |
| [`useWindowFocus`](references/useWindowFocus.md) | Reactively track window focus with `window.onfocus` and `window.onblur` events | AUTO |
| [`useWindowScroll`](references/useWindowScroll.md) | Reactive window scroll | AUTO |
| [`useWindowSize`](references/useWindowSize.md) | Reactive window size | AUTO |

### Browser

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useBluetooth`](references/useBluetooth.md) | Reactive [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) | AUTO |
| [[resource:ab86f389-ac84-4cd0-87dc-5961ee821353]] | Reactive viewport breakpoints | AUTO |
| [`useBroadcastChannel`](references/useBroadcastChannel.md) | Reactive [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) | AUTO |
| [[resource:d0ba02e8-7d70-4527-8c0c-f4559e3f8934]] | Reactive browser location | AUTO |
| [`useClipboard`](references/useClipboard.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useClipboardItems`](references/useClipboardItems.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useColorMode`](references/useColorMode.md) | Reactive color mode (dark / light / customs) with auto data persistence | AUTO |
| [[resource:fc7a3354-95fb-4a14-acbf-b359330748f6]] | Manipulate CSS variables | AUTO |
| [[resource:ce3e03dc-42c4-4b06-88b3-61c80195c8ce]] | Reactive dark mode with auto data persistence | AUTO |
| [[resource:f042edd6-35f0-4ca5-a39e-c3012e6cf7b1]] | Use EventListener with ease | AUTO |
| [`useEyeDropper`](references/useEyeDropper.md) | Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) | AUTO |
| [`useFavicon`](references/useFavicon.md) | Reactive favicon | AUTO |
| [`useFileDialog`](references/useFileDialog.md) | Open file dialog with ease | AUTO |
| [`useFileSystemAccess`](references/useFileSystemAccess.md) | Create and read and write local files with [FileSystemAccessAPI](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) | AUTO |
| [`useFullscreen`](references/useFullscreen.md) | Reactive [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) | AUTO |
| [`useGamepad`](references/useGamepad.md) | Provides reactive bindings for the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) | AUTO |
| [[resource:d956f64d-80c0-4af4-8c6f-3bc2c8b96ce1]] | Reactive load an image in the browser | AUTO |
| [`useMediaControls`](references/useMediaControls.md) | Reactive media controls for both `audio` and `video` elements | AUTO |
| [`useMediaQuery`](references/useMediaQuery.md) | Reactive [Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries) | AUTO |
| [`useMemory`](references/useMemory.md) | Reactive Memory Info | AUTO |
| [`useObjectUrl`](references/useObjectUrl.md) | Reactive URL representing an object | AUTO |
| [[resource:c0adcb10-3b98-44a4-92d1-74997e5532d4]] | Observe performance metrics | AUTO |
| [[resource:f9124332-07cf-486e-9a02-d37886b77621]] | Reactive [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) | AUTO |
| [`usePreferredColorScheme`](references/usePreferredColorScheme.md) | Reactive [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query | AUTO |
| [[resource:a152cbf6-622c-4a05-8d08-3e05d8bc7a37]] | Reactive [prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) media query | AUTO |
| [`usePreferredDark`](references/usePreferredDark.md) | Reactive dark theme preference | AUTO |
| [[resource:c026acc8-7703-4d23-8755-834f553d399e]] | Reactive [Navigator Languages](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/languages) | AUTO |
| [[resource:e48ef70d-21c2-4a17-8ef0-6414be9160fd]] | Reactive [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query | AUTO |
| [`usePreferredReducedTransparency`](references/usePreferredReducedTransparency.md) | Reactive [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) media query | AUTO |
| [[resource:fdd957dc-009c-4939-a701-3fe3fc467a6c]] | Reactive [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API) | AUTO |
| [[resource:037b6aea-8532-408b-88a0-790bc93c704d]] | Reactive `env(safe-area-inset-*)` | AUTO |
| [[resource:db06e90f-4272-4fe7-a0af-6b3b5200eaf8]] | Creates a script tag | AUTO |
| [`useShare`](references/useShare.md) | Reactive [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) | AUTO |
| [`useSSRWidth`](references/useSSRWidth.md) | Used to set a global viewport width which will be used when rendering SSR components that rely on the viewport width like [`useMediaQuery`](../useMediaQuery/index.md) or [`useBreakpoints`](../useBreakpoints/index.md) | AUTO |
| [`useStyleTag`](references/useStyleTag.md) | Inject reactive `style` element in head | AUTO |
| [[resource:0735a400-3d7d-4411-8691-29fbf64b3b41]] | Automatically update the height of a textarea depending on the content | AUTO |
| [`useTextDirection`](references/useTextDirection.md) | Reactive [dir](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) of the element's text | AUTO |
| [[resource:e38ee9b5-7e52-4993-b554-75290c3450bd]] | Reactive document title | AUTO |
| [`useUrlSearchParams`](references/useUrlSearchParams.md) | Reactive [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) | AUTO |
| [[resource:d789d33b-8abc-4e9a-bca0-f1a886e9a66f]] | Reactive [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) | AUTO |
| [[resource:92b8beda-dbcc-4a8e-a7e7-61e51056fb8e]] | Reactive [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) | AUTO |
| [[resource:c1d18252-7b04-42b5-b845-d64d613f1c09]] | Reactive [Notification](https://developer.mozilla.org/en-US/docs/Web/API/notification) | AUTO |
| [[resource:fbbf7349-ede8-4447-9138-34dae3eff741]] | Simple [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) registration and communication | AUTO |
| [[resource:928f8c79-a8e9-466f-ba0e-a021e06ac75a]] | Run expensive functions without blocking the UI | AUTO |

### Sensors

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:c41ee7a5-b028-45c8-ab2a-7f82dcfb64b6]] | Listen for clicks outside of an element | AUTO |
| [`onElementRemoval`](references/onElementRemoval.md) | Fires when the element or any element containing it is removed | AUTO |
| [`onKeyStroke`](references/onKeyStroke.md) | Listen for keyboard keystrokes | AUTO |
| [[resource:b7979b45-78fa-423d-8c53-0ac534595d48]] | Listen for a long press on an element | AUTO |
| [[resource:f2507dae-c36b-4f6c-b12b-7782ca5c805c]] | Fires when users start typing on non-editable elements | AUTO |
| [`useBattery`](references/useBattery.md) | Reactive [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API) | AUTO |
| [[resource:a7e3267d-19ba-417e-a954-59f8c64b1662]] | Reactive [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent) | AUTO |
| [`useDeviceOrientation`](references/useDeviceOrientation.md) | Reactive [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent) | AUTO |
| [`useDevicePixelRatio`](references/useDevicePixelRatio.md) | Reactively track [`window.devicePixelRatio`](https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio) | AUTO |
| [`useDevicesList`](references/useDevicesList.md) | Reactive [enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) listing available input/output devices | AUTO |
| [[resource:e3ae3fbf-9a2a-4490-9a9b-b4da4d3e9952]] | Reactive [`mediaDevices.getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) streaming | AUTO |
| [`useElementByPoint`](references/useElementByPoint.md) | Reactive element by point | AUTO |
| [[resource:c23bc287-f423-4180-9b21-a0bc67550243]] | Reactive element's hover state | AUTO |
| [[resource:cbe8105a-9799-41c1-9ec3-b0930b54ef1b]] | Reactive utility to track or set the focus state of a DOM element | AUTO |
| [`useFocusWithin`](references/useFocusWithin.md) | Reactive utility to track if an element or one of its decendants has focus | AUTO |
| [`useFps`](references/useFps.md) | Reactive FPS (frames per second) | AUTO |
| [`useGeolocation`](references/useGeolocation.md) | Reactive [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | AUTO |
| [`useIdle`](references/useIdle.md) | Tracks whether the user is being inactive | AUTO |
| [`useInfiniteScroll`](references/useInfiniteScroll.md) | Infinite scrolling of the element | AUTO |
| [`useKeyModifier`](references/useKeyModifier.md) | Reactive [Modifier State](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState) | AUTO |
| [`useMagicKeys`](references/useMagicKeys.md) | Reactive keys pressed state | AUTO |
| [[resource:af896071-e711-4e9f-8cb3-dea6991afed3]] | Reactive mouse position | AUTO |
| [`useMousePressed`](references/useMousePressed.md) | Reactive mouse pressing state | AUTO |
| [[resource:a10ee097-d40a-4f6e-9ca4-d1783380493c]] | Reactive [navigator.language](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language) | AUTO |
| [[resource:cd0ea1de-5085-41c4-a103-a8e1fe643f49]] | Reactive [Network status](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API) | AUTO |
| [[resource:08af8d99-5644-41aa-b2ea-eac7d7973b60]] | Reactive online state | AUTO |
| [[resource:b5ef7397-eba2-4dc5-8cec-0f50ea298a28]] | Reactive state to show whether the mouse leaves the page | AUTO |
| [[resource:d60e90b8-8d65-41d5-832f-3444b56fb0b9]] | Create parallax effect easily | AUTO |
| [[resource:bfcb9dfb-ae5a-4033-82f7-0f9ab35856d6]] | Reactive [pointer state](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | AUTO |
| [`usePointerLock`](references/usePointerLock.md) | Reactive [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) | AUTO |
| [[resource:ba863424-f686-4e4b-83e6-a2786ff22546]] | Reactive swipe detection based on [PointerEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent) | AUTO |
| [[resource:dbcd698f-996d-41a4-a633-9b45a180ec57]] | Reactive scroll position and state | AUTO |
| [`useScrollLock`](references/useScrollLock.md) | Lock scrolling of the element | AUTO |
| [[resource:0520b42d-ee7d-4443-ab2b-52964eef07f1]] | Reactive [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) | AUTO |
| [`useSpeechSynthesis`](references/useSpeechSynthesis.md) | Reactive [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) | AUTO |
| [`useSwipe`](references/useSwipe.md) | Reactive swipe detection based on [`TouchEvents`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent) | AUTO |
| [`useTextSelection`](references/useTextSelection.md) | Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection) | AUTO |
| [`useUserMedia`](references/useUserMedia.md) | Reactive [`mediaDevices.getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) streaming | AUTO |

### Network

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useEventSource`](references/useEventSource.md) | An [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) or [Server-Sent-Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) instance opens a persistent connection to an HTTP server | AUTO |
| [`useFetch`](references/useFetch.md) | Reactive [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) provides the ability to abort requests | AUTO |
| [[resource:fae664d1-dfae-4333-8867-2f385430309d]] | Reactive [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) client | AUTO |

### Animation

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAnimate`](references/useAnimate.md) | Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | AUTO |
| [`useInterval`](references/useInterval.md) | Reactive counter increases on every interval | AUTO |
| [`useIntervalFn`](references/useIntervalFn.md) | Wrapper for `setInterval` with controls | AUTO |
| [`useNow`](references/useNow.md) | Reactive current Date instance | AUTO |
| [`useRafFn`](references/useRafFn.md) | Call function on every `requestAnimationFrame` | AUTO |
| [[resource:93b71ba7-9164-46df-bfd7-b864a2195fbe]] | Update value after a given time with controls | AUTO |
| [`useTimeoutFn`](references/useTimeoutFn.md) | Wrapper for `setTimeout` with controls | AUTO |
| [[resource:a233214d-9188-4f39-a7ad-262b8cb6d1b1]] | Reactive current timestamp | AUTO |
| [`useTransition`](references/useTransition.md) | Transition between values | AUTO |

### Component

| Function | Description | Invocation |
|----------|-------------|------------|
| [`computedInject`](references/computedInject.md) | Combine computed and inject | AUTO |
| [[resource:935ae126-3030-40f9-8d4a-6ed731db2835]] | Define and reuse template inside the component scope | AUTO |
| [`createTemplatePromise`](references/createTemplatePromise.md) | Template as Promise | AUTO |
| [`templateRef`](references/templateRef.md) | Shorthand for binding ref to template element | AUTO |
| [`tryOnBeforeMount`](references/tryOnBeforeMount.md) | Safe `onBeforeMount` | AUTO |
| [`tryOnBeforeUnmount`](references/tryOnBeforeUnmount.md) | Safe `onBeforeUnmount` | AUTO |
| [`tryOnMounted`](references/tryOnMounted.md) | Safe `onMounted` | AUTO |
| [[resource:b6ae8805-d3d5-48d9-b81b-679aaba4f34c]] | Safe `onScopeDispose` | AUTO |
| [[resource:c8f561ce-0e6c-41db-960b-cf1fbee3c561]] | Safe `onUnmounted` | AUTO |
| [`unrefElement`](references/unrefElement.md) | Retrieves the underlying DOM element from a Vue ref or component instance | AUTO |
| [[resource:db80983d-e962-43bd-85fb-7b8accbb9ff5]] | Get the DOM element of current component as a ref | AUTO |
| [[resource:01dd63fb-21bc-418e-aefa-9a2c961d9256]] | Mounted state in ref | AUTO |
| [[resource:ff6818e5-f68d-444e-8ec0-de7aff14a184]] | Shorthand for binding refs to template elements and components inside `v-for` | AUTO |
| [`useVirtualList`](references/useVirtualList.md) | Create virtual lists with ease | AUTO |
| [`useVModel`](references/useVModel.md) | Shorthand for v-model binding | AUTO |
| [`useVModels`](references/useVModels.md) | Shorthand for props v-model binding | AUTO |

### Watch

| Function | Description | Invocation |
|----------|-------------|------------|
| [`until`](references/until.md) | Promised one-time watch for changes | AUTO |
| [`watchArray`](references/watchArray.md) | Watch for an array with additions and removals | AUTO |
| [[resource:d9e07c76-fd82-45ec-9495-3e5b6d394b2b]] | `watch` with the number of times triggered | AUTO |
| [`watchDebounced`](references/watchDebounced.md) | Debounced watch | AUTO |
| [`watchDeep`](references/watchDeep.md) | Shorthand for watching value with `{deep: true}` | AUTO |
| [`watchIgnorable`](references/watchIgnorable.md) | Ignorable watch | AUTO |
| [[resource:c4c397e8-2022-4733-b9f8-9a841b2eee1b]] | Shorthand for watching value with `{immediate: true}` | AUTO |
| [`watchOnce`](references/watchOnce.md) | Shorthand for watching value with `{ once: true }` | AUTO |
| [[resource:efa5d144-401f-486d-88f9-0fcf550c145a]] | Pausable watch | AUTO |
| [[resource:ddb6d311-3790-48c3-bd87-eab388a4505e]] | Throttled watch | AUTO |
| [`watchTriggerable`](references/watchTriggerable.md) | Watch that can be triggered manually | AUTO |
| [`watchWithFilter`](references/watchWithFilter.md) | `watch` with additional EventFilter control | AUTO |
| [[resource:db829b08-0485-4378-a407-863eca4dd599]] | Shorthand for watching value to be truthy | AUTO |

### Reactivity

| Function | Description | Invocation |
|----------|-------------|------------|
| [`computedAsync`](references/computedAsync.md) | Computed for async functions | AUTO |
| [`computedEager`](references/computedEager.md) | Eager computed without lazy evaluation | AUTO |
| [`computedWithControl`](references/computedWithControl.md) | Explicitly define the dependencies of computed | AUTO |
| [[resource:95f228a6-fca1-43b6-8dc4-61245421be62]] | Returns a `deepRef` or `shallowRef` depending on the `deep` param | AUTO |
| [[resource:9d1f3ab3-f57f-4127-8261-7297cf2befdf]] | Add extra attributes to Ref | AUTO |
| [`reactify`](references/reactify.md) | Converts plain functions into reactive functions | AUTO |
| [`reactifyObject`](references/reactifyObject.md) | Apply `reactify` to an object | AUTO |
| [`reactiveComputed`](references/reactiveComputed.md) | Computed reactive object | AUTO |
| [[resource:e1e3cda9-3814-4dad-96af-94a926b6e2d8]] | Reactively omit fields from a reactive object | AUTO |
| [`reactivePick`](references/reactivePick.md) | Reactively pick fields from a reactive object | AUTO |
| [`refAutoReset`](references/refAutoReset.md) | A ref which will be reset to the default value after some time | AUTO |
| [[resource:08e97dd9-28d7-4534-abcf-602e3fdfd81b]] | Debounce execution of a ref value | AUTO |
| [[resource:e03d059a-7d76-4932-b2a3-f536f82b48a7]] | Apply default value to a ref | AUTO |
| [[resource:db2bf195-3875-4dfe-b1f6-18a16d734ec0]] | Create a ref with manual reset functionality | AUTO |
| [[resource:9e1cd301-6a66-4654-a3f4-da6ffecd2def]] | Throttle changing of a ref value | AUTO |
| [`refWithControl`](references/refWithControl.md) | Fine-grained controls over ref and its reactivity | AUTO |
| [`syncRef`](references/syncRef.md) | Two-way refs synchronization | AUTO |
| [`syncRefs`](references/syncRefs.md) | Keep target refs in sync with a source ref | AUTO |
| [[resource:0404bbfa-aecd-453a-8ac3-a07ce0bfa804]] | Converts ref to reactive | AUTO |
| [`toRef`](references/toRef.md) | Normalize value/ref/getter to `ref` or `computed` | EXPLICIT_ONLY |
| [[resource:bb19ecea-41ac-44ab-87bd-9d4509df2716]] | Extended [`toRefs`](https://vuejs.org/api/reactivity-utilities.html#torefs) that also accepts refs of an object | AUTO |

### Array

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:e583c90e-1226-4f33-aeb9-8e06f420f99a]] | Reactive get array difference of two arrays | AUTO |
| [[resource:eef6582f-2053-48fd-870e-b2961825976d]] | Reactive `Array.every` | AUTO |
| [`useArrayFilter`](references/useArrayFilter.md) | Reactive `Array.filter` | AUTO |
| [`useArrayFind`](references/useArrayFind.md) | Reactive `Array.find` | AUTO |
| [`useArrayFindIndex`](references/useArrayFindIndex.md) | Reactive `Array.findIndex` | AUTO |
| [[resource:a3997c7e-7baa-41ce-abd9-f5d27dd7929b]] | Reactive `Array.findLast` | AUTO |
| [[resource:b0e41cb2-8c54-4be1-bc1a-47b534654c16]] | Reactive `Array.includes` | AUTO |
| [`useArrayJoin`](references/useArrayJoin.md) | Reactive `Array.join` | AUTO |
| [`useArrayMap`](references/useArrayMap.md) | Reactive `Array.map` | AUTO |
| [`useArrayReduce`](references/useArrayReduce.md) | Reactive `Array.reduce` | AUTO |
| [`useArraySome`](references/useArraySome.md) | Reactive `Array.some` | AUTO |
| [[resource:00176012-d866-4486-a13b-dc4232f4d126]] | Reactive unique array | AUTO |
| [`useSorted`](references/useSorted.md) | Reactive sort array | AUTO |

### Time

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:b985a247-445f-443c-bd2e-3c804d2c8c9f]] | Wrapper for `useIntervalFn` that provides a countdown timer | AUTO |
| [`useDateFormat`](references/useDateFormat.md) | Get the formatted date according to the string of tokens passed in | AUTO |
| [`useTimeAgo`](references/useTimeAgo.md) | Reactive time ago | AUTO |
| [[resource:ca34d291-7532-4fb6-ac44-8901fa8327e5]] | Reactive time ago with i18n supported | AUTO |

### Utilities

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:ed6f8d41-2e70-48ce-ac58-259842ea568c]] | Utility for creating event hooks | AUTO |
| [[resource:9d28a498-0cda-4001-9775-84691b973362]] | Make a plain function accepting ref and raw values as arguments | AUTO |
| [`get`](references/get.md) | Shorthand for accessing `ref.value` | EXPLICIT_ONLY |
| [`isDefined`](references/isDefined.md) | Non-nullish checking type guard for Ref | AUTO |
| [`makeDestructurable`](references/makeDestructurable.md) | Make isomorphic destructurable for object and array at the same time | AUTO |
| [[resource:ce93314f-2dd9-4123-a3b2-451239185c01]] | Shorthand for `ref.value = x` | EXPLICIT_ONLY |
| [`useAsyncQueue`](references/useAsyncQueue.md) | Executes each asynchronous task sequentially and passes the current task result to the next task | AUTO |
| [[resource:9eabc336-a303-4671-84f9-4ac75f02e821]] | Reactive base64 transforming | AUTO |
| [`useCached`](references/useCached.md) | Cache a ref with a custom comparator | AUTO |
| [[resource:e71f5a56-692f-456d-bd56-320fec991672]] | Reactive clone of a ref | AUTO |
| [`useConfirmDialog`](references/useConfirmDialog.md) | Creates event hooks to support modals and confirmation dialog chains | AUTO |
| [`useCounter`](references/useCounter.md) | Basic counter with utility functions | AUTO |
| [[resource:0400d38a-defb-406f-9f25-e38ccc47682b]] | Cycle through a list of items | AUTO |
| [`useDebounceFn`](references/useDebounceFn.md) | Debounce execution of a function | AUTO |
| [[resource:ec4d7dd0-ebe2-464c-b8f3-91f803fc01aa]] | A basic event bus | AUTO |
| [`useMemoize`](references/useMemoize.md) | Cache results of functions depending on arguments and keep it reactive | AUTO |
| [`useOffsetPagination`](references/useOffsetPagination.md) | Reactive offset pagination | AUTO |
| [`usePrevious`](references/usePrevious.md) | Holds the previous value of a ref | AUTO |
| [`useStepper`](references/useStepper.md) | Provides helpers for building a multi-step wizard interface | AUTO |
| [[resource:f37a8fda-596e-4f4e-820f-4c658a6c9a66]] | SSR compatibility `isSupported` | AUTO |
| [[resource:f41622d5-64b1-4d1a-a2c5-f5bbacc29ef4]] | Throttle execution of a function | AUTO |
| [`useTimeoutPoll`](references/useTimeoutPoll.md) | Use timeout to poll something | AUTO |
| [[resource:064ca267-a379-4642-a29a-fdac20ae67dd]] | A boolean switcher with utility functions | AUTO |
| [`useToNumber`](references/useToNumber.md) | Reactively convert a string ref to number | AUTO |
| [`useToString`](references/useToString.md) | Reactively convert a ref to string | AUTO |

### @Electron

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:9c68bde4-cc16-4bd5-858f-e96f4aae9ded]] | Provides [ipcRenderer](https://www.electronjs.org/docs/api/ipc-renderer) and all of its APIs | EXTERNAL |
| [`useIpcRendererInvoke`](references/useIpcRendererInvoke.md) | Reactive [ipcRenderer.invoke API](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args) result | EXTERNAL |
| [[resource:05b03988-ede3-448c-b438-6225965ba6dc]] | Use [ipcRenderer.on](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener) with ease and [ipcRenderer.removeListener](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener) automatically on unmounted | EXTERNAL |
| [[resource:b23b51bc-0fa4-4ba3-a584-7c530427b32f]] | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom factor | EXTERNAL |
| [`useZoomLevel`](references/useZoomLevel.md) | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom level | EXTERNAL |

### @Firebase

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:eef9f03d-88b1-474e-b4c1-f30c85c24bec]] | Reactive [Firebase Auth](https://firebase.google.com/docs/auth) binding | EXTERNAL |
| [[resource:9ed1e6f4-a3d2-400d-8750-49a6e562ca91]] | Reactive [Firestore](https://firebase.google.com/docs/firestore) binding | EXTERNAL |
| [`useRTDB`](references/useRTDB.md) | Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database) binding | EXTERNAL |

### @Head

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createHead`](https://github.com/vueuse/head#api) | Create the head manager instance. | EXTERNAL |
| [`useHead`](https://github.com/vueuse/head#api) | Update head meta tags reactively. | EXTERNAL |

### @Integrations

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:d77aa39c-a1b7-4735-a3f7-f78dea1a874e]] | Wrapper for [`async-validator`](https://github.com/yiminghe/async-validator) | EXTERNAL |
| [`useAxios`](references/useAxios.md) | Wrapper for [`axios`](https://github.com/axios/axios) | EXTERNAL |
| [[resource:c5ce1df3-223d-486e-a028-561c6c245a92]] | Reactive wrapper for [`change-case`](https://github.com/blakeembrey/change-case) | EXTERNAL |
| [`useCookies`](references/useCookies.md) | Wrapper for [`universal-cookie`](https://www.npmjs.com/package/universal-cookie) | EXTERNAL |
| [[resource:c1b21cca-3307-447f-a842-dec3a26801c1]] | Reactive instance for [drauu](https://github.com/antfu/drauu) | EXTERNAL |
| [`useFocusTrap`](references/useFocusTrap.md) | Reactive wrapper for [`focus-trap`](https://github.com/focus-trap/focus-trap) | EXTERNAL |
| [`useFuse`](references/useFuse.md) | Easily implement fuzzy search using a composable with [Fuse.js](https://github.com/krisk/fuse) | EXTERNAL |
| [[resource:ee4fde3e-f8d8-47a0-bd46-fbff2640d0ef]] | Wrapper for [`idb-keyval`](https://www.npmjs.com/package/idb-keyval) | EXTERNAL |
| [`useJwt`](references/useJwt.md) | Wrapper for [`jwt-decode`](https://github.com/auth0/jwt-decode) | EXTERNAL |
| [[resource:d94f7a28-17e8-47ab-9487-eb7787445093]] | Reactive wrapper for [`nprogress`](https://github.com/rstacruz/nprogress) | EXTERNAL |
| [[resource:c47a85a6-8374-4f16-bff8-7d10f93d950f]] | Wrapper for [`qrcode`](https://github.com/soldair/node-qrcode) | EXTERNAL |
| [`useSortable`](references/useSortable.md) | Wrapper for [`sortable`](https://github.com/SortableJS/Sortable) | EXTERNAL |

### @Math

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:97f57d9a-257a-483a-9a48-838c966d12ce]] | Generic version of `createProjection` | EXTERNAL |
| [[resource:d54a7416-1222-46a3-ba54-8e553affaa63]] | Reactive numeric projection from one domain to another | EXTERNAL |
| [`logicAnd`](references/logicAnd.md) | `AND` condition for refs | EXTERNAL |
| [`logicNot`](references/logicNot.md) | `NOT` condition for ref | EXTERNAL |
| [[resource:dc3dc8ec-78e3-4050-9a52-d207ef7acb21]] | `OR` conditions for refs | EXTERNAL |
| [`useAbs`](references/useAbs.md) | Reactive `Math.abs` | EXTERNAL |
| [`useAverage`](references/useAverage.md) | Get the average of an array reactively | EXTERNAL |
| [`useCeil`](references/useCeil.md) | Reactive `Math.ceil` | EXTERNAL |
| [`useClamp`](references/useClamp.md) | Reactively clamp a value between two other values | EXTERNAL |
| [`useFloor`](references/useFloor.md) | Reactive `Math.floor` | EXTERNAL |
| [`useMath`](references/useMath.md) | Reactive `Math` methods | EXTERNAL |
| [`useMax`](references/useMax.md) | Reactive `Math.max` | EXTERNAL |
| [`useMin`](references/useMin.md) | Reactive `Math.min` | EXTERNAL |
| [`usePrecision`](references/usePrecision.md) | Reactively set the precision of a number | EXTERNAL |
| [[resource:082173c3-c60e-4b34-a245-d8317bfd764a]] | Reactive numeric projection from one domain to another | EXTERNAL |
| [[resource:bbadaf3d-e143-4257-9a5a-83d9c6d8f9b9]] | Reactive `Math.round` | EXTERNAL |
| [`useSum`](references/useSum.md) | Get the sum of an array reactively | EXTERNAL |
| [`useTrunc`](references/useTrunc.md) | Reactive `Math.trunc` | EXTERNAL |

### @Motion

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useElementStyle`](https://motion.vueuse.org/api/use-element-style) | Sync a reactive object to a target element CSS styling | EXTERNAL |
| [`useElementTransform`](https://motion.vueuse.org/api/use-element-transform) | Sync a reactive object to a target element CSS transform. | EXTERNAL |
| [`useMotion`](https://motion.vueuse.org/api/use-motion) | Putting your components in motion. | EXTERNAL |
| [`useMotionProperties`](https://motion.vueuse.org/api/use-motion-properties) | Access Motion Properties for a target element. | EXTERNAL |
| [`useMotionVariants`](https://motion.vueuse.org/api/use-motion-variants) | Handle the Variants state and selection. | EXTERNAL |
| [`useSpring`](https://motion.vueuse.org/api/use-spring) | Spring animations. | EXTERNAL |

### @Router

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useRouteHash`](references/useRouteHash.md) | Shorthand for a reactive `route.hash` | EXTERNAL |
| [`useRouteParams`](references/useRouteParams.md) | Shorthand for a reactive `route.params` | EXTERNAL |
| [`useRouteQuery`](references/useRouteQuery.md) | Shorthand for a reactive `route.query` | EXTERNAL |

### @RxJS

| Function | Description | Invocation |
|----------|-------------|------------|
| [[resource:c566b1ab-332f-49c4-9110-36741ba78c80]] | Wrappers around RxJS's [`from()`](https://rxjs.dev/api/index/function/from) and [`fromEvent()`](https://rxjs.dev/api/index/function/fromEvent) to allow them to accept `ref`s | EXTERNAL |
| [`toObserver`](references/toObserver.md) | Sugar function to convert a `ref` into an RxJS [Observer](https://rxjs.dev/guide/observer) | EXTERNAL |
| [`useExtractedObservable`](references/useExtractedObservable.md) | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more composables | EXTERNAL |
| [[resource:d28e3021-041d-49c7-82a0-b9f10ac89234]] | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) | EXTERNAL |
| [[resource:bf4f8b4e-7930-4369-90e2-e4cfa3302bd7]] | Bind an RxJS [`Subject`](https://rxjs.dev/guide/subject) to a `ref` and propagate value changes both ways | EXTERNAL |
| [`useSubscription`](references/useSubscription.md) | Use an RxJS [`Subscription`](https://rxjs.dev/guide/subscription) without worrying about unsubscribing from it or creating memory leaks | EXTERNAL |
| [[resource:b5ad61d4-b300-4c50-8613-a754037568d0]] | Watch the values of an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more composables | EXTERNAL |

### @SchemaOrg

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createSchemaOrg`](https://vue-schema-org.netlify.app/api/core/create-schema-org.html) | Create the schema.org manager instance. | EXTERNAL |
| [`useSchemaOrg`](https://vue-schema-org.netlify.app/api/core/use-schema-org.html) | Update schema.org reactively. | EXTERNAL |

### @Sound

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useSound`](https://github.com/vueuse/sound#examples) | Play sound effects reactively. | EXTERNAL |


