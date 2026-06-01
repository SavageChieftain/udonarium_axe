## [1.8.1](https://github.com/SavageChieftain/udonarium_axe/compare/v1.8.0...v1.8.1) (2026-06-01)

### 🐛 Bug Fixes

* **chat:** forward reply and quote info from chat palette ([ce4ad8f](https://github.com/SavageChieftain/udonarium_axe/commit/ce4ad8f1d89257e524e14f8a6f44fdfef73de0d9))
* **chat:** reveal jump-to-latest button as messages pile up when auto-follow is off ([1fe4191](https://github.com/SavageChieftain/udonarium_axe/commit/1fe4191960f4bab9739a5c1708ff5cd00e0010c6))

### 📝 Documentation

* fix stale references and clarify dependency diagram ([5682393](https://github.com/SavageChieftain/udonarium_axe/commit/5682393914fcdd1b29c4cbfff3bd2bfd02fc2a16))
* **github:** add bug report and feature request issue templates ([567e5bc](https://github.com/SavageChieftain/udonarium_axe/commit/567e5bc73b2c8b07ed81639a25acfd37f838b9f1))
* rewrite README and add docs/features.md ([abb85e9](https://github.com/SavageChieftain/udonarium_axe/commit/abb85e96a5ce2b605437bae4230cf41b44ffbed1))

## [1.8.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.7.0...v1.8.0) (2026-05-31)

### ✨ Features

* **card-stack:** show deck thickness as stacked card layers ([debd667](https://github.com/SavageChieftain/udonarium_axe/commit/debd667fdc53ee23873acaebe16a7af691cd27e7)), closes [#f5efe2](https://github.com/SavageChieftain/udonarium_axe/issues/f5efe2) [#2a1f0d](https://github.com/SavageChieftain/udonarium_axe/issues/2a1f0d)
* **card:** return all selected cards to stack on multi-drag drop ([04df639](https://github.com/SavageChieftain/udonarium_axe/commit/04df639c3d7e0bdabeac36e7b83c0fc0053fd16d))
* **tabletop:** add marquee selection with long-press on empty table ([f93f677](https://github.com/SavageChieftain/udonarium_axe/commit/f93f6776dcf3a118aee028af0b2b9f94374a620d))
* **tabletop:** add toggleable north/east/south/west wall surfaces ([41c06bf](https://github.com/SavageChieftain/udonarium_axe/commit/41c06bf8a973fdb349d50f186fb9fd6ec51f549d))
* **tabletop:** context-menu action to move objects between surfaces (Sub-C) ([3aa6513](https://github.com/SavageChieftain/udonarium_axe/commit/3aa6513be8b4ec645b3dfdc943ec1b91f09954be))
* **tabletop:** drop tabletop objects onto another surface to move them (Sub-B) ([31e6c61](https://github.com/SavageChieftain/udonarium_axe/commit/31e6c61555e60313aaebce0aebeec8348cdb5b6e))
* **tabletop:** host tabletop objects on each wall surface (Sub-A) ([76edefb](https://github.com/SavageChieftain/udonarium_axe/commit/76edefb2ed5d3062d66dff7dfed82e12ca8edfad)), closes [#gameObjects](https://github.com/SavageChieftain/udonarium_axe/issues/gameObjects)
* **ui:** drag selected tabletop objects together as a group ([1720340](https://github.com/SavageChieftain/udonarium_axe/commit/1720340b281a221dd8b1cd672738c1c8b9a5c66c))
* **ui:** toggle tabletop object selection via Ctrl+click and add batch menu ([a801b89](https://github.com/SavageChieftain/udonarium_axe/commit/a801b89a7ce733795a6e4b9c2446fdc989c5d1f9))

### 🐛 Bug Fixes

* **character:** drop camera billboarding from labels on wall characters ([9d48c57](https://github.com/SavageChieftain/udonarium_axe/commit/9d48c57f0005684a568086bc3ed7633502c34bf2))
* **character:** fit wall character image inside the size box ([d3ce1d9](https://github.com/SavageChieftain/udonarium_axe/commit/d3ce1d95755cf9e0e5b6f9118ee0b8073dd307f3))
* **character:** hoist poster image out of the h-auto inner div ([8b23c81](https://github.com/SavageChieftain/udonarium_axe/commit/8b23c81e1bb6542febf66928d62b22e8a43a28bc))
* **character:** keep pedestal/labels on wall characters and center the body ([ae5f38a](https://github.com/SavageChieftain/udonarium_axe/commit/ae5f38a1d82cae2fb4b3ee38a7bf872a9c4f213a))
* **character:** render wall characters with the existing 2D-mode layout ([fa61b7d](https://github.com/SavageChieftain/udonarium_axe/commit/fa61b7dafc1fef05eef3105c09d1e202d98f30bd))
* **character:** stop double-rotating wall characters into a flat sliver ([6205b83](https://github.com/SavageChieftain/udonarium_axe/commit/6205b83846016f2a38010a3a6de727ff10c4b200))
* **dice:** add -webkit-transform-style:preserve-3d to dice template ([7949b9a](https://github.com/SavageChieftain/udonarium_axe/commit/7949b9a854de56b608809c3a9b4b3330b6be898c))
* **dice:** revert dice template patches and use character-equivalent wall hooks only ([e9f516c](https://github.com/SavageChieftain/udonarium_axe/commit/e9f516c441650c995129f1dbd2b243952d248be9))
* **game-table:** apply wall transform-origin via inline style ([2926a87](https://github.com/SavageChieftain/udonarium_axe/commit/2926a87ebaaee4925c66be6cc60ed0de650bb61a))
* **movable:** force pointer3d.z to 0 during drag and on surface switch ([f2c982c](https://github.com/SavageChieftain/udonarium_axe/commit/f2c982c5d6de7332a768a3dc41a1b7b1886e24f4))
* **tabletop:** adopt terrain-style wall transforms so image bottom sits on floor ([e1052d1](https://github.com/SavageChieftain/udonarium_axe/commit/e1052d1972e5539a43d5adb25e019a87db6d300e))
* **tabletop:** apply selection highlight to text-note visible content ([7e181a8](https://github.com/SavageChieftain/udonarium_axe/commit/7e181a8c09db5fba0a05a851bab7e138819db7f3))
* **tabletop:** clamp cross-surface drop to surface bounds and tighten secondary label ([a8f88ca](https://github.com/SavageChieftain/udonarium_axe/commit/a8f88ca7d745076ac415e211b03c1fe154bdbfed))
* **tabletop:** drop the Z lift for wall objects and align labels with the head ([dc2e328](https://github.com/SavageChieftain/udonarium_axe/commit/dc2e328566a1d49e455afcfb88fec49c5e150071))
* **tabletop:** freeze movable position while pointer hovers a different surface ([3a93ef6](https://github.com/SavageChieftain/udonarium_axe/commit/3a93ef687073a0beda0c5745a21bba0bf85164fb))
* **tabletop:** hide pedestal on wall characters and pass empty wall area to table gesture ([25c90c5](https://github.com/SavageChieftain/udonarium_axe/commit/25c90c5c7668f0712f0aefe2abc93d97258445fa))
* **tabletop:** keep east wall anchored to east edge while mirroring text ([8f7aafc](https://github.com/SavageChieftain/udonarium_axe/commit/8f7aafc947fb6878ee714e45b9e126e9f202c695))
* **tabletop:** keep wall content visible from every camera angle ([e07b5d4](https://github.com/SavageChieftain/udonarium_axe/commit/e07b5d4d8d44db6aeccd22a65c01f660e5a0730b))
* **tabletop:** lift wall name above the head and render wall dice image ([1461e5d](https://github.com/SavageChieftain/udonarium_axe/commit/1461e5de158c97875cb94c1761b3513ab3e72153))
* **tabletop:** make surface switch fire immediately and render wall characters as posters ([6b573ab](https://github.com/SavageChieftain/udonarium_axe/commit/6b573ab99cbdc639ac4ec35374dfd0759cfbc0d1))
* **tabletop:** reject cross-surface drops that project far outside the wall ([b8074cc](https://github.com/SavageChieftain/udonarium_axe/commit/b8074ccf3a85260963901e792d0841eaa5bc2bcd))
* **tabletop:** un-squash wall dice and tighten character label spacing ([f4240ae](https://github.com/SavageChieftain/udonarium_axe/commit/f4240ae12f5272392afb772d1a1fc94baa3f9f67))

### ♻️ Refactor

* **domain:** introduce Lockable interface and drop duck-type casts ([bed556f](https://github.com/SavageChieftain/udonarium_axe/commit/bed556f7587a6f95efe88ccde36dc66ba82ff2fd))
* **tabletop:** centralize gridSize and mode2d on TabletopService ([116487e](https://github.com/SavageChieftain/udonarium_axe/commit/116487e28777c5489bae2eac32a6bc6cb4962260))
* **ui:** extract billboard and label-orbit transforms to shared helpers ([2741b8b](https://github.com/SavageChieftain/udonarium_axe/commit/2741b8bbfee21adb7588921f8a7419ebaee0c29b))
* **ui:** extract lock-toggle and copy context-menu builders ([84c8320](https://github.com/SavageChieftain/udonarium_axe/commit/84c83207c14138ff979c8317a692f2b9a03383f5))
* **ui:** extract MovableOption setup and InputHandler boilerplate ([76080e7](https://github.com/SavageChieftain/udonarium_axe/commit/76080e7d5a447a2d1f6208260c1021d7a4d971b5))

## [1.7.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.6.0...v1.7.0) (2026-05-29)

### ✨ Features

* **character:** invoke registered range shapes from context menu ([cde65e6](https://github.com/SavageChieftain/udonarium_axe/commit/cde65e6f7cbb8cf7a2389ac89a89c8c518b1f8b7))
* **data-element:** add RANGE_SHAPE field type with thumbnail preview ([9b38271](https://github.com/SavageChieftain/udonarium_axe/commit/9b38271dae2e15923bc7dabf4ce4f2bfe0492719))
* **dice:** make name and owner labels follow camera like character pieces ([d4af5bb](https://github.com/SavageChieftain/udonarium_axe/commit/d4af5bbc503636dbefd97ed6e322139edb7258c3))
* **domain:** add cell-pattern utilities and CUSTOM range type ([6da237a](https://github.com/SavageChieftain/udonarium_axe/commit/6da237a935efdc5f2aea529a3ec770fb6f87c5fe))
* **i18n:** add strings for custom range feature ([fdea3a1](https://github.com/SavageChieftain/udonarium_axe/commit/fdea3a10ed78e18b2dfa7c12624a06e46a8acd73))
* **range-shape-editor:** add cell painter panel component ([2dec805](https://github.com/SavageChieftain/udonarium_axe/commit/2dec805846f5da496f8ff89479357bd5429a5f67))
* **range:** render CUSTOM cells aligned to the table grid ([20930c8](https://github.com/SavageChieftain/udonarium_axe/commit/20930c862f54e9dd5b56a297c517d91f63302a8c))
* **tabletop:** add 2D top-down mode with orbit-aware piece labels ([c896dea](https://github.com/SavageChieftain/udonarium_axe/commit/c896deab1b4f171d5f4f2f4d6751a1e54d5123e3))
* **tabletop:** add per-table toggle to billboard character and dice images ([1d2b12a](https://github.com/SavageChieftain/udonarium_axe/commit/1d2b12a281d0d6b7a2db4baa5db405976bcf9902))
* **tabletop:** disable piece rotation gestures in 2D mode ([8e28aed](https://github.com/SavageChieftain/udonarium_axe/commit/8e28aed8c33526b156bcb4f9149944e4ab1069f2))

### 🐛 Bug Fixes

* **chat:** clear chatJumpRequest after the target consumes it ([5237451](https://github.com/SavageChieftain/udonarium_axe/commit/5237451f69bc8e3cf62e0cf4d1c0e22455c4e54e))
* **chat:** skip scrollToBottom$ when auto-follow is off ([722ad02](https://github.com/SavageChieftain/udonarium_axe/commit/722ad02bca481a3634e3803e0ede6980dbcbd39b))
* **ui:** keep same-layer peers passthrough while a movable is dragged ([1862eef](https://github.com/SavageChieftain/udonarium_axe/commit/1862eef8f6c9f74697aa981fb22cc8049d306791))

## [1.6.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.5.0...v1.6.0) (2026-05-28)

### ✨ Features

* **game-character:** billboard name and buff labels toward the camera ([083c3a7](https://github.com/SavageChieftain/udonarium_axe/commit/083c3a7046176113f3bff3f30072ca8531c030f4))

## [1.5.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.4.8...v1.5.0) (2026-05-28)

### ✨ Features

* **chat-log:** square portraits and surface quote / reply relationships ([68b31a0](https://github.com/SavageChieftain/udonarium_axe/commit/68b31a0ad32cbc66d1bdcc5448d29c197c2d7ed2))
* **image:** convert uploaded and loaded images to WebP ([e760b55](https://github.com/SavageChieftain/udonarium_axe/commit/e760b558fdc3e44a133f8a75b294a5b6860dc62d))
* **storage:** add downscaleImageBlob canvas-based resizer ([3e4dfd4](https://github.com/SavageChieftain/udonarium_axe/commit/3e4dfd44837d5dd12d9c0fc5a46d5b272ec1960a))

### 🐛 Bug Fixes

* **build:** keep src/assets/config.json available to ng serve and dev builds ([ae64423](https://github.com/SavageChieftain/udonarium_axe/commit/ae644233d1992832c9026af35460230108b51a05))
* **chat-log:** align avatar column across replies and quotes ([875ece0](https://github.com/SavageChieftain/udonarium_axe/commit/875ece07ad86619b43e0f284728f785bee305222))
* **chat-log:** decode [@i18n](https://github.com/i18n): placeholders in exported HTML log ([cd928de](https://github.com/SavageChieftain/udonarium_axe/commit/cd928de3c4a43b92e18091ce385e185f0eae6423))
* **chat-log:** keep quote/reply block from breaking name -> body line ([041c0b7](https://github.com/SavageChieftain/udonarium_axe/commit/041c0b7ea8d9d262bea432d5c63d9c7fac9b1692))
* **chat-log:** switch CoC message wrapper from <p> to <div> ([3e60efc](https://github.com/SavageChieftain/udonarium_axe/commit/3e60efc562e3dd1121aae652a080e2d997a6633e))
* **chat-window:** remove redundant instanceof gate in objectChanged$ handler ([85e5664](https://github.com/SavageChieftain/udonarium_axe/commit/85e56647cf5194491485c580c78ec8156f6ba3ad))
* **chat:** persist ChatMessage identifier so reply / quote survive zip reload ([9ff15e7](https://github.com/SavageChieftain/udonarium_axe/commit/9ff15e7b32ad0fbab8bf5fa5a44f04dd513d4ef0))
* **ci:** grant id-token: write at the release workflow level ([76914ee](https://github.com/SavageChieftain/udonarium_axe/commit/76914ee0318a41480307ffd18a115b90c3441259))
* **sound-effect:** replace dynamic imports with static imports in spec ([641da4e](https://github.com/SavageChieftain/udonarium_axe/commit/641da4ea177110c09c0c2e4226254be1fd0b4cc2))

### ⚡ Performance

* **chat-log:** dedup repeated images and downscale portraits in HTML export ([d18eb56](https://github.com/SavageChieftain/udonarium_axe/commit/d18eb565fa90d51fe6c58cafd9275804c6dfb52d))
* **chat-log:** use WebP and tighter dimension caps for HTML log images ([bba938c](https://github.com/SavageChieftain/udonarium_axe/commit/bba938cdb849955264c64b83d996cad150a8d25c))

### ♻️ Refactor

* **chat-log:** extract inline styles into shared CSS class block ([0dfbea2](https://github.com/SavageChieftain/udonarium_axe/commit/0dfbea238e1d6f442a44be6c640f0c7ff1b9fb49))
