/**
 * One token per add-pin flow. Autocomplete requests that end in a Details call
 * with the same token are billed as one session, which makes the typing free.
 *
 * Google asks for a UUIDv4. The token is a billing grouping, not a secret, so
 * Math.random is enough and saves a crypto dependency.
 */
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
