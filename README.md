![Echo Banner](./echobanner.png)

A fast, minimal, and secure chat app for friends — built with Next.js, Supabase, and TailwindCSS.

---

## ✨ Features
- **Authentication**: Email + password with Supabase Auth
- **Private & Group Chats**: Create DMs and groups; leave chats anytime (messages persist)
- **Realtime Messaging**: Live updates via Supabase Realtime
- **Presence**: Online indicator based on last activity
- **Notifications (Awaiting)**: “New” badge per room for your membership row (no unread counts)
- **Theming**: Per-user JSONB theme with presets (Slate, Earth Tones, Sea, Dark, Light, Solarized Red/Blue)
- **Appearance**: Compact mode (Discord-like) and standard bubble mode; wallpapers supported
- **Profiles**: Usernames and avatars; avatar fallback icon
- **Responsive UI**: Sidebar overlay on mobile; dropdown actions; keyboard-enter send
- **Security**: RLS policies for `profiles`, `chat_rooms`, `room_members`, `messages`

---

## 🛠 Tech Stack
- Frontend: Next.js 15 + React 19 + TailwindCSS 4
- Backend/DB: Supabase (Auth, Postgres, Realtime)
- Icons: Ionicons (react-icons/io5)

---

## 🚀 Getting Started

### 1) Install and configure
```bash
npm install
# copy .env.local and fill in your Supabase values
cp .env.example .env.local
```

Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2) Supabase schema
Run the SQL in `schema.sql` inside your Supabase SQL editor. It creates:
- `profiles`: id (auth.users FK), username, avatar_url, last_seen, theme (jsonb)
- `chat_rooms`: id, name, is_group, created_by
- `room_members`: (room_id, user_id) PK, created_at, last_read_at, awaiting
- `messages`: id, room_id, sender_id, content, created_at

And sets RLS, realtime publications, and a trigger to create a profile on signup.

> RLS Policies might need to be disabled on chat_rooms as I haven't set them properly for now

### 3) Dev
```bash
npm run dev
```
Open http://localhost:3000

---

## 🧭 Usage Notes
- Create a DM from the chat menu (chat icon) or start a group and add members
- “Leave chat” removes your membership only; messages remain if you rejoin
- Appearance → pick a theme or enable Compact mode (no avatars, no bubbles)
- Online dot turns green if last_seen within 5 minutes
- “New” badge shows when your `room_members.awaiting` is true; opening the room flips it to false

---

## 🎨 Theming
Themes are stored per-user in `profiles.theme` (jsonb). Presets included:
- Slate
- Earth Tones
- Sea
- Dark
- Light
- Solarized Red
- Solarized Blue

Style settings:
- `compact`: true/false, toggles Discord-like dense layout
- `wallpaper`: optional CSS background string

---

## ⚙️ Optimizations & Architecture
- **Realtime + Local Patching**: Subscribed to `room_members` updates for current user; patch `awaiting` in-place without reloading rooms
- **Debounced/Scoped Refreshes**: Full reload only on room INSERT/DELETE; updates use local state patch
- **Message Virtualization-lite**: Paginate messages (20 at a time). Load newest first and fetch older pages on demand via IntersectionObserver
- **Single-pass Room Loading**: One query to get rooms and membership flags; minimal follow-ups
- **Responsive Sidebar**: Hidden by default on mobile; overlay + backdrop to avoid layout thrash
- **Presence via last_seen**: Updated on login and at intervals; no heavy presence service
- **RLS Policies**: Members read/write only where appropriate; creator-only delete on rooms
- **UX Safeguards**: Character limit, simple rate limiting, and light profanity replacements

---

## 📂 Project Structure
```
/echo
├── src/app
│   ├── page.tsx            # Main chat UI
│   ├── signin/page.tsx     # Auth UI
│   └── layout.tsx
├── public/                 # Assets
├── schema.sql              # Supabase schema & policies
├── package.json
├── README.md
└── ...
```

---

## 🔮 Roadmap
- E2E encryption
- File sharing & uploads
- Message reactions & threads
- Push notifications

---

## 📜 License
MIT © 2025 Arjun Hariharan
