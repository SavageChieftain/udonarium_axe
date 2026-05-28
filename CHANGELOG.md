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
