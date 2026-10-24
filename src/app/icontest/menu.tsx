import { IconStyleProvider } from '../../components/icons/iconStyle';
import Account from '../account';

/** Test (Daria, 24.10.2026): das Konto-Menü mit Font Awesome Solid, alles gefüllt */
export default function IconTestMenu() {
  return (
    <IconStyleProvider value="solid">
      <Account />
    </IconStyleProvider>
  );
}
