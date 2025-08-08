"use client";
import { useEffect, useState, useRef } from "react";
import {
  Send,
  MoreVertical,
  Lock,
  Diamond,
  Plus,
  Users,
  MessageCircle,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

// Theme configuration - easily swappable
type Theme = {
  colors: {
    primary: {
      light: string;
      medium: string;
      dark: string;
      darker: string;
    };
    text: {
      light: string;
      dark: string;
      muted: string;
      mutedLight: string;
    };
    accent: {
      blue: string;
      green: string;
      gray: string;
      red: string;
    };
    background: {
      chat: string;
      white: string;
      overlay: string;
    };
  };
  styleSettings?: {
    compact?: boolean;
    wallpaper?: string | null;
  };
};

const defaultTheme: Theme = {
  colors: {
    primary: {
      light: "#F8F9FA",
      medium: "#E9ECEF",
      dark: "#212529",
      darker: "#343A40",
    },
    text: {
      light: "#FFFFFF",
      dark: "#1F2937",
      muted: "#6B7280",
      mutedLight: "#9CA3AF",
    },
    accent: {
      blue: "#007BFF",
      green: "#10B981",
      gray: "#6B7280",
      red: "#EF4444",
    },
    background: {
      chat: "#F9FAFB",
      white: "#FFFFFF",
      overlay: "rgba(0, 0, 0, 0.3)",
    },
  },
  styleSettings: {
    compact: false,
    wallpaper: null,
  },
};

const presetThemes: Array<{ id: string; name: string; theme: Theme }> = [
  {
    id: "slate",
    name: "Slate",
    theme: defaultTheme,
  },
  {
    id: "ocean",
    name: "Ocean",
    theme: {
      colors: {
        primary: { light: "#ECFEFF", medium: "#CFFAFE", dark: "#0E7490", darker: "#155E75" },
        text: { light: "#FFFFFF", dark: "#0F172A", muted: "#64748B", mutedLight: "#94A3B8" },
        accent: { blue: "#0284C7", green: "#14B8A6", gray: "#6B7280", red: "#EF4444" },
        background: { chat: "#F0FDFA", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    theme: {
      colors: {
        primary: { light: "#ECFDF5", medium: "#D1FAE5", dark: "#065F46", darker: "#064E3B" },
        text: { light: "#FFFFFF", dark: "#052e24", muted: "#6B7280", mutedLight: "#9CA3AF" },
        accent: { blue: "#10B981", green: "#34D399", gray: "#6B7280", red: "#EF4444" },
        background: { chat: "#F0FDF4", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
  {
    id: "violet",
    name: "Violet",
    theme: {
      colors: {
        primary: { light: "#F5F3FF", medium: "#EDE9FE", dark: "#4C1D95", darker: "#3B0764" },
        text: { light: "#FFFFFF", dark: "#1F2937", muted: "#6B7280", mutedLight: "#A1A1AA" },
        accent: { blue: "#7C3AED", green: "#10B981", gray: "#6B7280", red: "#EF4444" },
        background: { chat: "#FAF5FF", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
  {
    id: "rose",
    name: "Rose",
    theme: {
      colors: {
        primary: { light: "#FFF1F2", medium: "#FFE4E6", dark: "#9F1239", darker: "#881337" },
        text: { light: "#FFFFFF", dark: "#1F2937", muted: "#6B7280", mutedLight: "#9CA3AF" },
        accent: { blue: "#FB7185", green: "#10B981", gray: "#6B7280", red: "#DC2626" },
        background: { chat: "#FFF1F2", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
];

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  last_seen?: string;
  theme?: Theme | null;
}

interface Room {
  id: string;
  name?: string;
  is_group: boolean;
  created_at: string;
  other_user?: Profile;
  member_count?: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: Profile;
}

export default function ChatPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [showSidebar, setShowSidebar] = useState(true);

  // Loading states
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingDM, setCreatingDM] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Modal states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep track of subscription channels to properly clean them up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomSubscriptionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageSubscriptionRef = useRef<any>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get logged in user ID and profile
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Get user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, last_seen, theme")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setCurrentProfile(profile);
          if (profile?.theme) {
            try {
              // If theme stored as object or JSON string
              const storedTheme = (typeof profile.theme === "string"
                ? JSON.parse(profile.theme as unknown as string)
                : profile.theme) as Theme;
              setTheme(storedTheme);
            } catch {
              setTheme(defaultTheme);
            }
          }
          setEditUsername(profile?.username || "");
          setEditAvatarUrl(profile?.avatar_url || "");
        }

        // Update last_seen for presence
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating last_seen:", updateError);
        }
      } else {
        router.replace("/signin");
      }
    };
    getUser();

    // Set up an interval to periodically update last_seen
    const presenceInterval = setInterval(async () => {
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", userId);
        if (error) {
          console.error("Error updating presence:", error);
        }
      }
    }, 60000); // Update every minute

    return () => clearInterval(presenceInterval);
  }, [supabase, userId, router]);

  // Load rooms for the logged in user
  useEffect(() => {
    if (!userId) return;

    const loadRooms = async () => {
      setRoomsLoading(true);
      try {
        const { data: roomMemberships, error } = await supabase
          .from("room_members")
          .select(
            `
            room_id,
            chat_rooms (
              id,
              name,
              is_group,
              created_at
            )
          `,
          )
          .eq("user_id", userId);

        if (error) throw error;

        if (!roomMemberships) {
          setRooms([]);
          return;
        }

        const roomsWithDetails = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          roomMemberships.map(async (membership: any) => {
            const room = membership.chat_rooms;
            if (room.is_group) {
              // For group chats, get member count
              const { count, error: countError } = await supabase
                .from("room_members")
                .select("*", { count: "exact", head: true })
                .eq("room_id", room.id);

              if (countError)
                console.error("Error fetching member count:", countError);

              return {
                ...room,
                member_count: count || 0,
              };
            } else {
              // For direct messages, get the other user's info
              const { data: otherMember, error: memberError } = await supabase
                .from("room_members")
                .select(
                  `
                  user_id,
                  profiles (
                    id,
                    username,
                    avatar_url,
                    last_seen
                  )
                `,
                )
                .eq("room_id", room.id)
                .neq("user_id", userId) // Get the *other* user
                .single();

              if (memberError)
                console.error("Error fetching other user:", memberError);

              return {
                ...room,
                other_user: otherMember?.profiles,
              };
            }
          }),
        );

        // Sort rooms by latest message
        const sortedRooms = [...roomsWithDetails].sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setRooms(sortedRooms);
        if (sortedRooms.length > 0 && !selectedRoom) {
          setSelectedRoom(sortedRooms[0]);
        }
      } catch (error) {
        console.error("Error loading rooms:", error);
        setRooms([]);
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();

    // Clean up previous subscription
    if (roomSubscriptionRef.current) {
      supabase.removeChannel(roomSubscriptionRef.current);
    }

    // Subscribe to room changes (new rooms, member changes)
    roomSubscriptionRef.current = supabase
      .channel(`user-rooms-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_members",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New room membership:", payload);
          loadRooms();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_members",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Room membership removed:", payload);
          loadRooms();
        },
      )
      .subscribe((status) => {
        console.log("Room subscription status:", status);
      });

    return () => {
      if (roomSubscriptionRef.current) {
        supabase.removeChannel(roomSubscriptionRef.current);
        roomSubscriptionRef.current = null;
      }
    };
  }, [userId, supabase]);

  // Load messages for selected room + subscribe to new messages
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      // Clean up message subscription when no room is selected
      if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
      }
      return;
    }

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            `
            id,
            content,
            created_at,
            sender_id,
            profiles!messages_sender_id_fkey (
              id,
              username,
              avatar_url
            )
          `,
          )
          .eq("room_id", selectedRoom.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data) {
          const typedMessages = data.map((msg) => ({
            ...msg,
            profiles: Array.isArray(msg.profiles)
              ? msg.profiles[0]
              : msg.profiles,
          })) as Message[];
          setMessages(typedMessages);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();

    // Clean up previous message subscription
    if (messageSubscriptionRef.current) {
      supabase.removeChannel(messageSubscriptionRef.current);
    }

    // Subscribe to new messages in this room
    messageSubscriptionRef.current = supabase
      .channel(`messages-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          console.log("New message received:", payload);

          // Fetch the complete message with profile info
          const { data: newMessage, error } = await supabase
            .from("messages")
            .select(
              `
              id,
              content,
              created_at,
              sender_id,
              profiles!messages_sender_id_fkey (
                id,
                username,
                avatar_url
              )
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Error fetching new message:", error);
            return;
          }

          if (newMessage) {
            const typedMessage = {
              ...newMessage,
              profiles: Array.isArray(newMessage.profiles)
                ? newMessage.profiles[0]
                : newMessage.profiles,
            } as Message;

            // Only add the message if it's not already in our state
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === typedMessage.id);
              if (exists) return prev;

              // Remove any temporary messages with the same content and sender
              const filteredPrev = prev.filter(
                (msg) =>
                  !(
                    msg.id.startsWith("temp-") &&
                    msg.sender_id === typedMessage.sender_id &&
                    msg.content === typedMessage.content
                  ),
              );

              return [...filteredPrev, typedMessage];
            });

            setTimeout(scrollToBottom, 100);
          }
        },
      )
      .subscribe((status) => {
        console.log("Message subscription status:", status);
      });

    return () => {
      if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
      }
    };
  }, [selectedRoom, supabase]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load available users for new chats
  const loadAvailableUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, last_seen")
      .neq("id", userId)
      .order("username");

    if (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } else {
      setAvailableUsers(data || []);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedRoom || !userId) return;

    const messageContent = message.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const tempMessage: Message = {
      id: tempId,
      content: messageContent,
      sender_id: userId,
      created_at: new Date().toISOString(),
      profiles: currentProfile || { id: userId, username: "You" },
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, tempMessage]);
    setMessage("");
    scrollToBottom();

    try {
      const { data: insertedMessage, error } = await supabase
        .from("messages")
        .insert([
          {
            room_id: selectedRoom.id,
            sender_id: userId,
            content: messageContent,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // The real-time subscription will handle adding the actual message
      // and removing the temporary one
    } catch (error) {
      console.error("Send message error:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert("Failed to send message. Please try again.");
    }
  };

  const leaveCurrentRoom = async () => {
    if (!selectedRoom || !userId) return;
    try {
      const { error } = await supabase
        .from("room_members")
        .delete()
        .eq("room_id", selectedRoom.id)
        .eq("user_id", userId);
      if (error) throw error;
      setSelectedRoom(null);
    } catch (error) {
      console.error("Leave room error:", error);
      alert("Failed to leave chat.");
    }
  };

  const deleteCurrentRoom = async () => {
    if (!selectedRoom) return;
    try {
      // Only room creator can delete; RLS enforces. We try and show error if not allowed.
      const { error } = await supabase
        .from("chat_rooms")
        .delete()
        .eq("id", selectedRoom.id);
      if (error) throw error;
      setSelectedRoom(null);
    } catch (error) {
      console.error("Delete room error:", error);
      alert("You are not allowed to delete this chat.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/signin");
  };

  const saveTheme = async (newTheme: Theme) => {
    if (!userId) return;
    setTheme(newTheme);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ theme: newTheme as unknown as Record<string, unknown> })
        .eq("id", userId);
      if (error) throw error;
      setShowThemeModal(false);
    } catch (error) {
      console.error("Save theme error:", error);
      alert("Failed to save theme.");
    }
  };

  const saveProfile = async () => {
    if (!userId) return;
    try {
      const updates: Record<string, unknown> = {
        username: editUsername.trim() || null,
        avatar_url: editAvatarUrl.trim() || null,
      };
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) throw error;
      setCurrentProfile((prev) =>
        prev
          ? { ...prev, username: updates.username as string, avatar_url: updates.avatar_url as string }
          : prev,
      );
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Save profile error:", error);
      alert("Failed to save profile.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createDirectMessage = async (otherUserId: string) => {
    if (creatingDM) return;
    setCreatingDM(true);

    try {
      // Check if DM already exists
      const { data: potentialRooms, error: roomsError } = await supabase
        .from("chat_rooms")
        .select(
          `
                id,
                is_group,
                room_members (
                    user_id
                )
            `,
        )
        .eq("is_group", false);

      if (roomsError) throw roomsError;

      let existingRoomId = null;
      for (const room of potentialRooms) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberIds = room.room_members.map((m: any) => m.user_id);
        if (
          memberIds.length === 2 &&
          memberIds.includes(userId!) &&
          memberIds.includes(otherUserId)
        ) {
          existingRoomId = room.id;
          break;
        }
      }

      if (existingRoomId) {
        // Room already exists, select it
        const existingRoomDetails = rooms.find((r) => r.id === existingRoomId);
        if (existingRoomDetails) {
          setSelectedRoom(existingRoomDetails);
          setShowNewChatModal(false);
          setCreatingDM(false);
          return;
        }
      }

      // Create new DM room
      const { data: newRoom, error: roomError } = await supabase
        .from("chat_rooms")
        .insert([{ is_group: false, created_by: userId }])
        .select()
        .single();

      if (roomError) throw roomError;

      // Add both users to the room
      const { error: membersError } = await supabase
        .from("room_members")
        .insert([
          { room_id: newRoom.id, user_id: userId },
          { room_id: newRoom.id, user_id: otherUserId },
        ]);

      if (membersError) throw membersError;

      setShowNewChatModal(false);
    } catch (error) {
      console.error("Error creating DM:", error);
      alert("Failed to create chat. Please try again.");
    } finally {
      setCreatingDM(false);
    }
  };

  const createGroupChat = async () => {
    if (
      creatingGroup ||
      !groupName.trim() ||
      selectedUsers.length === 0 ||
      !userId
    )
      return;
    setCreatingGroup(true);

    try {
      const { data: newRoom, error: roomError } = await supabase
        .from("chat_rooms")
        .insert([
          {
            name: groupName.trim(),
            is_group: true,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      // Add all selected users plus current user to the room
      const memberInserts = [
        { room_id: newRoom.id, user_id: userId },
        ...selectedUsers.map((uId) => ({
          room_id: newRoom.id,
          user_id: uId,
        })),
      ];

      const { error: membersError } = await supabase
        .from("room_members")
        .insert(memberInserts);

      if (membersError) throw membersError;

      setGroupName("");
      setSelectedUsers([]);
      setShowNewGroupModal(false);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isUserOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  // Cleanup all subscriptions on component unmount
  useEffect(() => {
    return () => {
      if (roomSubscriptionRef.current) {
        supabase.removeChannel(roomSubscriptionRef.current);
      }
      if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
      }
    };
  }, [supabase]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: theme.colors.primary.light }}
    >
      <div className="w-full max-w-6xl h-[92vh] sm:h-[90vh] flex rounded-2xl shadow-2xl overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${showSidebar ? "flex" : "hidden"} sm:flex sm:w-1/3 w-full p-4 sm:p-6 flex-col`}
          style={{ backgroundColor: theme.colors.primary.dark }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-full mr-3 flex items-center justify-center"
                style={{ backgroundColor: theme.colors.background.white }}
              >
                <MessageCircle
                  size={20}
                  style={{ color: theme.colors.primary.dark }}
                />
              </div>
              <span
                className="font-bold text-xl"
                style={{ color: theme.colors.text.light }}
              >
                Chats
              </span>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setShowSettingsModal(true)} style={{ color: theme.colors.text.light }} title="Settings">
                <img
                  src={currentProfile?.avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='16' fill='%23ffffff'/></svg>"}
                  alt="avatar"
                  className="w-6 h-6 rounded-full"
                />
              </button>
              <button
                onClick={() => {
                  loadAvailableUsers();
                  setShowNewChatModal(true);
                }}
                style={{ color: theme.colors.text.light }}
                title="New Direct Message"
                disabled={roomsLoading}
              >
                {roomsLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <MessageCircle size={20} />
                )}
              </button>
              <button
                onClick={() => {
                  loadAvailableUsers();
                  setShowNewGroupModal(true);
                }}
                style={{ color: theme.colors.text.light }}
                title="New Group Chat"
                disabled={roomsLoading}
              >
                {roomsLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Users size={20} />
                )}
              </button>
              <div className="relative">
                <button style={{ color: theme.colors.text.light }} onClick={() => setShowThemeModal(true)} title="Appearance">
                  <Plus size={20} />
                </button>
              </div>
              <button onClick={signOut} style={{ color: theme.colors.text.light }} title="Sign out">
                <X size={20} />
              </button>
            </div>
          </div>
          {/* Rooms List */}
          <div className="flex-grow overflow-y-auto -mr-6 pr-4 space-y-2">
            {roomsLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2
                  className="animate-spin"
                  style={{ color: theme.colors.text.light }}
                />
              </div>
            ) : rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => { setSelectedRoom(room); setShowSidebar(false); }}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedRoom?.id === room.id
                      ? "bg-black bg-opacity-30"
                      : "hover:bg-black hover:bg-opacity-10"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full mr-4 flex items-center justify-center"
                    style={{ backgroundColor: theme.colors.accent.gray }}
                  >
                    {room.is_group ? (
                      <Users
                        size={16}
                        style={{ color: theme.colors.text.light }}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: theme.colors.text.light }}
                      />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3
                      className="font-semibold truncate"
                      style={{ color: theme.colors.text.light }}
                    >
                      {room.is_group
                        ? room.name
                        : room.other_user?.username || "Unknown User"}
                    </h3>
                    {room.is_group && (
                      <p
                        className="text-xs truncate"
                        style={{ color: theme.colors.text.mutedLight }}
                      >
                        {room.member_count} members
                      </p>
                    )}
                  </div>
                  <Diamond
                    size={8}
                    style={{
                      color: room.is_group
                        ? theme.colors.accent.blue
                        : isUserOnline(room.other_user?.last_seen)
                          ? theme.colors.accent.green
                          : theme.colors.text.mutedLight,
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p style={{ color: theme.colors.text.mutedLight }}>
                  No chats yet. Start a conversation!
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => { loadAvailableUsers(); setShowNewChatModal(true); }}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: theme.colors.background.white, color: theme.colors.primary.darker }}
                  >
                    New Direct Message
                  </button>
                  <button
                    onClick={() => { loadAvailableUsers(); setShowNewGroupModal(true); }}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: theme.colors.background.white, color: theme.colors.primary.darker }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Main Chat Area */}
        <div
          className="flex-1 sm:w-2/3 flex flex-col"
          style={{ backgroundColor: theme.colors.primary.light }}
        >
          {/* Chat Header */}
          {selectedRoom ? (
            <div
              className="p-4 flex items-center justify-between shadow-sm"
              style={{ backgroundColor: theme.colors.background.white }}
            >
              <div className="flex items-center">
                <button className="mr-3 sm:hidden" onClick={() => setShowSidebar(true)} title="Back to chats">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18l-6-6 6-6" stroke={theme.colors.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div
                  className="w-12 h-12 rounded-full mr-4 flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.accent.gray }}
                >
                  {selectedRoom.is_group ? (
                    <Users
                      size={20}
                      style={{ color: theme.colors.text.light }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: theme.colors.text.light }}
                    />
                  )}
                </div>
                <div>
                  <h2
                    className="font-bold text-lg truncate max-w-xs"
                    style={{ color: theme.colors.text.dark }}
                  >
                    {selectedRoom.is_group
                      ? selectedRoom.name
                      : selectedRoom.other_user?.username || "Unknown User"}
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: theme.colors.text.muted }}
                  >
                    {selectedRoom.is_group
                      ? `${selectedRoom.member_count} members`
                      : isUserOnline(selectedRoom.other_user?.last_seen)
                        ? "Online"
                        : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm" style={{ color: theme.colors.text.muted }}>
                <Lock size={16} />
                <span>Realtime secure</span>
                <div className="relative ml-4">
                  <button title="Chat actions" onClick={() => setShowActionsMenu((s) => !s)}>
                    <MoreVertical size={16} className="cursor-pointer" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => { setShowActionsMenu(false); leaveCurrentRoom(); }}>
                        Leave chat
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600" onClick={() => { setShowActionsMenu(false); deleteCurrentRoom(); }}>
                        Delete chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="p-6 sm:p-10 flex items-center justify-center h-full"
              style={{ backgroundColor: theme.colors.background.chat }}
            >
              <div className="text-center max-w-md">
                <div className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center shadow"
                  style={{ backgroundColor: theme.colors.background.white }}>
                  <MessageCircle size={28} style={{ color: theme.colors.primary.darker }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: theme.colors.text.dark }}>Welcome to Echo</h3>
                <p className="text-sm mb-4" style={{ color: theme.colors.text.muted }}>
                  Start a new conversation or create a group to begin chatting.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { loadAvailableUsers(); setShowNewChatModal(true); setShowSidebar(true); }}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: theme.colors.primary.dark, color: theme.colors.text.light }}
                  >
                    New Direct Message
                  </button>
                  <button
                    onClick={() => { loadAvailableUsers(); setShowNewGroupModal(true); setShowSidebar(true); }}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: theme.colors.background.white, color: theme.colors.primary.darker }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Messages Area */}
          <div
            className={`flex-grow ${theme.styleSettings?.compact ? "p-3" : "p-6"} overflow-y-auto`}
            style={{ backgroundColor: theme.colors.background.chat, backgroundImage: theme.styleSettings?.wallpaper || undefined, backgroundSize: "cover" }}
          >
            {selectedRoom && messagesLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2
                  className="animate-spin"
                  style={{ color: theme.colors.text.muted }}
                />
              </div>
            ) : selectedRoom ? (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${theme.styleSettings?.compact ? "mb-2" : "mb-4"} ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-t-2xl p-4 max-w-md shadow-sm ${msg.sender_id === userId ? "rounded-bl-2xl" : "rounded-br-2xl"} ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}
                      style={{
                        backgroundColor:
                          msg.sender_id === userId
                            ? theme.colors.primary.dark
                            : theme.colors.background.white,
                      }}
                    >
                      {msg.sender_id !== userId && selectedRoom.is_group && (
                        <p
                          className="text-xs font-semibold mb-1 truncate max-w-[200px]"
                          style={{ color: theme.colors.accent.blue }}
                        >
                          {msg.profiles.username}
                        </p>
                      )}
                      <p
                        style={{
                          color:
                            msg.sender_id === userId
                              ? theme.colors.text.light
                              : theme.colors.text.dark,
                        }}
                      >
                        {msg.content}
                      </p>
                      <span
                        className="text-xs float-right mt-1"
                        style={{
                          color:
                            msg.sender_id === userId
                              ? theme.colors.text.mutedLight
                              : theme.colors.text.muted,
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : null}
          </div>
          {/* Message Input */}
          {selectedRoom && (
            <div
              className="p-4 border-t"
              style={{
                backgroundColor: theme.colors.background.white,
                borderTopColor: theme.colors.primary.medium,
              }}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-grow rounded-full p-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: theme.colors.primary.medium,
                    color: theme.colors.text.dark,
                  }}
                  placeholder="Type a message..."
                  disabled={!selectedRoom}
                />
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: theme.colors.primary.dark,
                    color: theme.colors.text.light,
                  }}
                  disabled={!message.trim() || !selectedRoom}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* New Direct Message Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col"
            style={{ backgroundColor: theme.colors.background.white }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: theme.colors.text.dark }}
              >
                Start New Chat
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                disabled={creatingDM}
              >
                <X size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: theme.colors.primary.light,
                  borderColor: theme.colors.primary.medium,
                  color: theme.colors.text.dark,
                }}
              />
            </div>
            <div className="flex-grow overflow-y-auto min-h-0">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => createDirectMessage(user.id)}
                    className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                      style={{ backgroundColor: theme.colors.accent.gray }}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: theme.colors.text.light }}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p
                        className="truncate"
                        style={{ color: theme.colors.text.dark }}
                      >
                        {user.username}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: theme.colors.text.muted }}
                      >
                        {isUserOnline(user.last_seen) ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* New Group Chat Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col"
            style={{ backgroundColor: theme.colors.background.white }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: theme.colors.text.dark }}
              >
                Create Group Chat
              </h3>
              <button
                onClick={() => setShowNewGroupModal(false)}
                disabled={creatingGroup}
              >
                <X size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                style={{
                  backgroundColor: theme.colors.primary.light,
                  borderColor: theme.colors.primary.medium,
                  color: theme.colors.text.dark,
                }}
                disabled={creatingGroup}
              />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: theme.colors.primary.light,
                  borderColor: theme.colors.primary.medium,
                  color: theme.colors.text.dark,
                }}
                disabled={creatingGroup}
              />
            </div>
            <div className="flex-grow overflow-y-auto mb-4 min-h-0">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUsers((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id],
                      );
                    }}
                    className={`flex items-center p-2 rounded cursor-pointer ${
                      selectedUsers.includes(user.id)
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                      style={{ backgroundColor: theme.colors.accent.gray }}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: theme.colors.text.light }}
                      />
                    </div>
                    <p
                      className="truncate"
                      style={{ color: theme.colors.text.dark }}
                    >
                      {user.username}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>
            <button
              onClick={createGroupChat}
              disabled={
                !groupName.trim() || selectedUsers.length === 0 || creatingGroup
              }
              className="w-full p-2 rounded-lg disabled:opacity-50 flex items-center justify-center"
              style={{
                backgroundColor: theme.colors.primary.dark,
                color: theme.colors.text.light,
              }}
            >
              {creatingGroup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Group (${selectedUsers.length} members)`
              )}
            </button>
          </div>
        </div>
      )}
      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[28rem] max-h-[80vh] overflow-hidden flex flex-col" style={{ backgroundColor: theme.colors.background.white }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.dark }}>
                Appearance
              </h3>
              <button onClick={() => setShowThemeModal(false)}>
                <X size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {presetThemes.map((p) => (
                <button
                  key={p.id}
                  className="rounded-lg border p-3 text-left hover:shadow"
                  style={{ borderColor: theme.colors.primary.medium, backgroundColor: p.theme.colors.primary.light }}
                  onClick={() => saveTheme(p.theme)}
                >
                  <div className="h-10 w-full rounded mb-2" style={{ backgroundColor: p.theme.colors.primary.dark }} />
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: theme.colors.text.dark }}>{p.name}</span>
                    <span className="text-xs" style={{ color: theme.colors.text.muted }}>Apply</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-3 overflow-y-auto pr-1">
              <h4 className="text-sm font-medium" style={{ color: theme.colors.text.muted }}>Custom colors</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  Background
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.primary.light}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, primary: { ...theme.colors.primary, light: e.target.value } } })} />
                </label>
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  Surface
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.background.white}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, background: { ...theme.colors.background, white: e.target.value } } })} />
                </label>
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  My bubble
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.primary.dark}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, primary: { ...theme.colors.primary, dark: e.target.value } } })} />
                </label>
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  Other bubble
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.background.white}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, background: { ...theme.colors.background, white: e.target.value } } })} />
                </label>
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  Accent
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.accent.blue}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, accent: { ...theme.colors.accent, blue: e.target.value } } })} />
                </label>
                <label className="text-sm" style={{ color: theme.colors.text.muted }}>
                  Chat bg
                  <input type="color" className="block w-full h-10 rounded" value={theme.colors.background.chat}
                    onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, background: { ...theme.colors.background, chat: e.target.value } } })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm flex items-center gap-2" style={{ color: theme.colors.text.muted }}>
                  <input type="checkbox" checked={!!theme.styleSettings?.compact}
                    onChange={(e) => setTheme({ ...theme, styleSettings: { ...theme.styleSettings, compact: e.target.checked } })} />
                  Compact mode
                </label>
                <label className="text-sm col-span-2" style={{ color: theme.colors.text.muted }}>
                  Wallpaper (CSS background)
                  <input
                    type="text"
                    placeholder="e.g. linear-gradient(135deg,#e09,#d0e)"
                    value={theme.styleSettings?.wallpaper ?? ""}
                    onChange={(e) => setTheme({ ...theme, styleSettings: { ...theme.styleSettings, wallpaper: e.target.value || null } })}
                    className="mt-1 w-full p-2 rounded border"
                    style={{ borderColor: theme.colors.primary.medium, color: theme.colors.text.dark, backgroundColor: theme.colors.primary.light }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.colors.primary.medium }}>
                <button className="px-4 py-2 rounded border" style={{ borderColor: theme.colors.primary.medium, color: theme.colors.text.muted }} onClick={() => setTheme(defaultTheme)}>
                  Reset
                </button>
                <button className="px-4 py-2 rounded" style={{ backgroundColor: theme.colors.primary.dark, color: theme.colors.text.light }} onClick={() => saveTheme(theme)}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[28rem] max-h-[80vh] overflow-hidden flex flex-col" style={{ backgroundColor: theme.colors.background.white }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.dark }}>
                Profile
              </h3>
              <button onClick={() => setShowSettingsModal(false)}>
                <X size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="flex items-center gap-3">
                <img src={editAvatarUrl || currentProfile?.avatar_url || "https://api.dicebear.com/9.x/identicon/svg"} alt="avatar" className="w-12 h-12 rounded-full border" style={{ borderColor: theme.colors.primary.medium }} />
                <div className="flex-1">
                  <label className="text-sm block mb-1" style={{ color: theme.colors.text.muted }}>Avatar URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: theme.colors.primary.medium, color: theme.colors.text.dark, backgroundColor: theme.colors.primary.light }}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: theme.colors.text.muted }}>Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: theme.colors.primary.medium, color: theme.colors.text.dark, backgroundColor: theme.colors.primary.light }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.colors.primary.medium }}>
                <button className="px-4 py-2 rounded border" style={{ borderColor: theme.colors.primary.medium, color: theme.colors.text.muted }} onClick={() => { setEditUsername(currentProfile?.username || ""); setEditAvatarUrl(currentProfile?.avatar_url || ""); }}>
                  Reset
                </button>
                <button className="px-4 py-2 rounded" style={{ backgroundColor: theme.colors.primary.dark, color: theme.colors.text.light }} onClick={saveProfile}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
