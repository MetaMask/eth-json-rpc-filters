export function minBlockRef(...refs: string[]): string {
  const sortedRefs = sortBlockRefs(refs);
  return sortedRefs[0] as string;
}

export function maxBlockRef(...refs: string[]): string {
  const sortedRefs = sortBlockRefs(refs);
  return sortedRefs[sortedRefs.length - 1] as string;
}

export function sortBlockRefs(refs: string[]): string[] {
  return refs.sort((refA, refB) => {
    if (refA === 'latest' || refB === 'earliest') {
      return 1;
    }
    if (refB === 'latest' || refA === 'earliest') {
      return -1;
    }
    return hexToInt(refA) - hexToInt(refB);
  });
}

export function bnToHex(bn: { toString(radix: number): string }): string {
  return `0x${bn.toString(16)}`;
}

export function blockRefIsNumber(blockRef?: string | null): boolean {
  return Boolean(blockRef) && !['earliest', 'latest', 'pending'].includes(blockRef as string);
}

export function hexToInt(hexString: string): number;
export function hexToInt(hexString: null | undefined): null | undefined;
export function hexToInt(
  hexString: string | null | undefined,
): number | null | undefined;
export function hexToInt(
  hexString: string | null | undefined,
): number | null | undefined {
  if (hexString === undefined || hexString === null) {
    return hexString;
  }
  return Number.parseInt(hexString, 16);
}

export function incrementHexInt(hexString: string): string;
export function incrementHexInt(hexString: null | undefined): null | undefined;
export function incrementHexInt(
  hexString: string | null | undefined,
): string | null | undefined;
export function incrementHexInt(
  hexString: string | null | undefined,
): string | null | undefined {
  if (hexString === undefined || hexString === null) {
    return hexString;
  }
  const value = hexToInt(hexString);
  return intToHex(value + 1);
}

export function intToHex(int: number): string;
export function intToHex(int: null | undefined): null | undefined;
export function intToHex(int: number | null | undefined): string | null | undefined;
export function intToHex(
  int: number | null | undefined,
): string | null | undefined {
  if (int === undefined || int === null) {
    return int;
  }
  let hexString = int.toString(16);
  const needsLeftPad = hexString.length % 2;
  if (needsLeftPad) {
    hexString = `0${hexString}`;
  }
  return `0x${hexString}`;
}

export function unsafeRandomBytes(byteCount: number): string {
  let result = '0x';
  for (let i = 0; i < byteCount; i++) {
    result += unsafeRandomNibble();
    result += unsafeRandomNibble();
  }
  return result;
}

function unsafeRandomNibble(): string {
  return Math.floor(Math.random() * 16).toString(16);
}
