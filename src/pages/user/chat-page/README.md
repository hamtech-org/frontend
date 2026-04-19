# Chat Page — Architecture Notes

## Tổng quan kiến trúc

`ChatPage.tsx` đóng vai trò **pure composition root** — chỉ wire hooks, context, và render components. Không chứa business logic.

```
ChatPage.tsx (composition root)
├── ChatPageContext.tsx          ← shared data/actions qua context
├── hooks/                      ← domain logic
│   ├── useChatMessageData.ts
│   ├── useDirectConversationActions.ts
│   ├── useGroupConversationController.ts
│   ├── useGroupData.ts
│   ├── useMessageModerationActions.ts
│   ├── useChatRealtimeEvents.ts
│   ├── useConversationRealtimeLifecycle.ts
│   ├── useConversationRoutingSync.ts
│   ├── useChatScrollBehavior.ts
│   ├── useChatModalController.ts
│   └── useChatComposerController.ts  ← self-contained (own mutations + Redux)
├── adapters/
│   └── groupAdapters.ts
└── Components (src/components/chat/)
    ├── ChatNavRail.tsx
    ├── ConversationListPanel.tsx  ← dùng context (core)
    ├── ChatMainContent.tsx       ← dùng context
    ├── ChatComposer.tsx          ← tự gọi useChatComposerController (4 props)
    ├── ChatSideInfoRail.tsx      ← animation wrapper only
    ├── ConversationInfoPanel.tsx  ← dùng context (0 props)
    └── ChatModalsHost.tsx        ← dùng context
```

## ChatPageContext

`ChatPageContext.tsx` cung cấp shared data/actions cho child components qua `useChatPageContext()`, thay vì truyền hàng chục props từ ChatPage.

### Slices

| Slice | Nội dung | Tần suất thay đổi |
|---|---|---|
| `core` | currentUserId, currentUserRole, activeConversation | Thấp (khi chuyển conversation) |
| `group` | members, requests, polls, tasks, loading states | Trung bình (khi data group update) |
| `groupActions` | Tất cả handlers từ useGroupConversationController | Rất thấp (stable useCallback refs) |
| `directActions` | Create group, friend click, calls | Rất thấp (stable useCallback refs) |
| `messageActions` | Edit/recall/delete/pin/react message | Rất thấp (stable useCallback refs) |

### Re-render safety

Context value được **triple-memoized** (core → group → top-level):
- Keystroke trong composer → context **KHÔNG** thay đổi
- Chuyển conversation → chỉ `core` slice changes
- Group data update → chỉ `group` slice changes
- Action slices gần như không bao giờ thay đổi (toàn `useMemo` + `useCallback`)

### Cách dùng trong child component

```tsx
// ConversationInfoPanel: 0 props, tự lấy mọi thứ từ context
function ConversationInfoPanel() {
  const { core, group, groupActions } = useChatPageContext();
}

// ConversationListPanel: lấy currentUserId, activeConversationId từ context
function ConversationListPanel({ conversations, convsLoading, ... }) {
  const { core: { currentUserId, activeConversationId } } = useChatPageContext();
}
```

## Self-Contained Hooks

### useChatComposerController (self-contained)

Hook tự gọi RTK mutations (`useSendMessageMutation`, `useUploadMediaMultiMutation`) và đọc Redux state (`replyingTo`). Không cần external params ngoài `activeConversationId`.

```tsx
// ChatComposer tự gọi hook — chỉ cần 4 props từ parent
function ChatComposer({ activeConversation, activeConversationId, onOpenPoll, onOpenTask }) {
  const { inputText, isSending, handleSendMessage, ... } = useChatComposerController(activeConversationId);
}
```

## Domain Hooks

### Data hooks

- **`useChatMessageData.ts`** — Merge API + socket messages, pinned messages, cache helpers, react mutation.
- **`useGroupData.ts`** — State + fetch group data (members/requests/polls/tasks/recap), loading states, socket subscriptions.
- **`useChatModalController.ts`** — Toàn bộ modal/form UI state. Cung cấp `state` + `actions`.
- **`useChatComposerController.ts`** — Self-contained: inputText per conversation, pending attachments, typing debounce, send/upload pipeline, reply state. Tự gọi RTK mutations.

### Action hooks

- **`useGroupConversationController.ts`** — Tất cả group actions. Return `useMemo`-wrapped cho stable context ref.
- **`useDirectConversationActions.ts`** — Tạo group, mở chat friend, accept friend, audio/video call. Return `useMemo`-wrapped.
- **`useMessageModerationActions.ts`** — Edit/recall/delete/pin/unpin message + RTK cache patching.

### Lifecycle hooks

- **`useChatRealtimeEvents.ts`** — Socket subscriptions cho message/group/poll events.
- **`useConversationRealtimeLifecycle.ts`** — Join/leave conversation rooms, mark-as-read.
- **`useConversationRoutingSync.ts`** — Đồng bộ route param với Redux activeConversationId.
- **`useChatScrollBehavior.ts`** — Auto-scroll, unread counter, jump-to-latest.

## UI Host Components

| Component | Props | Mô tả |
|---|---|---|
| `ChatNavRail` | 4 | Navigation rail (profile, contacts toggle) |
| `ConversationListPanel` | 13 | Danh sách conversations + search. Dùng context cho `currentUserId`, `activeConversationId` |
| `ChatMainContent` | 10 | Header + pinned + messages + composer. Dùng `scroll` & `pinned` object props + context |
| `ChatComposer` | 4 | Self-contained: tự gọi `useChatComposerController`. Chỉ nhận conversation + modal openers |
| `ChatSideInfoRail` | 2 | Pure animation wrapper. Không pass-through props |
| `ConversationInfoPanel` | **0** | Panel thông tin group. Toàn bộ data/actions từ context |
| `ChatModalsHost` | 3 | Host tất cả modals. Nhận `state`/`actions`/`isEditing`, còn lại từ context |

## Shared Support Code

- `adapters/groupAdapters.ts` — Adapter chuyển group members sang shape cho TaskModal.
- `src/services/chat/groupApi.ts` — Tập trung API calls group domain.
- `src/types/chat.group.types.ts` — Type definitions cho group/poll/task/recap/loading. **Fully typed**, no `any`.
- `src/constants/chat-page.constants.ts` — Constants cho composer/upload/message type.

## Prop Grouping Conventions

`ChatMainContent` sử dụng **object props** cho các nhóm data liên quan chặt:

```tsx
// scroll: refs + message list + unread state
scroll: {
  containerRef, endRef, allMessages,
  unreadIncomingCount, onJumpToLatest
}

// pinned: pinned messages + panel toggle
pinned: {
  primaryMessage, otherMessages,
  showOtherPanel, onToggleOtherPanel, onScrollToMessage
}
```

## Metrics

| Metric | Ban đầu | Sau hooks | Sau context v1 | Sau context v2 | Hiện tại |
|---|---|---|---|---|---|
| `ChatPage.tsx` lines | ~1294 | ~310 | ~340 | ~340 | ~330 |
| Inline business logic | ~25 | 0 | 0 | 0 | 0 |
| Code trùng lặp | ~600 | 0 | 0 | 0 | 0 |
| `any` usages (chat) | — | — | — | 5 | **0** |
| Tổng props (7 components) | — | 128+ | 49 | 37 | **33** |
| `ConversationInfoPanel` | 27 | 27 | 27 | 0 | **0** |
| `ChatSideInfoRail` | — | 30 | 2 | 2 | **2** |
| `ChatModalsHost` | — | 26 | 3 | 3 | **3** |
| `ChatMainContent` | — | 53 | 25 | 15 | **10** |
| `ChatComposer` | — | 15 | 15 | 15 | **4** |
| `ConversationListPanel` | — | 15 | 15 | 13 | **13** |

## Quy tắc phát triển

1. **Không thêm business logic vào ChatPage.tsx** — chỉ wire hooks + render.
2. **Data/actions dùng ở ≥2 components → đặt vào context** (thêm vào `ChatPageContextValue`).
3. **Data dùng ở 1 component → truyền qua props** (không cần context).
4. **Hook return objects phải `useMemo`-wrapped** nếu sẽ nằm trong context value.
5. **Domain hook > 300 dòng → cân nhắc tách** theo use-case nhỏ hơn.
6. **API group → đi qua `groupApi` service**, không gọi trực tiếp.
7. **Side effect mới → hook chuyên biệt**, không đặt trong page.
8. **Modal state → mở rộng `useChatModalController`**, không tạo state rời trong page.
9. **Props liên quan chặt → gom thành object prop** (pattern: scroll, pinned).
10. **Component nhận 0 props → tự consume context** hoàn toàn (pattern: ConversationInfoPanel).
11. **Self-contained hooks → gọi RTK mutation/Redux trực tiếp** thay vì nhận qua params (pattern: useChatComposerController).
12. **Không dùng `any`** — dùng proper types từ `chat.group.types.ts` hoặc `chat.types.ts`. `catch (e: unknown)` thay vì `catch (e: any)`.
