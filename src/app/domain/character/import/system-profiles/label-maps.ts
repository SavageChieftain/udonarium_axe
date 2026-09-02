type LabelMaps = Record<string, Record<string, string>>;

const NO_LABELS: Record<string, string> = {};
let charasheet: LabelMaps = {};
let appspot: LabelMaps = {};
let loading: Promise<void> | null = null;

export function loadLabelMaps(): Promise<void> {
  loading ??= Promise.all([
    import('@axe/domain/character/import/charasheet-label-maps.generated'),
    import('@axe/domain/character/import/appspot-label-maps.generated'),
  ]).then(([sheet, warehouse]) => {
    charasheet = sheet.CHARASHEET_LABEL_MAPS;
    appspot = warehouse.APPSPOT_LABEL_MAPS;
  });
  return loading;
}

export function charasheetLabelMap(game: string): Record<string, string> {
  return charasheet[game] ?? NO_LABELS;
}

export function appspotLabelMap(slug: string): Record<string, string> {
  return appspot[slug] ?? NO_LABELS;
}
