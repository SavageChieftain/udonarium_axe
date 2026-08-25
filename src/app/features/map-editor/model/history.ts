import { EditHistory } from '@axe/core/util/edit-history';
import { cloneScene, MapScene } from '@axe/features/map-editor/model/scene';

export class SceneHistory extends EditHistory<MapScene> {
  constructor(initial: MapScene, limit = 50) {
    super(initial, cloneScene, limit);
  }
}
