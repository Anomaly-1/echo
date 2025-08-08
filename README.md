![Echo Banner](./echobanner.png)

_A fast, minimal, and secure chat app for friends — built with Next.js, Supabase, and TailwindCSS._

---

## ✨ Features
- **🔒 Secure Authentication** – Email + password login with Supabase Auth
- **💬 Real-Time Messaging** – Messages update instantly without refreshing
- **👥 Private & Group Chats** – Create rooms and add members easily
- **🖼 User Profiles** – Custom usernames and avatars
- **📱 Responsive Design** – Works seamlessly on desktop and mobile
- **🌙 Sleek UI** – Dark, minimal, and slightly futuristic interface

---

## 🛠 Tech Stack
- **Frontend:** [Next.js](https://nextjs.org) + [TailwindCSS](https://tailwindcss.com)
- **Backend & DB:** [Supabase](https://supabase.com) (Auth, Postgres, Realtime)
- **Icons:** [Lucide React](https://lucide.dev)

---

## 🚀 Getting Started

### 1️⃣ Clone the Repo
```bash
git clone https://github.com/yourusername/echo.git
cd echo
````

### 2️⃣ Install Dependencies

```bash
npm install
# or
yarn install
```

### 3️⃣ Configure Supabase

* Create a [Supabase](https://supabase.com) project
* Enable **Email/Password** auth
* Apply the SQL from `supabase/schema.sql` (see below)
* Optionally run the helper script to set policies and functions automatically (see `scripts/setup_supabase.sql`)

### 4️⃣ Add Environment Variables

Create `.env.local` in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5️⃣ Run the App

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

---

## 📂 Project Structure
```
/echo
 ├── /app
 │   ├── /auth          # Signup/Login pages
 │   ├── /chat          # Main chat UI
 │   └── layout.tsx
 ├── /components        # Reusable UI components
 ├── /supabase          # DB schema & queries
 ├── /styles            # Tailwind config & globals
 ├── .env.local         # Supabase credentials
 └── README.md
```

---

## 🔮 Roadmap

* ✅ Real-time messaging
 * ⏳ End-to-end encryption
* ⏳ File sharing
* ⏳ Voice messages
* ⏳ Message reactions

---

## 📜 License

MIT © 2025 Arjun Hariharan
