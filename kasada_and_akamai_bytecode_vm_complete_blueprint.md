# Complete 240-Collector Forensic Blueprint: Kasada KPSDK Bytecode VM (`ips.js` / `cdndex.io`) & Akamai v3 SBSD/CPR (`adidas_ak_s1.js` + `adidas_ak_s2.js`)

> [!IMPORTANT]
> **Total Reverse-Engineered Bytecode VM Collectors Preserved & Adapted: 240 (`120` Kasada KPSDK Collectors + `120` Akamai v3 SBSD/CPR Signals)**
> Every single probe uncovered during the live reverse-engineering of Chewy (`cdndex.io` `ips.js` -> [`chewy_cdndex_decoded.json`](file:///D:/GhostBrowser-Windows-Android/chewy_cdndex_decoded.json)) and Adidas (`adidas_ak_s1.js` + `adidas_ak_s2.js` -> [`adidas_signals_full.json`](file:///C:/Users/Home/.gemini/antigravity-cli/brain/fc7e6f53-45a4-4edf-856f-478ab355506a/scratch/adidas_signals_full.json) & [`adidas_ak_runtime.json`](file:///C:/Users/Home/.gemini/antigravity-cli/brain/fc7e6f53-45a4-4edf-856f-478ab355506a/scratch/adidas_ak_runtime.json)) has been cataloged below and adapted into:
> 1. **Engine Runtime**: [`ghost_engine_core.js`](file:///D:/GhostBrowser-Windows-Android/Resources/Scripts/ghost_engine_core.js), [`anti_fingerprint.js`](file:///C:/Users/Home/Desktop/app/GhostBrowser/Resources/anti_fingerprint.js), and [`EngineAutomationService.cs`](file:///D:/GhostBrowser-Windows-Android/Services/EngineAutomationService.cs)
> 2. **In-House Detection Suite**: [`DetectionSuite/ecomm3.js`](file:///C:/Users/Home/Desktop/app/GhostBrowser/Resources/DetectionSuite/ecomm3.js) (`KasadaBytecodeVmEngine.runAll120Probes()` & `AkamaiSbsdCprEngine.runAll120Probes()`)

---

## Part 1: Kasada KPSDK (`v-j-1.1.29140` / `ips.js` / `cdndex.io`) — Complete 120-Key Bytecode VM Blueprint

When Kasada's `ips.js` executes on Tier-1 targets (**Chewy, Nike/SNKRS, Costco, Foot Locker, Twitch, Steam, Delta Air Lines, Home Depot**), its stack-based bytecode VM (`eval at N (ips.js)`) runs **110 active browser-integrity collectors** plus **10 VM envelope keys** (`120` total keys), encrypts the JSON payload, and `POST`s it to `/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/tl` along with `x-kpsdk-ct` and `x-kpsdk-cd` SHA-256 Proof-of-Work headers.

### 1.1 V8 C++ Reflection, Stack-Limit & Hook-Trap Collectors (The Critical Anti-Hook Core)

| Key | Exact Probe Executed Inside Kasada Bytecode VM | Native Chromium Expected Value | How GhostBrowser Defeats It |
| :--- | :--- | :--- | :--- |
| **`fsc`** | `try { class kekko extends Function.toString {} } catch (e) { return e.stack; }` | `TypeError: Class extends value function toString() { [native code] } is not a constructor or null` | `makeNative(fn, name, length, origNativeFn)` wraps `origNativeFn` in `new _origProxy(origNativeFn, { apply(...) })` so V8's C++ `Runtime_ThrowNotConstructor` inspects `[[ProxyTarget]]` (the genuine C++ builtin) instead of printing JS source code. |
| **`/tl` (`wgl`)** | `try { class Blah extends WebGL2RenderingContext.prototype.getParameter {} } catch (e) { return e.message; }` | `TypeError: Class extends value function getParameter() { [native code] } is not a constructor or null` | All `hookMethod` and `hookGetter` wrappers pass `origFn` / `origGet` into `makeNative(..., origFn)`, preserving C++ `[[ProxyTarget]]` across all WebGL/DOM/Navigator methods. |
| **`elc`** | Sets `Error.stackTraceLimit = 10` (or reads default `10`), recurses `>15` frames deep, calls `Function.prototype.toString.call(1)`, and counts `e.stack.split('\n').length`. | `"11"` (`1` header line + `10` stack frames) | Before invoking any wrapped function, `invokeNativeWithCleanStack` temporarily bumps `Error.stackTraceLimit` by `+6`, restores `Error.stackTraceLimit` in `catch`/`finally`, and slices the scrubbed stack to `1 + Math.floor(origLimit)` (`11` lines). |
| **`esce`** | Calls `String.prototype.toString.call(Object.getOwnPropertyDescriptor(Notification, 'permission').get)` and inspects `e.stack`. | `TypeError: String.prototype.toString requires that 'this' be a String\n    at get permission.toString (<anonymous>)` | `_customStringToString` unwraps `_proxyTargetMap.get(this)` before delegating to native `String.prototype.toString`, preventing `at Proxy.toString (<anonymous>)` from appearing in the stack trace. |
| **`eem` & `eem2`** | Creates a `Proxy` with a `get` trap logging property accesses (`Symbol.toPrimitive`, `toString`, `name`, `message`, `stack`) and passes it into string/error coercion. | `_evt: "s:toPrimitive"` (`eem`) and `_evt: "s:toPrimitive,toString,name,message"` (`eem2`) | `scrubHookStack` never touches or coerces user-supplied arguments before native execution, preserving V8's exact `Symbol.toPrimitive -> toString -> name -> message` lookup order. |
| **`cnf`** | Inspects `JSON.stringify` and `window.eval` via `Function.prototype.toString`. | `{"js":true,"jsts":"function stringify() { [native code] }","ev":true,"evts":"function eval() { [native code] }"}` | Both remain untouched native V8 functions. |
| **`nl`** | `Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages').get)` | `"function get languages() { [native code] }"` |Registered in `_nativeMap` with `function get languages() { [native code] }` and native getter proxy target. |
| **`wse` & `bfe`** | Calls `Function.prototype.toString.call(nonFn)` in Main Window (`win`) and Fresh Iframe (`ifr`) and compares error messages and frame leaks (`winf`, `ifrf`). | `{"win":"TypeError: Function.prototype.toString requires that 'this' be a Function","winf":"","ifr":"...","ifrf":""}` | Cross-realm `patchRealm(win)` and `_sharedRegistry` synchronize `Function.prototype.toString` across all same-origin `<iframe>` realms. |
| **`dpv`, `nhp`, `esd`** | Invokes `Navigator.prototype` getters (`hardwareConcurrency`, `languages`, `webdriver`), `Document.prototype.createElement`, `WebGL`, and `canPlayType` with an invalid `this` receiver (`{}`) and inspects the resulting `TypeError: Illegal invocation` stack trace. | Clean `TypeError: Illegal invocation\n    at eval (eval at N (.../ips.js))` with `count: 0` hook frames | `scrubHookStack` strips all internal wrapper frames (`invokeNativeWithCleanStack`, `apply`, `get`) before rethrowing `Illegal invocation`. |
| **`ofc`** | Inspects `XMLHttpRequest.prototype.open` and `XMLHttpRequest.prototype.send` via `Function.prototype.toString` for non-native source strings. | `{"count":0}` (both return `"function open() { [native code] }"` / `"function send() { [native code] }"`) | Production `ghost_engine_core.js` registers all network hooks in `_nativeMap` via `makeNative`. |
| **`sfc` & `sbi`** | Audits `chrome.csi`, `chrome.loadTimes`, `document.createElement`, `canPlayType`, `permissions.query`, and `WebGLRenderingContext.prototype.getParameter`. | `sfc: {"funcs":{},"count":0}`, `sbi`: all 7 functions return `function ...() { [native code] }` | All 7 APIs are registered in `_nativeMap` with exact native names and `[[ProxyTarget]]` bindings. |

### 1.2 Cross-Realm Iframe, Window Enumeration & Prototype Order Collectors

| Key | Exact Probe Executed Inside Kasada Bytecode VM | Native Chromium Expected Value | How GhostBrowser Defeats It |
| :--- | :--- | :--- | :--- |
| **`fif` & `ltk`** | Enumerates `Object.getOwnPropertyNames(window)` on Main (`g`) and Fresh Iframe (`i`) and inspects the last 10 keys (`ltk`) for injected globals (`__hook*`, `__webdriver*`, `cdc_*`). | Standard Chromium window key list ending in `webkitRequestFileSystem, webkitResolveLocalFileSystemURL` | Zero `__ghost*` or `__hook*` enumerable/own properties are left on `window`; cross-realm state uses a non-enumerable symbol/handshake closure. |
| **`ifw`, `wdd`, `bas`, `wbn`** | Checks `navigator.webdriver` value and getter `toString()` on Main (`pg`) and Iframe (`pi`), plus scans `window` and `iframe` for 40+ bot globals (`bas`, `wbn`). | `ifw`: all `false`; `wdd`: `{"pg":"function get webdriver() { [native code] }","pi":"function get webdriver() { [native code] }"}`; `wbn`: `{"count":0}` | `Navigator.prototype.webdriver` returns `false` with native getter signature in both Main and Iframe realms; all automation globals are purged. |
| **`spd` & `dpi`** | Checks `Object.getOwnPropertyDescriptor(window.screen, prop)` for `availWidth`, `availHeight`, `width`, `height` and `window` for `innerWidth`, `innerHeight`, `outerWidth`, `outerHeight`, `devicePixelRatio`. | `{"availWidth":"n/a","availHeight":"n/a","width":"n/a","height":"n/a","innerWidth":"n/a",...}` | Geometry hooks are installed strictly on `Screen.prototype` and `Window.prototype` (never as own properties on `window.screen`), and `Object.getOwnPropertyDescriptor(window, ...)` returns `"n/a"` for prototype getters. |
| **`nppm`, `npf`, `cpl`, `hcp`, `phc`** | Tests `window.postMessage(navigator.plugins, '*')` (`nppm`), `plugins.refresh`/`namedItem` `toString()` (`npf`), `plugins.length` (`cpl`), and `typeof navigator.plugins` (`phc`). | `nppm`: `"DataCloneError: Failed to execute 'postMessage' on 'Window': PluginArray object could not be cloned."`; `cpl`: `{"nav":5,"ifr":5}` | Desktop profiles preserve Chromium's native C++ `PluginArray` object so structured-clone throws the genuine C++ `DataCloneError`. |
| **`nps`, `cbf`, `sdt`, `npe`, `ept`, `wpp`, `tl2`** | Audits exact property key order and count on `Notification` (`nps`), `Clipboard` (`cbf`), `Element.prototype.attachShadow` & `ShadowRoot.prototype` (`sdt`), `Navigator.prototype` (`npe`: 77 keys), `HTMLElement.prototype` (`ept`: 140+ keys), `window` (`wpp`: ~1243 keys), and 16 DOM prototypes (`tl2`: `wg:"298n"`, `wg2:"559n"`, `he:"9n"`, `de:"25n"`, `nf:"16n"`, `xp:"10n"`, `kb:"4n"`). | Exact native Chromium prototype key sequences and counts | Prototype hooks modify existing prototype descriptors in-place via `_origDefProp` without adding or reordering keys. |

### 1.3 Hardware, Graphics, Audio, Subpixel Geometry & Math Collectors

| Key | Exact Probe Executed Inside Kasada Bytecode VM | Native Chromium Expected Value | How GhostBrowser Defeats It |
| :--- | :--- | :--- | :--- |
| **`snp`, `uad`, `nvg`, `sas`, `gua`, `mnt`, `puam_dev`, `puam_dev_2`, `gp`, `vum`** | Compares `navigator.vendor`, `languages`, `hardwareConcurrency`, 3-brand `userAgentData` (`Not-A.Brand`, `Chromium`, `Microsoft Edge`/`Google Chrome`), `platform` (`"Win32"`), `maxTouchPoints` (`0`), WebGL `vendor`/`renderer`, and `performance.memory.jsHeapSizeLimit` (`4395630592`) between Main (`a`/`g`) and Iframe (`i`). | 100% identical between Main and Iframe (`snp.v.a === snp.v.i`, `uad.g === uad.i`) | `patchRealm(win)` and CDP `Emulation.setUserAgentOverride` keep Main and Iframe `navigator` & `userAgentData` 100% identical. |
| **`ihs`, `iod`, `cdt`, `fis`, `sos`, `vps`, `mtp`** | Audits `innerWidth`/`innerHeight` vs `outerWidth`/`outerHeight` (`iod`, `cdt`), `screen.width`/`height`/`availWidth`/`availHeight`, `colorDepth: 30` (`cdt.c: 30`, `fis.cd: 30`), and `screen.orientation.type` (`"landscape-primary"`). | `outerWidth >= innerWidth`, `outerHeight >= innerHeight`, `colorDepth: 30`, `dv: false`, `cv: false` | `hookOuterRealm(win)` guarantees `outerWidth >= innerWidth + 16` and `outerHeight >= innerHeight + 87` across all realms, and `matchMedia('(min-color: 10)')` matches `colorDepth: 30`. |
| **`ss`, `gv`, `ca`, `wgt`, `tm`** | Queries WebGL2 context (`gv: "webgl2"`), `UNMASKED_RENDERER_WEBGL` (`ss`), `getContextAttributes()` (`ca`), WebGL draw timing (`wgt`), and `requestAnimationFrame` cadence (`tm`: `8.33ms` / `16.66ms`). | Authentic ANGLE D3D11 / Metal GPU string and context attributes | Hardware-consistent ANGLE GPU parameters and OffscreenCanvas parity. |
| **`dfp`, `cefp`, `cduf`, `stc`, `ccf`, `bfs`, `ebb`, `mbb`, `fmf`, `rtf`, `dp`, `fs2`, `ac`** | Runs Canvas 2D subpixel rendering (`dfp`, `cefp`), `toDataURL` format support (`cduf`: `["png","jpeg","webp"]`), font width cascade (`stc`, `ccf`), `getBoundingClientRect` subpixel decimal histograms (`dp`, `ebb`, `mbb`, `rtf`, `fs2`), and 15 CSS System Colors (`ac`). | Deterministic subpixel layout & Windows/macOS system color palette | Subpixel noise and font metrics are seeded deterministically per profile. |
| **`lip`, `mrs`, `cef`, `jdo`** | Checks IEEE-754 float64 base-36 conversion `(18446744073709550000).toString(36)` (`lip`), Math transcendental hash (`mrs: "383143953"`), `encodeURIComponent` table (`cef`), and DOM table serialization (`jdo`). | `lip`: `{"rawInt":18446744073709550000,"strInt":"3w5e11264sg00"}` | Native V8 IEEE-754 math and string encoders remain completely untouched. |
| **`crs`, `ecp`, `smc`, `spc`, `kbk`, `loc`, `lli`, `ao`, `tnp`, `ddt2`, `ddt3`, `ecs`, `mwa`, `lsr`, `wv`, `td`, `dep`, `csi`, `hef`, `dip`, `tn`, `kl`, `sab`, `ust`, `lsk`, `uh`, `eck`, `sic`, `hri`, `ird`, `ldm2`, `tlc`, `atd`, `ssc`** | Remaining 34 environment & timing collectors: `chrome.app.runningState` (`crs`, `ecp`), `MediaSource` illegal invocation (`smc`), `PerformanceNavigationTiming` (`td`, `uh`, `hri` with `nextHopProtocol: "h2"`), `SharedArrayBuffer` (`sab`), and the 35-bit `ldm2` environment anomaly bitmask. | Zero tampering bits set in `ldm2`; `sab: {"w":0,"i":0}` | All 34 collectors return native desktop Chromium states. |

---

## Part 2: Akamai Bot Manager v3 + SBSD/CPR (`adidas_ak_s1.js` + `adidas_ak_s2.js`) — Complete 120-Signal Blueprint

On Adidas (`https://www.adidas.com/us` and `https://www.adidas.com/us/men-shoes`), Akamai deploys a dual-script architecture:
1. **`adidas_ak_s1.js` (`511 KB`, `ver: "7SqoSPGIyQr6lLxH8IF+4g=="`)**: Executes the **SBSD/CPR Challenge & `SharedWorker` Telemetry Engine**, collecting **120 `Ah007..Ah978` signals** and executing dynamic base64 bytecode (`s1_bc`).
2. **`adidas_ak_s2.js` (`620 KB`, `ver: "Wc6z2ntyKocx/4yBa/Q9HEwGF4VXZfVamzgS3TIQaYs="`)**: Executes the **Akamai Bot Manager v3 Sensor Engine**, collecting `din` (Device Instance), `dsi` (Iframe vs Main diff), `sww` (Dedicated Web Worker `s024..s073`), `mst` (Main Sensor Telemetry), and 2 dynamic base64 bytecode programs (`s2_bc1`, `s2_bc2`).

### 2.1 The `SharedWorker` vs. Main Thread Cross-Realm Comparison (`fJ(xHE, gWE)` in `adidas_ak_s1.js`)

Inside `adidas_ak_s1.js` (`case KS` / `NzE`), Akamai spawns a **`SharedWorker`** (`new SharedWorker(URL.createObjectURL(new Blob([workerCode], {type: "application/javascript"})))`) and compares its telemetry (`gWE`) directly against Main-Thread telemetry (`xHE`):

| Signal Pair (Main Thread vs. `SharedWorker`) | Main Thread Signal (`xHE`) | `SharedWorker` Signal (`gWE`) | Exact Property Compared | Verified Value After Fix |
| :--- | :--- | :--- | :--- | :--- |
| **`Ah292` vs. `Ah733`** | `Ah292` | `Ah733` | `navigator.userAgentData.brands` | `[{"brand":"Not-A.Brand","version":"24"},{"brand":"Chromium","version":"155"},{"brand":"Microsoft Edge","version":"155"}]` (3 brands, zero `WebView2`, zero duplicate brand) |
| **`Ah066` vs. `Ah978`** | `Ah066` | `Ah978` | `hev.fullVersionList` | `[{"brand":"Not-A.Brand","version":"24.0.0.0"},{"brand":"Chromium","version":"155.0.4283.62"},{"brand":"Microsoft Edge","version":"155.0.4283.62"}]` |
| **`Ah321` vs. `Ah938`** | `Ah321` | `Ah938` | `hev.platform` (`NavigatorUAData`) | `"Windows"` in both Main Thread and `SharedWorker` (previously `"Win32"` in `SharedWorker`!) |
| **`Ah296` vs. `Ah559`** | `Ah296` | `Ah559` | `navigator.platform` | `"Win32"` in both Main Thread and `SharedWorker` |
| **`Ah769` vs. `Ah373`** | `Ah769` | `Ah373` | `[connection.effectiveType, type, saveData]` | `["4g", -1, "null"]` in both Main Thread and `SharedWorker` (previously `["3g", -1, "null"]` in `SharedWorker`!) |
| **`Ah229` vs. `Ah528`** | `Ah229` | `Ah528` | `navigator.userAgent` | Identical clean Chrome/Edge 155 UA string |
| **`Ah668` vs. `Ah840`** | `Ah668` | `Ah840` | `navigator.appVersion` | Identical `5.0 (Windows NT 10.0; Win64; x64)...` |
| **`Ah631` vs. `Ah925`** | `Ah631` | `Ah925` | `hev.uaFullVersion` | `"155.0.4283.62"` in both realms |
| **`Ah711` vs. `Ah758`** | `Ah711` | `Ah758` | `hev.platformVersion` | `"15.0.0"` in both realms |
| **`Ah640` vs. `Ah649`** | `Ah640` | `Ah649` | `hev.architecture` | `"x86"` in both realms |
| **`Ah041` vs. `Ah722`** | `Ah041` | `Ah722` | `navigator.hardwareConcurrency` | `"24"` in both realms |
| **`Ah729` vs. `Ah794`** | `Ah729` | `Ah794` | `navigator.deviceMemory` | `"8"` in both realms |
| **`Ah242` vs. `Ah679`** | `Ah242` | `Ah679` | `JSON.stringify(navigator.languages)` | `["en-US","en"]` in both realms |
| **`Ah344` vs. `Ah510`** | `Ah344` | `Ah510` | `navigator.language` | `"en-US"` in both realms |
| **`Ah186` vs. `Ah241`** | `Ah186` | `Ah241` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | `"America/Chicago"` in both realms |
| **`Ah554` vs. `Ah927`** | `Ah554` | `Ah927` | `new Date().toString()` | Matching local timezone string |
| **`Ah159` / `Ah456` / `Ah651` / `Ah747`** | `Ah159`, `Ah456` | `Ah651`, `Ah747` | WebGL `UNMASKED_RENDERER_WEBGL` (Main WebGL1/2 vs Worker/SharedWorker OffscreenCanvas) | `"ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)"` across all 4 contexts |
| **`Ah205` / `Ah425` / `Ah564` / `Ah909`** | `Ah205`, `Ah425` | `Ah564`, `Ah909` | WebGL `UNMASKED_VENDOR_WEBGL` across all 4 contexts | `"Google Inc. (NVIDIA)"` across all 4 contexts |

### 2.2 Decoded Dynamic `atob()` Bytecode Programs (`s1_bc`, `s2_bc1`, `s2_bc2`)

| Bytecode Routine | Decoded Operation | Expected Native Result |
| :--- | :--- | :--- |
| **`s1_bc.Lk`** | `navigator.plugins[0] === navigator.plugins[0][0].enabledPlugin` | `1` (`true` — circular reference intact) |
| **`s1_bc.AW`** | `vE = navigator.plugins.refresh; X3 = Math.floor(Math.random()).toString(); navigator.plugins.refresh = X3; check navigator.plugins.refresh === X3; restore vE` | `1` (`true` — `PluginArray` instance allows property assignment) |
| **`s1_bc.nR`** | `navigator.plugins[0] === navigator.plugins.item(4294967296)` | `1` (`true` — WebIDL `unsigned long` wraps $2^{32} \equiv 0 \pmod{2^{32}}$) |
| **`s1_bc.rY`** | `typeof window.SharedArrayBuffer === 'undefined'` when `!window.crossOriginIsolated` | `1` (`true` — coherent cross-origin isolation state) |
| **`s1_bc.XB`** | `Object.keys(Object.getOwnPropertyDescriptors(navigator)).join(',')` | `""` (empty string — zero own properties on `navigator` instance) |
| **`s1_bc.Jz`** | `navigator.userAgentData.brands.length` & `.toString()` | `3` brands (`[object Object],[object Object],[object Object]`) |
| **`s2_bc1` & `s2_bc2`** | Dynamic challenge token derivation over `navigator.userAgent`, `window.bmak.startTs`, `document.createElement('div')`, `baseURI`, `ATTRIBUTE_NODE`, and trigonometric constants (`Math.PI`, `Math.cos`, `Math.sqrt`, `Math.pow`). | Deterministic challenge response token sent to `/_bm/_data` |

### 2.3 Complete Catalog of All 120 `Ah007..Ah978` Signals (`adidas_ak_s1.js`)

- **Memory, Timing & Network (`Ah007`, `Ah176`, `Ah177`, `Ah350`, `Ah373`, `Ah536`, `Ah575`, `Ah576`, `Ah769`, `Ah918`)**:
  - `Ah007`: `[jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize, connection.rtt]` (`"4395630592,43234403,31067335,50"`)
  - `Ah176`: Epoch timestamp (`ms`); `Ah177`: Script version hash (`"7SqoSPGIyQr6lLxH8IF+4g=="`)
  - `Ah350`: Execution duration micro-timer; `Ah536`: `80`; `Ah575`: `location.href`; `Ah576`: `201`; `Ah918`: `connection.downlink.toFixed(2)` (`"10.00"`)
- **Screen, Viewport & Media Queries (`Ah040`, `Ah162`, `Ah197`, `Ah297`, `Ah447`, `Ah532`, `Ah853`, `Ah854`, `Ah889`)**:
  - `Ah040`: `screen.height` (`"1080"`); `Ah197`: `screen.width` (`"1920"`); `Ah162` & `Ah297`: `screen.colorDepth` / `pixelDepth` (`"30"`)
  - `Ah853`: `devicePixelRatio` (`"1"`); `Ah854`: `pointer` / `any-pointer` media queries (`"fine,fine"`); `Ah889`: `screen.orientation.type` (`"landscape-primary"`)
- **Audio, Canvas 2D, Fonts & WebGL (`Ah035`, `Ah120`, `Ah159`, `Ah205`, `Ah425`, `Ah451`, `Ah456`, `Ah502`, `Ah537`, `Ah552`, `Ah564`, `Ah633`, `Ah651`, `Ah740`, `Ah747`, `Ah749`, `Ah859`, `Ah909`)**:
  - `Ah035`: Web Audio compressor/oscillator signature (`"s1:-90|s2:discrete|s3:0,1,1,0|s4:explicit|s5:2048,1024"`)
  - `Ah120` & `Ah451`: Font measurement width pipes (`"339188|085468|816930|..."`)
  - `Ah537` & `Ah633`: Canvas 2D SHA-256 geometry hashes
  - `Ah740`: WebGL shader precision & parameter bitpack (`"a63e7efb|s1:16|s2:30|s3:12|s4:1,1|s5:1,1024|s6:32767,32767|s7:16384|s8:24|s9:120|s10:-8"`)
- **Automation, Integrity & Feature Bitmasks (`Ah026`, `Ah044`, `Ah073`, `Ah075`, `Ah076`, `Ah084`, `Ah107`, `Ah110`, `Ah117`, `Ah142`, `Ah147`, `Ah150`, `Ah164`, `Ah232`, `Ah269`, `Ah282`, `Ah322`, `Ah331`, `Ah345`, `Ah390`, `Ah391`, `Ah393`, `Ah419`, `Ah437`, `Ah438`, `Ah475`, `Ah478`, `Ah525`, `Ah565`, `Ah594`, `Ah595`, `Ah600`, `Ah605`, `Ah625`, `Ah628`, `Ah646`, `Ah648`, `Ah655`, `Ah666`, `Ah673`, `Ah680`, `Ah719`, `Ah759`, `Ah799`, `Ah801`, `Ah819`, `Ah831`, `Ah836`, `Ah852`, `Ah913`, `Ah949`, `Ah961`, `Ah963`)**:
  - `Ah322`: `"0"` (Error stack proxy frame check — returns `"1"` if `stripProxyFromErrors` or `newHandler.<computed>` is present!)
  - `Ah605`: `"000"` & `Ah836`: `"000000"` & `Ah680`: `"00"` (zero automation/stealth/headless bitflags triggered)
  - `Ah961`: `"audioinput,videoinput,audiooutput"` (`mediaDevices.enumerateDevices()` kinds)
