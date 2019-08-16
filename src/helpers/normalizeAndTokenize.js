
export default function normalizeAndTokenizeText(text) {
  return text.replace(/[.,?!;()"'-]/g, ' ')
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .split(' ');
}