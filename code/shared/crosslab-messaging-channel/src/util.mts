export function replacer(key: string, value: unknown) {
  if (value instanceof Uint8Array) {
    return {
      type: "Uint8Array",
      data: Array.from(value),
    };
  }
  return value;
}

export function reviver(key: string, value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    (value.type === "Uint8Array" || value.type === "Buffer")
  ) {
    return Uint8Array.from(
      "data" in value && Array.isArray(value.data) ? value.data : []
    );
  }
  return value;
}
