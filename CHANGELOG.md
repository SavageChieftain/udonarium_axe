## [1.16.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.15.0...v1.16.0) (2026-06-13)

### ✨ Features

* **map-editor:** edit committed curves by dragging their anchor points ([0584a50](https://github.com/SavageChieftain/udonarium_axe/commit/0584a504a98d9f9e91b60f5189b56341c8f186a6))
* **map-editor:** edit freehand strokes and make the eraser context-aware ([8c57946](https://github.com/SavageChieftain/udonarium_axe/commit/8c5794662ecf252a5dcdf7ddd54642e3879020e6))
* **map-editor:** erase freehand strokes partially like a Photoshop eraser ([c9a1251](https://github.com/SavageChieftain/udonarium_axe/commit/c9a125144ea04c77d29fbbf8281fd1ff17b1e17b))
* **map-editor:** inline text editing in place on the canvas ([1ef46ac](https://github.com/SavageChieftain/udonarium_axe/commit/1ef46ac8958d133c54a401d2f17de574b6321899))
* **map-editor:** place each stamp on its own layer ([6444a80](https://github.com/SavageChieftain/udonarium_axe/commit/6444a807d0d33ba425694aa53d508b73aa030552))
* **map-editor:** reorder layers by drag-and-drop with mini previews ([d74e47f](https://github.com/SavageChieftain/udonarium_axe/commit/d74e47f40cec4262221c6a8ac073cb25a03ff845))
* **map-editor:** use uploaded images as stamps via the マップスタンプ tag ([88d80b9](https://github.com/SavageChieftain/udonarium_axe/commit/88d80b9a10e2792c5bdf9b929605095de35f7657))

### 🐛 Bug Fixes

* **map-editor:** always create a new layer from the add-layer menu ([4d151c9](https://github.com/SavageChieftain/udonarium_axe/commit/4d151c9e2fadff60687eceaac64d72bcd062caf2))
* **map-editor:** stop canvas drags from moving the floating window ([2688c85](https://github.com/SavageChieftain/udonarium_axe/commit/2688c8561b3b4546d4a859f90a3d3ae6320a79e9))
* **map-editor:** use dark default colors so strokes are visible ([9d59b07](https://github.com/SavageChieftain/udonarium_axe/commit/9d59b07126954f117fc9fd53b765d3c43bf6697c)), closes [#e8e8ea](https://github.com/SavageChieftain/udonarium_axe/issues/e8e8ea)

### 📝 Documentation

* **website:** add v1.15.0 release notes ([2af10e0](https://github.com/SavageChieftain/udonarium_axe/commit/2af10e067f98c4dc8524713d27961f57d3292d7e))

## [1.15.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.14.0...v1.15.0) (2026-06-13)

### ✨ Features

* **map-maker:** add curve and closed curve line kinds ([564792c](https://github.com/SavageChieftain/udonarium_axe/commit/564792c42bc6d83fd3d18d144bb8d1980ebabd86))
* **map-maker:** add GM map editor panel with toolbar entry ([60984a5](https://github.com/SavageChieftain/udonarium_axe/commit/60984a5152fa3b2593846bb38e5f3fd85da34218))
* **map-maker:** add hex grids, image layers and texture transforms ([4363fa3](https://github.com/SavageChieftain/udonarium_axe/commit/4363fa305ec04b31cbc7b43ce1a87d0dbbe60aeb))
* **map-maker:** add scene model, canvas renderer and stamp library ([4677f20](https://github.com/SavageChieftain/udonarium_axe/commit/4677f204da66f82d75eff7bd047472b665a05311))
* **map-maker:** add stroke textures and zip save/load with images ([eae3926](https://github.com/SavageChieftain/udonarium_axe/commit/eae3926874f600777de772a920a1d509d0f195c4))
* **map-maker:** align hex scenes to the table footprint, add styles ([18d7eeb](https://github.com/SavageChieftain/udonarium_axe/commit/18d7eeb7efc7cba350fc386f8778d365fb00886a))
* **map-maker:** confirm layer deletion with an in-app dialog ([d707d89](https://github.com/SavageChieftain/udonarium_axe/commit/d707d8928e05c85f009946d1459b254efdd66d67))
* **map-maker:** merge line and polyline into one tool with kinds ([2603c53](https://github.com/SavageChieftain/udonarium_axe/commit/2603c53ebcaf19a62d1a43df118a8e986cb234c4))
* **map-maker:** pen and eraser naming, iconic kind pickers ([2f86479](https://github.com/SavageChieftain/udonarium_axe/commit/2f86479d96df14ca2d66db86525fea9d0f90bc06))
* **map-maker:** polish the editor into a proper drawing tool ([275147b](https://github.com/SavageChieftain/udonarium_axe/commit/275147bdce688d305dd93491454a9c2274251c16))
* **map-maker:** polyline tool, line styles, shadows and image UX ([3a0a403](https://github.com/SavageChieftain/udonarium_axe/commit/3a0a403983d653fb2240be405d78d7a6fe7a1a91))
* **map-maker:** refine tool icons, order and transparent background ([ac36a32](https://github.com/SavageChieftain/udonarium_axe/commit/ac36a329644b8307fb7c8a71667da647f941860a))
* **map-maker:** remove wall tool superseded by stroke textures ([0608c37](https://github.com/SavageChieftain/udonarium_axe/commit/0608c379fd06ce56f1e51cf9a828eeeb5874bab4))
* **map-maker:** rename the tool to map editor ([d898e35](https://github.com/SavageChieftain/udonarium_axe/commit/d898e3502b5727d0a5f4fda15770eead05e34850))
* **map-maker:** repaint textures with element-based painterly art ([5d998a4](https://github.com/SavageChieftain/udonarium_axe/commit/5d998a4918c41796e10320f6145807c73354e75e))
* **map-maker:** replace procedural textures with bundled image tiles ([8083a16](https://github.com/SavageChieftain/udonarium_axe/commit/8083a168c79902d705586aa53b80844fe19724fd))
* **map-maker:** rework the editor into a structured map editor ([1e4a088](https://github.com/SavageChieftain/udonarium_axe/commit/1e4a0883e8238cca7bc1c7cd365ed08cdf478ed8))
* **map-maker:** seamless RPG-grade textures, image fills, wall texture ([0792fb6](https://github.com/SavageChieftain/udonarium_axe/commit/0792fb6f731f70059815898620dbfaa91253dbd8))
* **map-maker:** texture palette previews, uploads and wall fills ([9765446](https://github.com/SavageChieftain/udonarium_axe/commit/97654468b4dcae6f92258a79f93fb42488d06274))
* **tabletop:** align map images to hex grids in the adjuster ([8062650](https://github.com/SavageChieftain/udonarium_axe/commit/8062650743f77745945ec500a6f0329c7c140635))
* **tabletop:** align maps by moving the image under a fixed grid ([3111065](https://github.com/SavageChieftain/udonarium_axe/commit/3111065ca88ec90806305a9ceab11b79b5ed071f))
* **tabletop:** align uploaded map images to the grid on selection ([c79ea04](https://github.com/SavageChieftain/udonarium_axe/commit/c79ea040f3cae7ff327ea8af017aa0eda7904238))
* **tabletop:** fix the clip frame and manipulate the image directly ([90ec6cd](https://github.com/SavageChieftain/udonarium_axe/commit/90ec6cdd05be37434ee7f3446ca561eb42abf1ef))
* **tabletop:** rebuild the grid adjuster around one-screen fit ([a0e0315](https://github.com/SavageChieftain/udonarium_axe/commit/a0e03151974de558a2301d068923913e1913ef6c))
* **tabletop:** restyle the align-to-grid entry as a compact action ([9c3de6a](https://github.com/SavageChieftain/udonarium_axe/commit/9c3de6a48903b05f9d09816bc8280361c94bf125))
* **tabletop:** zoom the adjuster workspace and auto-fit large frames ([23bd52a](https://github.com/SavageChieftain/udonarium_axe/commit/23bd52ae169b384ef9793aa378c4bffb1a720187))
* **ui:** let modal children opt into content-driven width ([f251d38](https://github.com/SavageChieftain/udonarium_axe/commit/f251d38c00969e7475e3056f773d52a8c4e6e6e3))

### 🐛 Bug Fixes

* **chat:** guard against missing ChatTabList in chat tab template ([7c10234](https://github.com/SavageChieftain/udonarium_axe/commit/7c10234311d60f22826ff333890488cbc4287a00))
* **map-maker:** locked layers can no longer be deleted ([52edb12](https://github.com/SavageChieftain/udonarium_axe/commit/52edb12e1fce76c9b66b7d0549e98127c331af3d))
* **tabletop:** stop preflight clamping the adjuster image preview ([d4bd1ec](https://github.com/SavageChieftain/udonarium_axe/commit/d4bd1ece53286b4285a54032a1f989a76c838bda))
* **tabletop:** unsqueeze the grid adjuster controls column ([21ee45d](https://github.com/SavageChieftain/udonarium_axe/commit/21ee45ddfea8b35201ce77fce6268115ebc88b68))
* **ui:** raise maximized panels above the floating menu ([2dfcbf5](https://github.com/SavageChieftain/udonarium_axe/commit/2dfcbf53a04ab914482fc84043966c246b47f4db))
* **vote:** guard finish check against a null self cursor ([d760ace](https://github.com/SavageChieftain/udonarium_axe/commit/d760aceab1cfae07e82b961ba25a770c983e1ef4))

### 📝 Documentation

* **website:** add chat special syntax reference page ([96885e2](https://github.com/SavageChieftain/udonarium_axe/commit/96885e2156f1501bb65031cdc5c4d6d4fc056ea6))
* **website:** add v1.14.0 release notes ([39cbd57](https://github.com/SavageChieftain/udonarium_axe/commit/39cbd572325bd8de53b7f77b83fc21b9dd61adab))
* **website:** describe novel mode SE jukebox sync in manual ([39f1e80](https://github.com/SavageChieftain/udonarium_axe/commit/39f1e8093991c5136447b5f6b1963ae7c2fba07e))
* **website:** describe the image-drag model in the grid adjuster manual ([495d3e2](https://github.com/SavageChieftain/udonarium_axe/commit/495d3e2a913ec862e72caddcdfb6beff43ed3d3c))
* **website:** document map maker and grid-aligned background setup ([1300698](https://github.com/SavageChieftain/udonarium_axe/commit/1300698197e1c0fbf01ad89967ca02c8f33c25da))
* **website:** document polyline, line styles, shadows and image clip ([a4393f4](https://github.com/SavageChieftain/udonarium_axe/commit/a4393f413114ac9f772ac83db6d9f2dcf56a4903))
* **website:** document texture previews, uploads and wall textures ([0c79c9b](https://github.com/SavageChieftain/udonarium_axe/commit/0c79c9bc02e24e3cde0bc673163413b124d51b14))
* **website:** document the adjuster workspace zoom ([c36e982](https://github.com/SavageChieftain/udonarium_axe/commit/c36e9822a8c16d255adf74f43cc0693070ca04af))
* **website:** document the fixed clip frame and image handles ([38e72b1](https://github.com/SavageChieftain/udonarium_axe/commit/38e72b133600e9659e581e75d532f9ed438238ee))
* **website:** document the grid-type toggle in the adjuster manual ([57e520b](https://github.com/SavageChieftain/udonarium_axe/commit/57e520bca0a728416538d2aee4480441142992d3))
* **website:** document the reworked map editor ([c2bcbc1](https://github.com/SavageChieftain/udonarium_axe/commit/c2bcbc1283310f37f80c773e2234680ac01349c8))
* **website:** sync map editor manual with curve tools ([99b6985](https://github.com/SavageChieftain/udonarium_axe/commit/99b6985cd22820ec997c2cc08b6bc38b774126b0))
* **website:** update grid adjuster manual for the rebuilt dialog ([ae15e36](https://github.com/SavageChieftain/udonarium_axe/commit/ae15e368ff6b24917fc3b43908e8a29cc22ea2c9))

### ♻️ Refactor

* **map-editor:** rename map-maker feature to map-editor ([5fb32fa](https://github.com/SavageChieftain/udonarium_axe/commit/5fb32fa4e00b177a08a4d539cd7573d67fbdb9e5))

## [1.14.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.13.0...v1.14.0) (2026-06-11)

### ✨ Features

* **chat:** restrict guest role from editing tab permissions ([0a86add](https://github.com/SavageChieftain/udonarium_axe/commit/0a86add58f2e3080f49229902761a37ca869297b))
* **visual-novel:** add visual novel mode ([c5ca1fe](https://github.com/SavageChieftain/udonarium_axe/commit/c5ca1feb5a3abe19a532f2261e208da3826beac4))
* **visual-novel:** route SE through jukebox and filter sound board to SE tag ([c94d741](https://github.com/SavageChieftain/udonarium_axe/commit/c94d7418ba47cb8ef0f42d20315b2feef44a6152))

### 🐛 Bug Fixes

* **gm-toolbar:** keep dragged position across role toggles ([3e92c2b](https://github.com/SavageChieftain/udonarium_axe/commit/3e92c2bc69d36960f8e1686306cc13ad02cda7f9))

### 📝 Documentation

* **website:** add user-facing v1.13.0 release notes ([b61d7b6](https://github.com/SavageChieftain/udonarium_axe/commit/b61d7b67be5f3b6dc33bfddbff3e7bbeab4ce03b))
* **website:** document visual novel mode ([b2943c1](https://github.com/SavageChieftain/udonarium_axe/commit/b2943c1debd6a9faaa7a9096f7aff9446c2400b5))
* **website:** note guests cannot edit chat tab permissions ([34c5ef7](https://github.com/SavageChieftain/udonarium_axe/commit/34c5ef707d67206029f0af6b877c5de7c30e7a97))

## [1.13.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.12.1...v1.13.0) (2026-06-10)

### ✨ Features

* **chat:** add per-tab view/speak permissions by role ([2e78094](https://github.com/SavageChieftain/udonarium_axe/commit/2e78094cf44e0efe6902905a84200cba6e48e04d))
* **chat:** let any participant save chat logs regardless of role ([ddcb618](https://github.com/SavageChieftain/udonarium_axe/commit/ddcb61809700fbdbb4a8f29701054bb309c09d4a))
* **disclosure:** let players claim ownership of unowned objects ([a9ee2bc](https://github.com/SavageChieftain/udonarium_axe/commit/a9ee2bc18daa18c4ad61e2edac85f3f2be486372))
* **gm-tools:** add a GM-only object list panel ([0bb9b65](https://github.com/SavageChieftain/udonarium_axe/commit/0bb9b6549fe64bf498a90430cb44004ff043915f))
* **gm-tools:** add GM toolbar with NPC bar and quick chat-palette switching ([d878620](https://github.com/SavageChieftain/udonarium_axe/commit/d8786208d64aba87c8a0b9495ef8a0042ec15a61))
* **gm-tools:** add persona preview to review the table as a player ([235cb41](https://github.com/SavageChieftain/udonarium_axe/commit/235cb41fe552bb3e65adee2aa58362f86b65e273))
* **gm-tools:** let the GM release ownership held by offline players ([be1bc52](https://github.com/SavageChieftain/udonarium_axe/commit/be1bc52b09a1634d9cdf395e55e2702604b7447d))
* **jukebox:** play, layer and stop sound effects over the BGM ([96657bc](https://github.com/SavageChieftain/udonarium_axe/commit/96657bcd96404dd6ed12629bf78536aeb04989c2))
* **peer:** add participant roles (GM / player / spectator) ([f370381](https://github.com/SavageChieftain/udonarium_axe/commit/f370381577334917587d93fca7079f675dc9eef2))
* **peer:** forbid players and guests from self-assigning the GM role ([0275646](https://github.com/SavageChieftain/udonarium_axe/commit/027564655162991232a9b96b2bcb6ddb7ffab863))
* **peer:** let anyone reclaim GM when a room has no game master ([6f18b6d](https://github.com/SavageChieftain/udonarium_axe/commit/6f18b6d75283f8db2452a0d90485c51e0589e8d2))
* **tabletop:** add 3D vision, lighting and darkness system ([66d382e](https://github.com/SavageChieftain/udonarium_axe/commit/66d382ed3ea81fa20b69ae98fb2864df3203268d))
* **tabletop:** add per-object disclosure and ownership ([3fa606e](https://github.com/SavageChieftain/udonarium_axe/commit/3fa606e359719aa2d39bcbe39b76a3a2a47a5da1))
* **tabletop:** release object ownership when loading from a save ([5e4368e](https://github.com/SavageChieftain/udonarium_axe/commit/5e4368e8be023c76609ec4ec2b95c25f0a9f5581))
* **tabletop:** show spectators the union of player vision in darkness ([9206ac3](https://github.com/SavageChieftain/udonarium_axe/commit/9206ac3bd4cc1dfcd5d37ccc6f88a2d22ee2cb7f))

### 🐛 Bug Fixes

* **controller:** guard the chat-target check against a null self cursor ([4b5c0ed](https://github.com/SavageChieftain/udonarium_axe/commit/4b5c0ed48225d3f7433048ddfff1f331ae8b078e))
* **media:** play SE-tagged cut-in audio at SE volume ([6274972](https://github.com/SavageChieftain/udonarium_axe/commit/62749720333c37246b387f12717ed1488200f132))
* **peer:** drop raw UUID from peer connection messages ([61e40de](https://github.com/SavageChieftain/udonarium_axe/commit/61e40ded251cdc45528c70f0ceebc661087d563b))
* **peer:** show the short id for unnamed peers in the peer menu ([3e04972](https://github.com/SavageChieftain/udonarium_axe/commit/3e049722867829679f142f0aa151c8a7ebee65b6))
* **tabletop:** keep room objects loadable after moving to the floor ([d8e01c0](https://github.com/SavageChieftain/udonarium_axe/commit/d8e01c06c682b33d171724b0faedc9bb9dd762ee))

### 📝 Documentation

* add user-facing v1.12.1 release notes ([32bccab](https://github.com/SavageChieftain/udonarium_axe/commit/32bccab8c9ed7abad49986b125039d0aa8955bb9))
* **website:** document darkness, vision and lighting ([49ca9c0](https://github.com/SavageChieftain/udonarium_axe/commit/49ca9c0491e03cb82ccc364a7370d55318e19cdb))
* **website:** document role, vision, jukebox SE and ownership updates ([4f1aa9a](https://github.com/SavageChieftain/udonarium_axe/commit/4f1aa9aa9ee0071ba232f7738ed8187008249717))
* **website:** document roles, disclosure, chat permissions and object list ([216da3f](https://github.com/SavageChieftain/udonarium_axe/commit/216da3f05fba8656920c9ca10887f0734bac70af))

## [1.12.1](https://github.com/SavageChieftain/udonarium_axe/compare/v1.12.0...v1.12.1) (2026-06-07)

### 🐛 Bug Fixes

* **turn-order:** announce turns to the main chat tab only ([8edd014](https://github.com/SavageChieftain/udonarium_axe/commit/8edd0145a02b2a49ee7ee4bcbc41116f171db513))
* **turn-order:** exclude inventory-hidden characters from the tracker ([c82dd37](https://github.com/SavageChieftain/udonarium_axe/commit/c82dd374ad9e47305d425dc54b4100217b1c951e))

### 📝 Documentation

* add user-facing v1.12.0 release notes ([1d536de](https://github.com/SavageChieftain/udonarium_axe/commit/1d536deb90b4a8b7be34d835d42c567af22141dc))

## [1.12.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.11.0...v1.12.0) (2026-06-05)

### ✨ Features

* **turn-order:** add synced turn-order tracker shown as a minimized inventory widget ([34e6e15](https://github.com/SavageChieftain/udonarium_axe/commit/34e6e15423e3daacb7833cdefa50cf789f7a3670))

### 🐛 Bug Fixes

* **media:** clamp mini-jukebox restore position within the viewport ([d3a3830](https://github.com/SavageChieftain/udonarium_axe/commit/d3a3830021fa3e2654989c2d12663234d7f0b9b6))
* **media:** keep mini-jukebox minimize and restore controls reachable on touch ([341ebea](https://github.com/SavageChieftain/udonarium_axe/commit/341ebea7eb869a6ae90bd03dff65baa35d43ba5e))
* **tabletop:** make table pointermove listener non-passive so preventDefault works ([89c9fcb](https://github.com/SavageChieftain/udonarium_axe/commit/89c9fcb32bb04eb6bc36284e13fad453affffd8b))

### 📝 Documentation

* add user-facing v1.11.0 release notes ([6f756e4](https://github.com/SavageChieftain/udonarium_axe/commit/6f756e478d524a5a747745d80236402ca811445e))
* **turn-order:** add turn-order manual page ([1dd623b](https://github.com/SavageChieftain/udonarium_axe/commit/1dd623b3a10df7c2e717f00bfd7bb264031828fc))

### ♻️ Refactor

* **tabletop:** reorganize table settings into aligned grouped sections ([34dc9bf](https://github.com/SavageChieftain/udonarium_axe/commit/34dc9bf42fed2124369e4a36a2a14f61f8cd9bd2))

## [1.11.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.10.1...v1.11.0) (2026-06-03)

### ✨ Features

* **tabletop:** add toggles to hide character and dice names and buffs ([98b5c0e](https://github.com/SavageChieftain/udonarium_axe/commit/98b5c0e5d9eaff3df3b71a31c49ca7443c6382a6))

### 📝 Documentation

* add user-facing v1.10.0 release notes ([c8c0395](https://github.com/SavageChieftain/udonarium_axe/commit/c8c0395b9002a0c0696e081af4d159783ab5f054))

## [1.10.1](https://github.com/SavageChieftain/udonarium_axe/compare/v1.10.0...v1.10.1) (2026-06-03)

### 🐛 Bug Fixes

* **docs:** isolate the VitePress build from the root PostCSS config ([554c5c3](https://github.com/SavageChieftain/udonarium_axe/commit/554c5c3452f882587b47c6d0118b895ae3f3bebd))

### 📝 Documentation

* add operation manual to the documentation site ([8d78dbf](https://github.com/SavageChieftain/udonarium_axe/commit/8d78dbff76fb2b0428363164e7d586fbfa9ff341))
* add VitePress documentation site with end-user quickstart guide ([5ae48d2](https://github.com/SavageChieftain/udonarium_axe/commit/5ae48d2701b26e6f127e737daf0c00c4b5cb6ae2))
* restructure the operation manual into one page per feature ([e5b85e0](https://github.com/SavageChieftain/udonarium_axe/commit/e5b85e055654601615b9c5adf07095a6d07cfc4b))
* split cards/dice/notes into separate manual pages ([119a4ee](https://github.com/SavageChieftain/udonarium_axe/commit/119a4ee0ff90aa30c439693f777aa77d3807d554))

## [1.10.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.9.0...v1.10.0) (2026-06-02)

### ✨ Features

* **chat:** follow new messages only while pinned to the bottom ([43fd470](https://github.com/SavageChieftain/udonarium_axe/commit/43fd4705bc813bb7071bfa609a6295d62ab9c488))

### 🐛 Bug Fixes

* **tabletop:** disable dragging for locked text notes ([be3d7f5](https://github.com/SavageChieftain/udonarium_axe/commit/be3d7f5f699c84f9a6df0325ef3473f69d5d8a11))

### 📝 Documentation

* **readme:** reorient README around end-user quickstart and backend setup ([0dc3184](https://github.com/SavageChieftain/udonarium_axe/commit/0dc3184f91a83dd51552a047173b7c8c6d2836f5))

## [1.9.0](https://github.com/SavageChieftain/udonarium_axe/compare/v1.8.1...v1.9.0) (2026-06-02)

### ✨ Features

* **tabletop:** make object contact stacking surface-aware ([f569b14](https://github.com/SavageChieftain/udonarium_axe/commit/f569b14feffc8ce97404af73b41ed291eef926b7))
* **tabletop:** render and place terrain on wall surfaces ([a0233d3](https://github.com/SavageChieftain/udonarium_axe/commit/a0233d30256c55344e315d5d4beb075120621059))
* **tabletop:** stack objects inward when on a wall surface ([acd425b](https://github.com/SavageChieftain/udonarium_axe/commit/acd425b3bfb8a9e798cec4ac91c6b6779d93ebff))

### 🐛 Bug Fixes

* **card:** render card stack as a flat poster on wall surfaces ([cec273d](https://github.com/SavageChieftain/udonarium_axe/commit/cec273d30b346fa76ba345091283b54d0eb54fb2))
* **dice:** restore dice image brightness with chrome-smooth-image-trick ([b19c9b6](https://github.com/SavageChieftain/udonarium_axe/commit/b19c9b691c816321472f80d18d5d70067a621882))
* **tabletop:** inset wall objects so the wall occludes them from behind ([b721aba](https://github.com/SavageChieftain/udonarium_axe/commit/b721abacb80f009e1832cc58a1507eab6dd27e39))
* **tabletop:** restore object stacking via overlap-geometry contact ([f324da8](https://github.com/SavageChieftain/udonarium_axe/commit/f324da8cf151a5a066b4f03e9e3d5023bd9c4aa2))

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
