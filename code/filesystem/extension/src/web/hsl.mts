function toHex(number: number, minLength: number = 0) {
  return number.toString(16).padStart(minLength, "0");
}

export function hsvToHex(
  hue: number,
  saturation: number,
  value: number
): string {
  if (hue < 0 || hue > 360) {
    throw new Error(`Invalid value for hue: ${hue}!`);
  }

  if (saturation < 0 || saturation > 1) {
    throw new Error(`Invalid value for saturation: ${saturation}!`);
  }

  if (value < 0 || value > 1) {
    throw new Error(`Invalid value for lightness: ${value}!`);
  }

  const hi = Math.floor(hue / 60);
  const f = hue / 60 - hi;
  const p = value * (1 - saturation);
  const q = value * (1 - saturation * f);
  const t = value * (1 - saturation * (1 - f));

  switch (hi) {
    case 1: {
      const red = toHex(Math.round(q * 255), 2);
      const green = toHex(Math.round(value * 255), 2);
      const blue = toHex(Math.round(p * 255), 2);
      return `#${red}${green}${blue}`;
    }
    case 2: {
      const red = toHex(Math.round(p * 255), 2);
      const green = toHex(Math.round(value * 255), 2);
      const blue = toHex(Math.round(t * 255), 2);
      return `#${red}${green}${blue}`;
    }
    case 3: {
      const red = toHex(Math.round(p * 255), 2);
      const green = toHex(Math.round(q * 255), 2);
      const blue = toHex(Math.round(value * 255), 2);
      return `#${red}${green}${blue}`;
    }
    case 4: {
      const red = toHex(Math.round(t * 255), 2);
      const green = toHex(Math.round(p * 255), 2);
      const blue = toHex(Math.round(value * 255), 2);
      return `#${red}${green}${blue}`;
    }
    case 5: {
      const red = toHex(Math.round(value * 255), 2);
      const green = toHex(Math.round(p * 255), 2);
      const blue = toHex(Math.round(q * 255), 2);
      return `#${red}${green}${blue}`;
    }
    default: {
      const red = toHex(Math.round(value * 255), 2);
      const green = toHex(Math.round(t * 255), 2);
      const blue = toHex(Math.round(p * 255), 2);
      return `#${red}${green}${blue}`;
    }
  }
}
