export { ProfileMenu } from './ui/profile-menu';
export { AddProfileSheet } from './ui/add-profile-sheet';
export {
  useAccountProfiles,
  useIsFamilyView,
  useActiveProfile,
  useOwnProfile,
  useSwitchProfile,
  useConfirmAccountHolder,
  useLinkChild,
  failureOf,
  ADD_PROFILE_FAILURE_TEXT,
} from './model/use-profile-switch';
export type { AccountProfile } from './model/profile-switch.api';
export { FamilyViewBanner } from './ui/family-view-banner';
export { FamilySwitchBackDock } from './ui/family-switch-back-dock';
export { TABS_GENERATION_KEY, startFreshTabs } from './model/tabs-generation';
