import { Header } from './header';
import { getUserProfile } from '@/lib/actions/auth';

export async function HeaderAuthSlot() {
  let profile = null;
  try {
    profile = await getUserProfile();
  } catch {
    // Anonymous viewer — Header renders without user.
  }
  return <Header user={profile} />;
}
