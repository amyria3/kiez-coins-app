import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path } from 'react-native-svg';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { BadgeKind } from '../data/badges';

// Szenen „Badge Received“ nach Darias Vorlagen (Übergabe/Animationen, 02.11.2026), Fläche 870 × 819.
// Native: zwei Videos (Einstieg einmal, dann nahtlose Schleife von 25,6 s), ausgeschnitten auf die Scheibe.
// Web: die SVG selbst aus public/animations (online unter /app/animations), sie läuft im Browser und ist außerhalb der Scheibe durchsichtig.
const W = 870;
const H = 819;

const VIDEOS: Record<BadgeKind, { einstieg: number; schleife: number }> = {
  pionier: { einstieg: require('../../assets/abzeichen/pionier-einstieg.mp4'), schleife: require('../../assets/abzeichen/pionier-schleife.mp4') },
  lotse: { einstieg: require('../../assets/abzeichen/lotse-einstieg.mp4'), schleife: require('../../assets/abzeichen/lotse-schleife.mp4') },
  anfuehrer: { einstieg: require('../../assets/abzeichen/anfuehrer-einstieg.mp4'), schleife: require('../../assets/abzeichen/anfuehrer-schleife.mp4') },
  seebaer: { einstieg: require('../../assets/abzeichen/seebaer-einstieg.mp4'), schleife: require('../../assets/abzeichen/seebaer-schleife.mp4') },
  macher: { einstieg: require('../../assets/abzeichen/macher-einstieg.mp4'), schleife: require('../../assets/abzeichen/macher-schleife.mp4') },
};

// Umriss der Scheibe je Szene, aus der Durchsichtigkeit von Darias Himmelsbild
const SCHEIBE: Record<BadgeKind, string> = {
  pionier:
    'M455 799 395 799 313 780 237 759 203 745 183 735 168 723 131 688 80 622 68 603 56 575 46 537 34 465 32 402 32 381 37 343 38 295 40 281 45 265 64 222 75 192 79 184 86 176 165 111 196 82 230 59 265 40 307 22 335 14 347 11 385 8 434 0 446 -0 476 0 500 2 541 9 579 20 626 40 645 50 666 66 718 110 741 132 757 152 784 192 798 218 808 246 818 281 832 405 831 447 828 468 820 503 809 540 799 562 777 605 757 636 737 660 703 689 677 715 662 728 625 753 607 762 582 774 555 784 536 788Z',
  lotse:
    'M456 799 393 799 313 780 234 758 199 744 181 734 167 722 129 687 94 641 76 617 64 594 57 577 47 543 36 472 32 404 33 374 38 334 38 292 40 279 45 265 64 223 76 191 80 183 87 175 166 110 197 81 231 58 269 39 304 23 339 13 396 6 434 0 452 -0 476 0 499 2 523 6 549 11 583 22 628 40 648 53 674 72 722 114 743 134 758 153 784 193 798 221 809 250 818 282 832 410 830 452 828 470 820 502 808 540 800 559 776 607 755 638 737 659 704 689 666 725 631 749 610 761 575 777 552 785 536 788Z',
  anfuehrer:
    'M455 799 395 799 313 780 237 759 203 745 183 735 168 723 131 688 80 622 68 603 58 581 52 563 47 540 35 468 32 399 33 375 37 344 38 298 40 279 44 268 63 224 75 192 79 185 87 175 168 108 197 80 228 60 265 40 304 23 337 13 434 0 446 -0 476 0 500 2 545 10 588 23 628 40 647 52 667 67 716 108 744 134 760 155 784 192 798 218 808 246 818 281 832 405 831 447 828 468 820 503 809 540 799 562 777 605 757 636 737 660 703 689 677 715 662 728 625 753 607 762 582 774 555 784 536 788Z',
  seebaer:
    'M456 799 393 799 313 780 234 758 199 744 181 734 167 722 129 687 94 641 76 617 64 594 57 577 47 543 36 472 32 404 33 374 38 334 38 292 40 279 45 265 64 223 76 191 80 183 87 175 166 110 197 81 231 58 269 39 304 23 339 13 396 6 434 0 452 -0 476 0 499 2 523 6 549 11 583 22 628 40 648 53 674 72 722 114 743 134 758 153 784 193 798 221 809 250 818 282 832 410 830 452 828 470 820 504 809 539 801 556 777 605 757 636 736 660 704 688 681 712 664 726 630 750 610 761 573 778 552 785 531 789Z',
  macher:
    'M455 799 395 799 313 780 237 759 203 745 183 735 168 723 131 688 81 624 68 603 58 581 52 563 47 540 35 468 32 399 33 375 37 344 38 298 40 279 44 268 63 224 75 192 79 185 87 175 168 108 197 80 228 60 265 40 304 23 337 13 434 0 446 -0 476 0 500 2 545 10 588 23 628 40 647 52 667 67 716 108 744 134 760 155 784 192 799 223 808 246 818 280 832 408 830 453 828 470 822 498 810 537 802 556 778 604 756 637 737 660 705 688 676 716 664 727 633 748 610 761 580 775 553 784 536 788Z',
};

export function BadgeScene({ kind, width }: { kind: BadgeKind; width: number }) {
  const height = (width * H) / W;
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: `/app/animations/${kind}.svg` }}
        style={{ width, height }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <SceneVideo kind={kind} width={width} height={height} />;
}

function SceneVideo({ kind, width, height }: { kind: BadgeKind; width: number; height: number }) {
  const [still, setStill] = useState(false);
  const [schleife, setSchleife] = useState(false);
  const einstieg = useVideoPlayer(VIDEOS[kind].einstieg, (p) => {
    p.loop = false;
    p.muted = true;
  });
  const dauer = useVideoPlayer(VIDEOS[kind].schleife, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);

  useEffect(() => {
    // Bei „Bewegung reduzieren“ steht das erste Bild der Schleife: Abzeichen mit Lichtrand und Strahlen
    if (still) {
      setSchleife(true);
      return;
    }
    const sub = einstieg.addListener('playToEnd', () => {
      dauer.play();
      setSchleife(true);
    });
    einstieg.play();
    return () => sub.remove();
  }, [still, einstieg, dauer]);

  const flaeche = { position: 'absolute' as const, left: 0, top: 0, width, height };
  return (
    <MaskedView
      style={{ width, height }}
      maskElement={
        <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
          <Path d={SCHEIBE[kind]} fill="#000" />
        </Svg>
      }
    >
      {/* Die Schleife liegt unten bereit; ihr erstes Bild ist das letzte des Einstiegs */}
      <VideoView player={dauer} style={flaeche} contentFit="fill" nativeControls={false} playsInline surfaceType="textureView" useExoShutter={false} allowsPictureInPicture={false} />
      {schleife ? null : (
        <VideoView player={einstieg} style={flaeche} contentFit="fill" nativeControls={false} playsInline surfaceType="textureView" useExoShutter={false} allowsPictureInPicture={false} />
      )}
    </MaskedView>
  );
}
