import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@shared/ui';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { useScrollToTopOnFocus } from '@shared/lib';
import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { usePalette } from '@shared/ui/theme';
import { PostCard, type SocialPost, type SocialPostPage } from '@entities/social';

import { useBlockHandle, useDeletePost, useReportPost, useToggleKudos, useToggleSaved } from '../model/use-social-actions';
import { CommentsSheet } from './comments-sheet';
import { KudosSheet } from './kudos-sheet';
import { PostMenu } from './post-menu';
import { ShareCardSheet } from './share-card-sheet';
import { PostTile } from './post-tile';

// The grid on a profile: three squares in a row with a thin line between them.
const GRID_COLUMNS = 3;
const GRID_GAP = 2;

// A list of posts with everything a post can do: kudos, delete, report, block. Used by the feed and by a person's page, which pass their
// own query, header and empty message. layout "list" draws each post as a card (the feeds). layout "grid" draws squares, three to a row, like a
// profile page of a photo app: tapping a square opens that post as a card in the swipe-down drawer.
export function PostFeed({
  query,
  header,
  emptyTitle,
  emptyBody,
  onOpenProfile,
  bottomPadding,
  layout = 'list',
  edgeToEdge = false,
  fullWidth = false,
}: {
  query: UseInfiniteQueryResult<InfiniteData<SocialPostPage, unknown>, Error>;
  header?: ReactElement;
  emptyTitle: string;
  emptyBody: string;
  onOpenProfile?: (handle: string) => void;
  bottomPadding: number;
  layout?: 'list' | 'grid' | 'bento';
  // true: the list has no side padding of its own, so the header can fill the width and keep it when the layout changes. Cards then get their
  // own side padding. Used by the profile, whose tabs switch between a grid and cards: the header must not change size with them.
  edgeToEdge?: boolean;
  // true: the post cards touch both sides of the screen (no side padding, no side border or rounded corners). The header keeps its own padding.
  fullWidth?: boolean;
}) {
  const p = usePalette();
  const scrollRef = useRef<FlatList>(null);
  useScrollToTopOnFocus(scrollRef);
  const toggleKudos = useToggleKudos();
  const toggleSaved = useToggleSaved();
  const remove = useDeletePost();
  const report = useReportPost();
  const block = useBlockHandle();
  const [menuPost, setMenuPost] = useState<SocialPost | null>(null);
  const [kudosPost, setKudosPost] = useState<SocialPost | null>(null);
  const [commentsId, setCommentsId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SocialPost | null>(null);
  const [blocking, setBlocking] = useState<SocialPost | null>(null);
  // The post open in the drawer (grid layout), and how wide the list is, so the squares fill the row exactly.
  const [openId, setOpenId] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(0);

  // Share opens a card of the post (the handle, the words, the photo, the topic and the stamp) to share as a picture. The drawer closes first, because
  // one drawer cannot open on top of another on every phone.
  const [sharing, setSharing] = useState<SocialPost | null>(null);
  const sharePost = (post: SocialPost) => {
    setOpenId(null);
    setSharing(post);
  };

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const grid = layout === 'grid';
  const bento = layout === 'bento';
  const tiled = grid || bento;
  const tileSize = listWidth > 0 ? Math.floor((listWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS) : 0;
  // Bento: the posts in groups of three. In each group one big tile (two squares wide and high) sits beside two small ones stacked; the big tile
  // swaps sides from one group to the next.
  const groups: SocialPost[][] = [];
  if (bento) for (let i = 0; i < items.length; i += 3) groups.push(items.slice(i, i + 3));
  // Looked up in the list each time, so a kudos or a delete shows in the open post at once.
  // The post whose comments are open, looked up in the list each time, so its comment count is always the current one.
  const commentsPost = commentsId ? (items.find((post) => post.id === commentsId) ?? null) : null;
  const openPost = openId ? (items.find((post) => post.id === openId) ?? null) : null;

  // The posts are never left stale: they load again whenever the screen comes back into view (after a post, a kudos, a friend request elsewhere),
  // and the person can pull down to load them again.
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else void queryRef.current.refetch();
    }, []),
  );
  const pullRefresh = usePullToRefresh(() => queryRef.current.refetch());

  return (
    <>
      <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
      <RefreshingBar active={query.isFetching && !query.isFetchingNextPage && items.length > 0} />
      <FlatList
        ref={scrollRef}
        key={layout}
        {...pullRefresh.listProps}
        {...pullRefresh.touch}
        onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}
        numColumns={grid ? GRID_COLUMNS : 1}
        columnWrapperStyle={grid ? { gap: GRID_GAP } : undefined}
        data={(bento ? groups : items) as SocialPost[] & SocialPost[][]}
        keyExtractor={(entry: SocialPost | SocialPost[]) => (Array.isArray(entry) ? (entry[0]?.id ?? 'group') : entry.id)}
        ListHeaderComponent={header && fullWidth ? <View style={styles.cardPad}>{header}</View> : header}
        contentContainerStyle={[tiled || edgeToEdge || fullWidth ? styles.grid : styles.list, { paddingBottom: bottomPadding }]}
        ItemSeparatorComponent={() => <View style={{ height: tiled ? GRID_GAP : 16 }} />}
        // Lazy: only a few posts are drawn at first and a few more as the list is scrolled, so the photos of posts far down are not
        // requested until they are near the screen.
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        renderItem={({ item, index }: { item: SocialPost | SocialPost[]; index: number }) =>
          Array.isArray(item) ? (
            tileSize > 0 ? <BentoGroup posts={item} unit={tileSize} flip={index % 2 === 1} compact={item.length < 3 && !query.hasNextPage} onOpen={(post) => setOpenId(post.id)} /> : null
          ) : grid ? (
            tileSize > 0 ? <PostTile post={item} size={tileSize} onPress={(post) => setOpenId(post.id)} /> : null
          ) : (
            <View style={edgeToEdge && !fullWidth ? styles.cardPad : undefined}>
              <PostCard flush={fullWidth} post={item} onComments={(post) => setCommentsId(post.id)} onKudos={toggleKudos} onShare={sharePost} onKudosList={setKudosPost} onMenu={setMenuPost} onSave={toggleSaved} onOpenProfile={onOpenProfile} />
            </View>
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
          ) : query.isError ? (
            <Text style={[styles.emptyBody, { color: p.muted }]}>Could not load posts. Pull down to try again.</Text>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: p.text }]}>{emptyTitle}</Text>
              <Text style={[styles.emptyBody, { color: p.muted }]}>{emptyBody}</Text>
            </View>
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : undefined}
      />

      {/* Grid layout: the tapped post, as a full card in the swipe-down drawer. Its kudos, share and menu work as in the feed. */}
      <BottomSheet visible={tiled && openPost !== null} onClose={() => setOpenId(null)} dragHandleOnly>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {openPost ? (
            <PostCard
              post={openPost}
              onSave={toggleSaved}
              onComments={(post) => {
                setOpenId(null);
                setCommentsId(post.id);
              }}
              onKudos={toggleKudos}
              onShare={sharePost}
              // A second drawer or dialog cannot open on top of this one on every phone, so this one closes first.
              onKudosList={(post) => {
                setOpenId(null);
                setKudosPost(post);
              }}
              onMenu={(post) => {
                setOpenId(null);
                setMenuPost(post);
              }}
              onOpenProfile={(handle) => {
                setOpenId(null);
                onOpenProfile?.(handle);
              }}
            />
          ) : null}
        </ScrollView>
      </BottomSheet>

      <ShareCardSheet card={sharing ? { kind: 'post', post: sharing } : null} onClose={() => setSharing(null)} />
      <CommentsSheet post={commentsPost} onClose={() => setCommentsId(null)} onOpenProfile={onOpenProfile} />
      <KudosSheet post={kudosPost} onClose={() => setKudosPost(null)} onOpenProfile={onOpenProfile} />
      <PostMenu
        post={menuPost}
        onClose={() => setMenuPost(null)}
        onDelete={setDeleting}
        onReport={(post, reason) => report.mutate({ post, reason })}
        onBlock={setBlocking}
      />
      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this post?"
        message="The post and its photo are removed for everyone."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting, { onSettled: () => setDeleting(null) });
        }}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        visible={blocking !== null}
        title={blocking ? `Block @${blocking.handle}?` : ''}
        message="You will not see each other's posts or profiles, and any friendship or request between you ends. You can unblock from their profile."
        confirmLabel="Block"
        busy={block.isPending}
        onConfirm={() => {
          if (blocking) block.mutate({ handle: blocking.handle, block: true }, { onSettled: () => setBlocking(null) });
        }}
        onCancel={() => setBlocking(null)}
      />
    </>
  );
}

// One bento group: a big tile (two units wide and high) with two small tiles stacked beside it. With fewer than three posts the missing tiles are
// left empty (while more posts are still to load). compact: the end of the list with fewer than three posts, shown as small squares. flip puts the big tile on the right.
function BentoGroup({ posts, unit, flip, compact, onOpen }: { posts: SocialPost[]; unit: number; flip: boolean; compact: boolean; onOpen: (post: SocialPost) => void }) {
  // The last group of the whole list, with one or two posts: they are shown as small squares in a row, not stretched into a big tile.
  if (compact) {
    return (
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        {posts.map((post) => (
          <PostTile key={post.id} post={post} size={unit} onPress={onOpen} />
        ))}
      </View>
    );
  }
  const [big, a, b] = posts;
  const bigSize = unit * 2 + GRID_GAP;
  const bigTile = big ? <PostTile post={big} size={bigSize} onPress={onOpen} /> : null;
  const small = (
    <View style={{ gap: GRID_GAP }}>
      {a ? <PostTile post={a} size={unit} onPress={onOpen} /> : <View style={{ width: unit, height: unit }} />}
      {b ? <PostTile post={b} size={unit} onPress={onOpen} /> : <View style={{ width: unit, height: unit }} />}
    </View>
  );
  return <View style={{ flexDirection: 'row', gap: GRID_GAP }}>{flip ? <>{small}{bigTile}</> : <>{bigTile}{small}</>}</View>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, flexGrow: 1 },
  grid: { flexGrow: 1 },
  cardPad: { paddingHorizontal: 16 },
  sheetScroll: { maxHeight: 560 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 6, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
