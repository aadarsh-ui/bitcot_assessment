export function isGoneException(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "GoneException") return true;

  const metadata = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata;
  return metadata?.httpStatusCode === 410;
}
