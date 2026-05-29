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
