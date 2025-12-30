import { Signature } from '@/types/comic';

interface ComicWithSignatures {
  signatures?: Signature[] | unknown;
  isSigned?: boolean;
  signedBy?: string;
}

/**
 * Get all signer names from a comic, handling both modern signatures array
 * and legacy single-signature fields.
 */
export function getSignerNames(comic: ComicWithSignatures): string[] {
  // Check modern signatures array first
  if (comic.signatures && Array.isArray(comic.signatures) && comic.signatures.length > 0) {
    return (comic.signatures as Signature[])
      .map(s => s.signedBy)
      .filter((name): name is string => Boolean(name && name.trim()));
  }
  
  // Fall back to legacy fields
  if (comic.isSigned && comic.signedBy && comic.signedBy.trim()) {
    return [comic.signedBy.trim()];
  }
  
  return [];
}

/**
 * Check if a comic has any signatures
 */
export function hasSigner(comic: ComicWithSignatures): boolean {
  return getSignerNames(comic).length > 0;
}
