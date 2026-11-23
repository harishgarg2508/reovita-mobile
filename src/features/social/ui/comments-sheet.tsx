import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmDialog } from '@shared/ui';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { REPORT_REASONS, SocialAvatar, useSocialComments, useSocialReplies, type SocialComment, type SocialPost } from '@entities/social';

import { useAddComment, useDeleteComment, useReportComment, useToggleCommentLike } from '../model/use-social-actions';

// The same as the server's limit for one comment.
const MAX_CHARS = 300;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// The comment being answered: the box at the bottom says who, and the reply is sent with it.
interface ReplyTarget {
  // The comment answered (a top comment, or a reply in a thread).
  id: string;
  // The comment at the top of its thread, whose replies are shown after the reply is sent.
  rootId: string;
  handle: string;
}

// The comments of one post, in the swipe-down bottom drawer: newest first, a page at a time as the list is scrolled, with a box to write a new one.
// Each comment can be answered. Its replies are one level deep: "View N replies" opens the thread under it (oldest first, a page at a time), and a
// reply to a reply stays in the same thread. A comment can be deleted by its author and by the author of the post (a top comment takes its
// replies with it), and reported by anyone else.
export function CommentsSheet({ post, onClose, onOpenProfile }: { post: SocialPost | null; onClose: () => void; onOpenProfile?: (handle: string) => void }) {
  const p = usePalette();
  const postId = post?.id ?? '';
  const list = useSocialComments(postId, post !== null);
  const add = useAddComment(postId);
  const remove = useDeleteComment(postId);
  const report = useReportComment(postId);
  const toggleLike = useToggleCommentLike();
  // The comment being reported: the drawer then asks for the reason, like the menu of a post.
  const [reporting, setReporting] = useState<SocialComment | null>(null);
  // The comment waiting for "Are you sure?" before it is deleted.
  const [deleting, setDeleting] = useState<SocialComment | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  // The threads that are open (by the id of the comment at their top).
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const comments = list.data?.pages.flatMap((page) => page.items) ?? [];
  const clean = text.trim();

  function close() {
    setReporting(null);
    setDeleting(null);
    setReplyTo(null);
    setOpen(new Set());
    setText('');
    add.reset();
    onClose();
  }

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    if (!clean || add.isPending) return;
    const target = replyTo;
    add.mutate(
      { body: clean, parentId: target?.id },
      {
        onSuccess: () => {
          setText('');
          setReplyTo(null);
          // The thread the reply went to opens, so the person sees it.
          if (target) setOpen((current) => new Set(current).add(target.rootId));
        },
      },
    );
  }

  function visit(comment: SocialComment) {
    close();
    onOpenProfile?.(comment.handle);
  }

  function answer(comment: SocialComment) {
    setReplyTo({ id: comment.id, rootId: comment.parent_id ?? comment.id, handle: comment.handle });
  }

  const actions = { onOpenProfile: visit, onReply: answer, onReport: setReporting, onDelete: setDeleting, onLike: toggleLike };

  return (
    <>
      <BottomSheet visible={post !== null && deleting === null} onClose={close} dragHandleOnly>
        {reporting ? (
          <View>
            <Text style={[styles.title, { color: p.text }]}>Why are you reporting this comment?</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason.value}
                accessibilityRole="button"
                onPress={() => {
                  report.mutate({ id: reporting.id, reason: reason.value });
                  setReporting(null);
                }}
                style={styles.reasonRow}>
                <Text style={[styles.reasonText, { color: p.text }]}>{reason.label}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setReporting(null)} style={styles.reasonRow}>
              <Text style={[styles.reasonText, { color: p.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: p.text }]}>
              Comments{post ? <Text style={{ color: p.muted, fontFamily: 'Poppins_400Regular' }}>{`  ${post.comments_count}`}</Text> : null}
            </Text>

            {replyTo ? (
              <View style={[styles.replyingTo, { backgroundColor: p.accentSoft }]}>
                <Text numberOfLines={1} style={[styles.replyingText, { color: p.text }]}>
                  Replying to <Text style={styles.name}>@{replyTo.handle}</Text>
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={p.muted} />
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.inputRow, { backgroundColor: p.input, borderColor: add.isError ? p.red : p.border }]}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  add.reset();
                  setText(v.slice(0, MAX_CHARS));
                }}
                maxLength={MAX_CHARS}
                multiline
                placeholder={replyTo ? `Reply to @${replyTo.handle}` : 'Add a comment'}
                placeholderTextColor={p.muted}
                style={[styles.input, { color: p.text }]}
                accessibilityLabel={replyTo ? 'Write a reply' : 'Add a comment'}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={replyTo ? 'Post reply' : 'Post comment'}
                disabled={!clean || add.isPending}
                onPress={send}
                hitSlop={8}
                style={[styles.send, { backgroundColor: p.accent }, (!clean || add.isPending) && { opacity: 0.4 }]}>
                {add.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="arrow-up" size={18} color="#FFFFFF" />}
              </Pressable>
            </View>
            {add.isError ? <Text style={[styles.error, { color: p.red }]}>{(add.error as Error).message || 'Could not post.'}</Text> : null}

            <FlatList
              data={comments}
              keyExtractor={(comment) => comment.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
              }}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: p.border }]} />}
              renderItem={({ item }) => (
                <View>
                  <CommentRow comment={item} {...actions} />
                  {item.replies_count > 0 ? (
                    <Pressable accessibilityRole="button" onPress={() => toggle(item.id)} hitSlop={6} style={styles.toggle}>
                      <View style={[styles.toggleLine, { backgroundColor: p.border }]} />
                      <Text style={[styles.toggleText, { color: p.muted }]}>
                        {open.has(item.id) ? 'Hide replies' : `View ${item.replies_count} ${item.replies_count === 1 ? 'reply' : 'replies'}`}
                      </Text>
                    </Pressable>
                  ) : null}
                  {open.has(item.id) ? <Replies commentId={item.id} {...actions} /> : null}
                </View>
              )}
              ListEmptyComponent={
                list.isPending ? (
                  <ActivityIndicator color={p.accent} style={{ marginVertical: 28 }} />
                ) : list.isError ? (
                  <Text style={[styles.empty, { color: p.muted }]}>Could not load the comments. Close this and try again.</Text>
                ) : (
                  <Text style={[styles.empty, { color: p.muted }]}>No comments yet. Be the first.</Text>
                )
              }
              ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginVertical: 12 }} /> : undefined}
            />
          </>
        )}
      </BottomSheet>
      {/* Outside the drawer: the drawer hides while the question shows, because one pop-up cannot open on top of another on every phone. */}
      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this comment?"
        message={deleting && deleting.replies_count > 0 ? `This also deletes its ${deleting.replies_count} ${deleting.replies_count === 1 ? 'reply' : 'replies'}. This cannot be undone.` : 'This cannot be undone.'}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate({ id: deleting.id, removed: 1 + (deleting.parent_id ? 0 : deleting.replies_count) }, { onSettled: () => setDeleting(null) });
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

interface RowActions {
  onOpenProfile: (comment: SocialComment) => void;
  onReply: (comment: SocialComment) => void;
  onReport: (comment: SocialComment) => void;
  onDelete: (comment: SocialComment) => void;
  onLike: (comment: SocialComment) => void;
}

// One comment or reply: avatar, name and time, the text, then Reply, and the report or delete buttons at the end. A reply is smaller and sits
// under its comment, set in from the left.
function CommentRow({ comment, isReply = false, onOpenProfile, onReply, onReport, onDelete, onLike }: RowActions & { comment: SocialComment; isReply?: boolean }) {
  const p = usePalette();
  return (
    <View style={[styles.row, isReply && styles.replyRow]}>
      <Pressable accessibilityRole="button" onPress={() => onOpenProfile(comment)}>
        <SocialAvatar handle={comment.handle} hasAvatar={comment.has_avatar} size={isReply ? 26 : 34} />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.meta, { color: p.muted }]}>
          <Text style={[styles.name, { color: p.text }]} onPress={() => onOpenProfile(comment)}>
            {comment.display_name || `@${comment.handle}`}
          </Text>
          {'  '}
          {timeAgo(comment.created_at)}
        </Text>
        <Text style={[styles.text, { color: p.text }]}>{comment.body}</Text>
        <View style={styles.actionsRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={comment.liked ? 'Unlike' : 'Like'} onPress={() => onLike(comment)} hitSlop={6} style={styles.action}>
            <Ionicons name={comment.liked ? 'heart' : 'heart-outline'} size={15} color={comment.liked ? '#E34255' : p.muted} />
            {comment.likes_count > 0 ? <Text style={[styles.actionCount, { color: comment.liked ? '#E34255' : p.muted }]}>{comment.likes_count}</Text> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Reply to @${comment.handle}`} onPress={() => onReply(comment)} hitSlop={6} style={styles.action}>
            <Ionicons name="chatbubble-outline" size={14} color={p.muted} />
            {!isReply && comment.replies_count > 0 ? <Text style={[styles.actionCount, { color: p.muted }]}>{comment.replies_count}</Text> : null}
            <Text style={[styles.replyButton, { color: p.muted }]}>Reply</Text>
          </Pressable>
        </View>
      </View>
      {comment.is_mine ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel="Report comment" onPress={() => onReport(comment)} hitSlop={8}>
          <Ionicons name="flag-outline" size={16} color={p.muted} />
        </Pressable>
      )}
      {comment.can_delete ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Delete comment" onPress={() => onDelete(comment)} hitSlop={8}>
          <Ionicons name="trash-outline" size={17} color={p.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The replies of one thread, oldest first, loaded when the thread is opened. More load with "Show more replies".
function Replies({ commentId, ...actions }: RowActions & { commentId: string }) {
  const p = usePalette();
  const replies = useSocialReplies(commentId);
  const items = replies.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View style={styles.thread}>
      {items.map((reply) => (
        <CommentRow key={reply.id} comment={reply} isReply {...actions} />
      ))}
      {replies.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 10 }} /> : null}
      {replies.isError ? <Text style={[styles.threadHint, { color: p.muted }]}>Could not load the replies.</Text> : null}
      {replies.hasNextPage ? (
        <Pressable accessibilityRole="button" disabled={replies.isFetchingNextPage} onPress={() => void replies.fetchNextPage()} hitSlop={6} style={styles.more}>
          {replies.isFetchingNextPage ? <ActivityIndicator size="small" color={p.accent} /> : <Text style={[styles.toggleText, { color: p.accent }]}>Show more replies</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 19, lineHeight: 25, letterSpacing: -0.2, marginBottom: 10 },
  replyingTo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  replyingText: { flex: 1, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 18, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontSize: 15, maxHeight: 96, paddingVertical: 6 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 12.5, marginTop: 6 },
  // Tall enough for about four comments, then it scrolls.
  list: { maxHeight: 320, marginTop: 8 },
  sep: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  replyRow: { paddingVertical: 7 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  meta: { fontSize: 12 },
  name: { fontSize: 13.5, fontWeight: '800' },
  text: { fontSize: 14.5, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12.5, fontWeight: '700' },
  replyButton: { fontSize: 12.5, fontWeight: '700' },
  // The thread of replies: set in under the comment, with the toggle line in front of "View N replies".
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 44, paddingBottom: 6 },
  toggleLine: { width: 24, height: StyleSheet.hairlineWidth },
  toggleText: { fontSize: 12.5, fontWeight: '700' },
  thread: { marginLeft: 44, paddingBottom: 6 },
  threadHint: { fontSize: 12.5, paddingVertical: 8 },
  more: { paddingVertical: 8, alignSelf: 'flex-start' },
  reasonRow: { height: 48, justifyContent: 'center' },
  reasonText: { fontSize: 15.5, fontWeight: '600' },
  empty: { textAlign: 'center', fontSize: 14, marginVertical: 28 },
});
