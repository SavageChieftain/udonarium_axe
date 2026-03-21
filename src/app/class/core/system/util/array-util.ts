export namespace ArrayUtil {
  export function diff<T>(array1: T[], array2: T[]): { diff1: T[]; diff2: T[] } {
    const diff1: T[] = [];
    const diff2: T[] = [];

    let includesInArray1: boolean;
    let includesInArray2: boolean;

    for (const item of array1.concat(array2)) {
      includesInArray1 = array1.includes(item);
      includesInArray2 = array2.includes(item);
      if (includesInArray1 && !includesInArray2) {
        diff1.push(item);
      } else if (!includesInArray1 && includesInArray2) {
        diff2.push(item);
      }
    }
    return { diff1: diff1, diff2: diff2 };
  }
}
