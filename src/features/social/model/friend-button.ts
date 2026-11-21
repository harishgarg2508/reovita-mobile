// Friendship starts with a friend request that the other person accepts. The friend button has three states, and one tap does a different thing
// in each:
//   Add friend   not friends, nothing asked yet   -> send a request
//   Sent         a request is waiting             -> take it back
//   Unfriend     they accepted                    -> remove the friend
export interface FriendState {
  is_friend: boolean;
  requested?: boolean;
}

export const friendLabel = (p: FriendState): string => (p.is_friend ? 'Unfriend' : p.requested ? 'Sent' : 'Add friend');

// True for the two quiet states, shown as an outlined button. Only Add friend is a filled green button.
export const friendIsQuiet = (p: FriendState): boolean => p.is_friend || !!p.requested;

// What a tap on the button sends to the hook.
export const friendTap = (p: FriendState & { handle: string }) => ({
  handle: p.handle,
  add: !p.is_friend && !p.requested,
  requested: !!p.requested && !p.is_friend,
});
