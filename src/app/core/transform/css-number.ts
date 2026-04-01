function relation(value: string | number | null | undefined, relativeSize: number, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    value = value.trim().toLowerCase();
    if (value.endsWith('%')) return (parse(value.replace('%', ''), defaultValue) / 100) * relativeSize;
    else if (value.endsWith('px')) return parse(value.replace('px', ''), defaultValue);
    else if (value.endsWith('pt')) return parse(value.replace('pt', ''), defaultValue);
    else if (value.endsWith('vw')) return (parse(value.replace('vw', ''), defaultValue) / 100) * window.innerWidth;
    else if (value.endsWith('vh')) return (parse(value.replace('vh', ''), defaultValue) / 100) * window.innerHeight;
    else if (value.endsWith('vm'))
      return (parse(value.replace('vm', ''), defaultValue) / 100) * Math.min(window.innerWidth, window.innerHeight);
    else if (value.endsWith('em')) return parse(value.replace('em', ''), defaultValue);
    else if (value === 'top' || value === 'left') return 0;
    else if (value === 'center' || value === 'middle') return relativeSize * 0.5;
    else if (value === 'bottom' || value === 'right') return relativeSize;
    return defaultValue;
  }
  return defaultValue;
}

function parse(value: string | null | undefined, defaultValue: number = 0): number {
  const num = parseFloat(value as string);
  if (isNaN(num)) return defaultValue;
  return num;
}

export const CSSNumber = { relation, parse };
