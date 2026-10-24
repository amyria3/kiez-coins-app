import { IconStyleProvider } from '../../components/icons/iconStyle';
import FeedScreen from '../feed';

/** Test (Daria, 24.10.2026): der Feed mit Font Awesome Solid, alles gefüllt */
export default function IconTestFeed() {
  return (
    <IconStyleProvider value="solid">
      <FeedScreen />
    </IconStyleProvider>
  );
}
