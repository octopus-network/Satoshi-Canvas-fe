export function shortenErrorMessage(msg: string, maxLength = 100): string {
  if (!msg) return "";
  if (msg.length <= maxLength) return msg;

  const headLength = Math.floor(maxLength / 2);
  const tailLength = maxLength - headLength - 3; // 减去 '...'

  return msg.slice(0, headLength) + "..." + msg.slice(msg.length - tailLength);
}
