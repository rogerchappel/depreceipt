import { homedir } from "node:os";
import { relative, resolve } from "node:path";

export function displayPath(path: string, cwd: string): string {
  const absolute = resolve(cwd, path);
  const relativePath = relative(cwd, absolute);
  if (relativePath && !relativePath.startsWith("..")) {
    return relativePath;
  }

  return redactHome(absolute);
}

export function redactHome(value: string): string {
  const home = homedir();
  if (!home || !value.startsWith(home)) {
    return value;
  }

  return value.replace(home, "~");
}
