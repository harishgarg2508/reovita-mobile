import type { Href } from 'expo-router';

// The social home. The typed route list only knows it as ".../social/index", which the browser address bar would show as /social/index
// (and read as a person's handle). The plain path /social opens the index screen, so it is used everywhere.
export const SOCIAL_HOME = '/social' as Href;

// A social screen by its plain path. The typed route list does not know these paths, so they are cast once, here.
export const socialRoute = (path: '/social/compose' | '/social/search' | '/social/activity' | '/social/kudos' | '/social/requests' | '/social/blocked' | '/social/saved' | '/social/quests' | '/social/pods' | '/social/journeys' | '/social/settings'): Href => path as Href;

export function socialFriendsHref(handle: string): Href {
  return { pathname: '/(app)/social/friends', params: { handle } } as Href;
}

export function socialPodHref(id: string): Href {
  return { pathname: '/(app)/social/pods/[id]', params: { id } } as Href;
}

export function socialJourneyHref(id: string): Href {
  return { pathname: '/(app)/social/journeys/[id]', params: { id } } as Href;
}

export function socialProfileHref(handle: string): Href {
  return { pathname: '/(app)/social/u/[handle]', params: { handle } } as Href;
}
