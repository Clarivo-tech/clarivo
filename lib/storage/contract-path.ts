/** Storage object path inside the contracts bucket (e.g. userId/file.pdf). */
export function getContractStoragePath(contract: {
  storage_path?: string | null;
  file_url?: string | null;
}): string | null {
  if (contract.storage_path) {
    return contract.storage_path;
  }

  if (!contract.file_url) {
    return null;
  }

  try {
    const url = new URL(contract.file_url);
    const publicMatch = url.pathname.match(
      /\/storage\/v1\/object\/public\/contracts\/(.+)$/
    );
    if (publicMatch?.[1]) {
      return decodeURIComponent(publicMatch[1]);
    }

    const signedMatch = url.pathname.match(
      /\/storage\/v1\/object\/sign\/contracts\/(.+)$/
    );
    if (signedMatch?.[1]) {
      return decodeURIComponent(signedMatch[1].split("?")[0]);
    }
  } catch {
    return null;
  }

  return null;
}
