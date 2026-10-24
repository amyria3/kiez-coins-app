import { color, font, isFashionable } from '../theme/tokens';
import { Text } from './T';

/** @-Namen und die Marken #vorher/#nachher in color/accent/signal hervorheben (verschachteltes Text). */
export function WithMentions({ value }: { value: string }) {
  const parts = value.split(/(@[\p{L}\p{N}_]+|#vorher\b|#nachher\b)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: color.accent.signal }}>
            {part}
          </Text>
        ) : part === '#vorher' || part === '#nachher' ? (
          <Text key={i} style={{ color: color.accent.signal, fontFamily: isFashionable ? font.semiBold : font.medium }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}
