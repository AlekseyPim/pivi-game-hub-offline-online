import { useAdFreeStore } from '@/shared/store/adFreeStore';
import { useSupporterStore } from '@/shared/store/supporterStore';

/**
 * True when ads must be hidden for this device. Two independent reasons:
 *  - the user is a supporter (bought a coffee), or
 *  - the user entered the secret unlock code (ad-free only, no perks).
 */
export function useAdsDisabled(): boolean {
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const adFree = useAdFreeStore((s) => s.adFree);
  return isSupporter || adFree;
}
