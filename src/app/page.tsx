"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  IoSend,
  IoEllipsisVertical,
  IoLockClosed,
  IoEllipse,
  IoBrush,
  IoPeople,
  IoChatbubbleEllipses,
  IoSearch,
  IoClose,
  IoChevronBack,
  IoMenu,
  IoSettingsOutline,
  IoPersonCircle,
  IoLogoGithub,
} from "react-icons/io5";
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : null;
}

function getBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 255;
  // Perceived brightness
  return Math.round((rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000);
}

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
    id: "earth",
    name: "Earth Tones",
    theme: {
      colors: {
        primary: { light: "#F7F2EE", medium: "#DDE7CC", dark: "#5C4033", darker: "#3F2F21" },
        text: { light: "#FFFFFF", dark: "#2B2A28", muted: "#6B6156", mutedLight: "#9B8F82" },
        accent: { blue: "#E69D6C", green: "#A3B18A", gray: "#7D7461", red: "#B85C38" },
        background: { chat: "#FBF7F3", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
  {
    id: "sea",
    name: "Sea",
    theme: {
      colors: {
        primary: { light: "#E6FFFA", medium: "#B2F5EA", dark: "#0D9488", darker: "#0F766E" },
        text: { light: "#FFFFFF", dark: "#013A38", muted: "#4B7F7B", mutedLight: "#88B9B6" },
        accent: { blue: "#2DD4BF", green: "#14B8A6", gray: "#6B7280", red: "#EF4444" },
        background: { chat: "#ECFEFF", white: "#FFFFFF", overlay: "rgba(0,0,0,.3)" },
      },
    },
  },
  {
    id: "dark",
    name: "Dark",
    theme: {
      colors: {
        primary: { light: "#0B0F14", medium: "#111827", dark: "#0F172A", darker: "#0B1220" },
        text: { light: "#E5E7EB", dark: "#E5E7EB", muted: "#9CA3AF", mutedLight: "#6B7280" },
        accent: { blue: "#3B82F6", green: "#10B981", gray: "#6B7280", red: "#EF4444" },
        background: { chat: "#111827", white: "#0F172A", overlay: "rgba(255,255,255,.08)" },
      },
      styleSettings: { compact: false, wallpaper: null },
    },
  },
  {
    id: "light",
    name: "Light",
    theme: defaultTheme,
  },
  {
    id: "solarized-red",
    name: "Solarized Red",
    theme: {
      colors: {
        primary: { light: "#FDF6E3", medium: "#EEE8D5", dark: "#CB4B16", darker: "#B13612" },
        text: { light: "#FFFFFF", dark: "#073642", muted: "#657B83", mutedLight: "#93A1A1" },
        accent: { blue: "#CB4B16", green: "#859900", gray: "#6B7280", red: "#DC322F" },
        background: { chat: "#FDF6E3", white: "#FFFFFF", overlay: "rgba(0,0,0,.1)" },
      },
    },
  },
  {
    id: "solarized-blue",
    name: "Solarized Blue",
    theme: {
      colors: {
        primary: { light: "#FDF6E3", medium: "#EEE8D5", dark: "#268BD2", darker: "#1E6CA8" },
        text: { light: "#FFFFFF", dark: "#073642", muted: "#657B83", mutedLight: "#93A1A1" },
        accent: { blue: "#268BD2", green: "#2AA198", gray: "#6B7280", red: "#DC322F" },
        background: { chat: "#FDF6E3", white: "#FFFFFF", overlay: "rgba(0,0,0,.1)" },
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
  awaiting?: boolean;
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
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  const MESSAGE_MAX_LENGTH = 500;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;
  const [oldestMessageAt, setOldestMessageAt] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(true);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);

  const isDarkUI = getBrightness(theme.colors.background.white) < 140;

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

  // Hide sidebar by default on small screens
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) setShowSidebar(false);
    }
  }, []);

  // Load rooms for the logged in user
  const loadRooms = async () => {
    if (!userId) return;
    
    setRoomsLoading(true);
    try {
      const { data: roomMemberships, error } = await supabase
        .from("room_members")
        .select(
          `
          room_id,
          awaiting,
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

            // Use awaiting from membership row for current user
            const awaiting = !!membership.awaiting;

            return {
              ...room,
              member_count: count || 0,
              awaiting,
            };
          } else {
            // For direct messages, find the other user's id, then fetch their profile
            let otherUserId: string | undefined;
            try {
              const { data: otherRows, error: otherIdErr } = await supabase
                .from("room_members")
                .select("user_id")
                .eq("room_id", room.id)
                .neq("user_id", userId)
                .limit(1);
              if (otherIdErr) throw otherIdErr;
              otherUserId = otherRows && otherRows.length > 0 ? otherRows[0].user_id : undefined;
            } catch (e) {
              console.error("Error fetching other user id:", e);
            }

            let otherProfile: Profile | undefined;
            if (otherUserId) {
              try {
                const { data: prof, error: profErr } = await supabase
                  .from("profiles")
                  .select("id, username, avatar_url, last_seen")
                  .eq("id", otherUserId)
                  .single();
                if (profErr) throw profErr;
                otherProfile = prof as unknown as Profile;
              } catch (e) {
                console.error("Error fetching other user profile:", e);
              }
            }

            // Use awaiting from membership row for current user
            const awaiting = !!membership.awaiting;

            return {
              ...room,
              other_user: otherProfile,
              awaiting,
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

  useEffect(() => {
    if (!userId) return;

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_members",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Room membership updated (local patch):", payload);
          const updated = payload.new as { room_id: string; awaiting?: boolean };
          setRooms((prev) =>
            prev.map((r) => (r.id === updated.room_id ? { ...r, awaiting: !!updated.awaiting } : r)),
          );
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
            profiles:profiles!messages_sender_id_fkey (
              id,
              username,
              avatar_url
            )
          `,
          )
          .eq("room_id", selectedRoom.id)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (error) throw error;

        if (data) {
          const typedDesc = data.map((msg) => ({
            ...msg,
            profiles: Array.isArray(msg.profiles)
              ? msg.profiles[0]
              : msg.profiles,
          })) as Message[];
          const typedAsc = [...typedDesc].reverse();
          setMessages(typedAsc);
          setOldestMessageAt(typedAsc[0]?.created_at || null);
          setHasMoreOlder((data?.length || 0) === PAGE_SIZE);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
        setOldestMessageAt(null);
        setHasMoreOlder(false);
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
              profiles:profiles!messages_sender_id_fkey (
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

  const loadOlderMessages = React.useCallback(async () => {
    if (!selectedRoom || !oldestMessageAt || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);
    const el = messagesContainerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    const prevScrollTop = el?.scrollTop || 0;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          content,
          created_at,
          sender_id,
          profiles:profiles!messages_sender_id_fkey (
            id,
            username,
            avatar_url
          )
        `,
        )
        .eq("room_id", selectedRoom.id)
        .lt("created_at", oldestMessageAt)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      const olderDesc = (data || []).map((msg) => ({
        ...msg,
        profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles,
      })) as Message[];
      const olderAsc = [...olderDesc].reverse();
      setMessages((prev) => [...olderAsc, ...prev]);
      if (olderAsc.length > 0) setOldestMessageAt(olderAsc[0].created_at);
      if ((data?.length || 0) < PAGE_SIZE) setHasMoreOlder(false);
    } catch (e) {
      console.error("Load older messages failed:", e);
      setHasMoreOlder(false);
    } finally {
      setLoadingOlder(false);
      setTimeout(() => {
        const el2 = messagesContainerRef.current;
        if (!el2) return;
        const newScrollHeight = el2.scrollHeight;
        el2.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      }, 0);
    }
  }, [selectedRoom, oldestMessageAt, loadingOlder, hasMoreOlder, supabase]);

  // IntersectionObserver to trigger loading older messages when top sentinel is visible
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void loadOlderMessages();
        }
      }
    }, { root: messagesContainerRef.current, threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlderMessages]);

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
      // If we're adding users to an existing group, filter out users already in the group
      if (showAddUsersModal && selectedRoom?.is_group) {
        const { data: existingMembers, error: membersError } = await supabase
          .from("room_members")
          .select("user_id")
          .eq("room_id", selectedRoom.id);
        
        if (!membersError && existingMembers) {
          const existingUserIds = existingMembers.map(m => m.user_id);
          const filteredUsers = data.filter(user => !existingUserIds.includes(user.id));
          setAvailableUsers(filteredUsers || []);
        } else {
          setAvailableUsers(data || []);
        }
      } else {
        setAvailableUsers(data || []);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedRoom || !userId) return;
    if (message.length > MESSAGE_MAX_LENGTH) {
      alert(`Message too long. Max ${MESSAGE_MAX_LENGTH} characters.`);
      return;
    }
    // Minimal rate limit: 1 message per 800ms
    const now = Date.now();
    if (now - lastSentAt < 800) {
      alert("You're sending messages too quickly. Please slow down.");
      return;
    }
    setLastSentAt(now);

    const messageContent = sanitizeMessage(message.trim());
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

      // Set awaiting=true for all other members in this room
      try {
        if (selectedRoom.is_group) {
          // For groups: set awaiting only for members who are NOT online
          const { data: membersWithPresence } = await supabase
            .from("room_members")
            .select(
              `
              user_id,
              profiles:profiles!room_members_user_id_fkey (
                last_seen
              )
            `,
            )
            .eq("room_id", selectedRoom.id);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const targets = (membersWithPresence || []).filter((m: any) => {
            if (m.user_id === userId) return false;
            const ls = Array.isArray(m.profiles) ? m.profiles[0]?.last_seen : m.profiles?.last_seen;
            const offline = !ls || !isUserOnline(ls as string);
            return offline;
          });

          await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            targets.map((m: any) =>
              supabase
                .from("room_members")
                .update({ awaiting: true })
                .eq("room_id", selectedRoom.id)
                .eq("user_id", m.user_id),
            ),
          );
        } else {
          // For DMs: always set awaiting for the other user
          const { data: members } = await supabase
            .from("room_members")
            .select("user_id")
            .eq("room_id", selectedRoom.id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const others = (members || []).filter((m: any) => m.user_id !== userId);
          await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            others.map((m: any) =>
              supabase
                .from("room_members")
                .update({ awaiting: true })
                .eq("room_id", selectedRoom.id)
                .eq("user_id", m.user_id),
            ),
          );
        }
      } catch (e) {
        console.error("Failed to set awaiting:", e);
      }

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

  const addUsersToGroup = async () => {
    if (!selectedRoom || !userId || usersToAdd.length === 0) return;

    try {
      // Add selected users to the room_members table
      const memberInserts = usersToAdd.map((uId) => ({
        room_id: selectedRoom.id,
        user_id: uId,
      }));

      const { error: membersError } = await supabase
        .from("room_members")
        .insert(memberInserts);

      if (membersError) throw membersError;

      // Refresh the room to get updated member count
      await loadRooms();
      
      // Clear the form and close modal
      setUsersToAdd([]);
      setShowAddUsersModal(false);
      
      alert("Users added successfully!");
    } catch (error) {
      console.error("Error adding users to group:", error);
      alert("Failed to add users. Please try again.");
    }
  };

  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredUsersForAdd = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isUserOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  // Clear awaiting when opening a room (mark as seen)
  useEffect(() => {
    const markRead = async () => {
      if (!selectedRoom || !userId) return;
      try {
        await supabase
          .from("room_members")
          .update({ awaiting: false, last_read_at: new Date().toISOString() })
          .eq("room_id", selectedRoom.id)
          .eq("user_id", userId);
        // Patch local state immediately to avoid waiting for realtime
        setRooms((prev) => prev.map((r) => (r.id === selectedRoom.id ? { ...r, awaiting: false } : r)));
      } catch (e) {
        console.error("Failed to mark read:", e);
      }
    };
    markRead();
  }, [selectedRoom, userId, supabase]);

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

  // Simple rate limit and spam filter
  const [lastSentAt, setLastSentAt] = useState<number>(0);

  const sanitizeMessage = (content: string): string => {
    const patterns: Array<[RegExp, string]> = [
      [/\bf+u+c*k+\b/gi, "duck"],
      [/\bwtf\b/gi, "what the duck"],
      [/\bfk\b/gi, "duck"],
      [/\btf\b/gi, "the duck"],
    ];
    let sanitized = content;
    for (const [re, repl] of patterns) sanitized = sanitized.replace(re, repl);
    return sanitized;
  };

  return (
    <div
      className="min-h-screen h-screen w-screen"
      style={{ backgroundColor: theme.colors.primary.light }}
    >
      <div className="w-full h-full flex relative">
        {/* Sidebar */}
        {/* Backdrop on small screens when sidebar open */}
        {showSidebar && (
          <div className="md:hidden fixed inset-0 z-30" style={{ background: theme.colors.background.overlay }} onClick={() => setShowSidebar(false)} />
        )}
        <div
          className={`${showSidebar ? "flex" : "hidden"} md:flex md:relative md:z-0 md:w-1/3 lg:w-1/4 w-3/4 max-w-xs p-3 sm:p-4 flex-col border-r ${showSidebar ? "fixed md:static z-40 h-full" : ""}`}
          style={{ backgroundColor: theme.colors.primary.dark, borderColor: theme.colors.primary.medium }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center relative">
              <button
                type="button"
                onClick={() => setShowSidebar((s) => !s)}
                title="Toggle sidebar"
                className="mr-2 hover:opacity-80 active:scale-[.98] transition cursor-pointer md:hidden"
                style={{ color: theme.colors.text.light }}
              >
                <IoMenu size={18} />
              </button>
              <button
                type="button"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full mr-3 flex items-center justify-center hover:opacity-90 active:scale-[.98] transition cursor-pointer"
                style={{ backgroundColor: theme.colors.background.white }}
                onClick={() => setShowHeaderMenu((v) => !v)}
                title="Chat menu"
              >
                <IoChatbubbleEllipses size={18} style={{ color: isDarkUI ? theme.colors.text.dark : theme.colors.primary.dark }} />
              </button>
              <span className="font-bold text-lg sm:text-xl" style={{ color: theme.colors.text.light }}>
                Chats
              </span>
              {showHeaderMenu && (
                <div className="absolute top-12 left-0 z-20 rounded-xl shadow-lg p-4 w-64 sm:w-72"
                  style={{ backgroundColor: theme.colors.background.white }}>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center">
                      <button title="New DM" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.primary.darker }}
                        onClick={() => { setShowHeaderMenu(false); loadAvailableUsers(); setShowNewChatModal(true); }}>
                        <IoChatbubbleEllipses />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>New DM</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button title="Create Group" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.primary.darker }}
                        onClick={() => { setShowHeaderMenu(false); loadAvailableUsers(); setShowNewGroupModal(true); }}>
                        <IoPeople />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>Group</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button title="Appearance" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.primary.darker }}
                        onClick={() => { setShowHeaderMenu(false); console.log("Theme brush button clicked"); setShowThemeModal(true); }}>
                        <IoBrush />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>Appearance</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button title="Settings" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.primary.darker }}
                        onClick={() => { setShowHeaderMenu(false); setShowSettingsModal(true); }}>
                        <IoSettingsOutline />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>Settings</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button title="Sign out" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.accent.red }}
                        onClick={() => { setShowHeaderMenu(false); signOut(); }}>
                        <IoClose />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>Sign out</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <button title="Repository" className="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition"
                        style={{ backgroundColor: isDarkUI ? "rgba(255,255,255,0.08)" : theme.colors.primary.light, color: isDarkUI ? theme.colors.text.light : theme.colors.primary.darker }}
                        onClick={() => { setShowHeaderMenu(false); window.open("https://github.com/Anomaly-1/echo", "_blank", "noopener,noreferrer"); }}>
                        <IoLogoGithub />
                      </button>
                      <span className="mt-1 text-xs" style={{ color: theme.colors.text.muted }}>GitHub</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Rooms List */}
          <div className="flex-grow overflow-y-auto -mr-3 pr-2 space-y-2">
            {roomsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center p-3 rounded-xl">
                    <div className="w-10 h-10 rounded-full mr-4 animate-pulse" style={{ backgroundColor: theme.colors.text.mutedLight }} />
                    <div className="flex-1">
                      <div className="h-3 w-1/2 mb-2 rounded animate-pulse" style={{ backgroundColor: theme.colors.text.mutedLight }} />
                      <div className="h-2 w-1/3 rounded animate-pulse" style={{ backgroundColor: theme.colors.text.mutedLight }} />
                    </div>
                  </div>
                ))}
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
                  <div className="w-10 h-10 rounded-full mr-4 flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.colors.accent.gray }}>
                    {room.is_group ? (
                      <IoPeople size={16} style={{ color: theme.colors.text.light }} />
                    ) : room.other_user?.avatar_url ? (
                      <img src={room.other_user.avatar_url} alt="avatar" className="w-10 h-10 object-cover" />
                    ) : (
                      <IoPersonCircle size={22} style={{ color: theme.colors.text.light }} />
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
                  {/* Online indicator + awaiting badge */}
                  <div className="relative flex items-center">
                    <IoEllipse
                      size={14}
                      style={{
                        color: room.is_group
                          ? theme.colors.accent.blue
                          : isUserOnline(room.other_user?.last_seen)
                            ? theme.colors.accent.green
                            : theme.colors.text.mutedLight,
                      }}
                    />
                    {room.awaiting && (
                      <span className="ml-2 text-[10px] px-2 h-[16px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.accent.red, color: theme.colors.text.light }}>
                        New
                      </span>
                    )}
                  </div>
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
          className="flex-1 flex flex-col"
          style={{ backgroundColor: theme.colors.primary.light }}
        >
          {/* Chat Header */}
          {selectedRoom ? (
            <div
              className="p-3 sm:p-4 flex items-center justify-between shadow-sm border-b"
              style={{ backgroundColor: theme.colors.background.white, borderColor: theme.colors.primary.medium }}
            >
              <div className="flex items-center">
                {!showSidebar && (
                  <button className="mr-3 md:hidden" onClick={() => setShowSidebar(true)} title="Open chats">
                    <IoMenu size={20} style={{ color: theme.colors.text.muted }} />
                  </button>
                )}
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-4 flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.accent.gray }}
                >
                  {selectedRoom.is_group ? (
                    <IoPeople
                      size={20}
                      style={{ color: theme.colors.text.light }}
                    />
                  ) : (
                    selectedRoom.other_user?.avatar_url ? (
                      <img src={selectedRoom.other_user.avatar_url} alt="avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
                    ) : (
                      <IoPersonCircle size={22} style={{ color: theme.colors.text.light }} />
                    )
                  )}
                </div>
                <div>
                  <h2
                    className="font-bold text-base sm:text-lg truncate max-w-xs"
                    style={{ color: theme.colors.text.dark }}
                  >
                    {selectedRoom.is_group
                      ? selectedRoom.name
                      : selectedRoom.other_user?.username || "Unknown User"}
                  </h2>
                  <p
                    className="text-xs sm:text-sm"
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
                <IoLockClosed size={16} />
                <span className="hidden sm:inline">Realtime secure</span>
                <div className="relative ml-2 sm:ml-4">
                  <button title="Chat actions" onClick={() => setShowActionsMenu((s) => !s)}>
                    <IoEllipsisVertical size={18} className="cursor-pointer" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      {selectedRoom.is_group && (
                        <button 
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" 
                          onClick={() => { 
                            setShowActionsMenu(false); 
                            setUsersToAdd([]);
                            setSearchQuery("");
                            loadAvailableUsers(); 
                            setShowAddUsersModal(true); 
                          }}
                        >
                          Add Users
                        </button>
                      )}
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => { setShowActionsMenu(false); leaveCurrentRoom(); }}>
                        Leave chat
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
                  <IoChatbubbleEllipses size={28} style={{ color: theme.colors.primary.darker }} />
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
            ref={messagesContainerRef}
            style={{ backgroundColor: theme.colors.background.chat, backgroundImage: theme.styleSettings?.wallpaper || undefined, backgroundSize: "cover" }}
          >
            {selectedRoom && messagesLoading ? (
              <div className="flex justify-center items-center h-full">
                <span className="animate-spin" style={{ color: theme.colors.text.muted }}>●</span>
              </div>
            ) : selectedRoom ? (
              <>
                <div ref={topSentinelRef} />
                {messages.map((msg, idx) => (
                  theme.styleSettings?.compact ? (
                    <div key={msg.id} className="mb-1">
                      {selectedRoom.is_group && msg.sender_id !== userId && (
                        <span className="text-xs font-semibold mr-2" style={{ color: theme.colors.accent.blue }}>
                          {msg.profiles.username}
                        </span>
                      )}
                      <span
                        className="text-sm break-words whitespace-pre-wrap"
                        style={{ color: isDarkUI ? theme.colors.text.light : theme.colors.text.dark }}
                      >
                        {msg.content}
                      </span>
                      <span className="text-[10px] ml-2" style={{ color: theme.colors.text.muted }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className={`flex ${theme.styleSettings?.compact ? "mb-2" : "mb-4"} ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex items-end gap-2 ${msg.sender_id === userId ? "flex-row-reverse" : ""}`}>
                        {/* Avatar next to each message */}
                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: theme.colors.accent.gray }}>
                          {msg.sender_id === userId ? (
                            currentProfile?.avatar_url ? (
                              <img src={currentProfile.avatar_url} alt="me" className="w-6 h-6 object-cover" />
                            ) : (
                              <IoPersonCircle size={16} style={{ color: theme.colors.text.light }} />
                            )
                          ) : msg.profiles?.avatar_url ? (
                            <img src={msg.profiles.avatar_url} alt={msg.profiles.username} className="w-6 h-6 object-cover" />
                          ) : (
                            <IoPersonCircle size={16} style={{ color: theme.colors.text.light }} />
                          )}
                        </div>

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
                            className="break-words whitespace-pre-wrap"
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
                    </div>
                  )
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : null}
          </div>
          {/* Message Input */}
          {selectedRoom && (
            <div
              className="p-3 sm:p-4 border-t"
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
                  maxLength={MESSAGE_MAX_LENGTH}
                  className="flex-grow rounded-full p-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: theme.colors.primary.medium,
                    color: theme.colors.text.dark,
                  }}
                  placeholder="Type a message..."
                  disabled={!selectedRoom}
                />
                <div className="text-xs" style={{ color: theme.colors.text.muted }}>
                  {message.length}/{MESSAGE_MAX_LENGTH}
                </div>
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: theme.colors.primary.dark,
                    color: theme.colors.text.light,
                  }}
                  disabled={!message.trim() || !selectedRoom || message.length > MESSAGE_MAX_LENGTH}
                >
                  <IoSend size={20} />
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
                <IoClose size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2 w-full p-2 border rounded-lg"
                style={{ backgroundColor: theme.colors.primary.light, borderColor: theme.colors.primary.medium }}>
                <IoSearch size={18} style={{ color: theme.colors.text.muted }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full focus:outline-none"
                  style={{ color: theme.colors.text.dark, backgroundColor: "transparent" }}
                />
              </div>
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
                <IoClose size={20} style={{ color: theme.colors.text.muted }} />
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
              <div className="flex items-center gap-2 w-full p-2 border rounded-lg"
                style={{ backgroundColor: theme.colors.primary.light, borderColor: theme.colors.primary.medium }}>
                <IoSearch size={18} style={{ color: theme.colors.text.muted }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full focus:outline-none"
                  style={{ color: theme.colors.text.dark, backgroundColor: "transparent" }}
                  disabled={creatingGroup}
                />
              </div>
            </div>
            <div className="flex-grow overflow-y-auto mb-4 min-h-0">
              {filteredUsersForAdd.length > 0 ? (
                filteredUsersForAdd.map((user) => (
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
                <>Creating...</>
              ) : (
                `Create Group (${selectedUsers.length} members)`
              )}
            </button>
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
                <IoClose size={20} style={{ color: theme.colors.text.muted }} />
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
      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[28rem] max-h-[80vh] overflow-hidden flex flex-col" style={{ backgroundColor: theme.colors.background.white }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.dark }}>
                Appearance
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="hover:opacity-80 transition" title="Close">
                <IoClose size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {presetThemes.map((p) => (
                <button
                  key={p.id}
                  className="rounded-lg border p-3 text-left hover:shadow transition"
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
            <div className="flex items-center justify-between mt-1 pt-3 border-t" style={{ borderColor: theme.colors.primary.medium }}>
              <div>
                <div className="text-sm font-medium" style={{ color: theme.colors.text.dark }}>Compact mode</div>
                <div className="text-xs" style={{ color: theme.colors.text.muted }}>Discord-like: no avatars, no bubbles</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!theme.styleSettings?.compact}
                  onChange={(e) => {
                    const updated = { ...theme, styleSettings: { ...theme.styleSettings, compact: e.target.checked } };
                    saveTheme(updated);
                  }}
                />
                <div className="w-10 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full relative transition">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 peer-checked:translate-x-5 transition" />
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Add Users Modal */}
      {showAddUsersModal && (
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
                Add Users to Group
              </h3>
              <button
                onClick={() => {
                  setShowAddUsersModal(false);
                  setUsersToAdd([]);
                  setSearchQuery("");
                }}
              >
                <IoClose size={20} style={{ color: theme.colors.text.muted }} />
              </button>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2 w-full p-2 border rounded-lg"
                style={{ backgroundColor: theme.colors.primary.light, borderColor: theme.colors.primary.medium }}>
                <IoSearch size={18} style={{ color: theme.colors.text.muted }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full focus:outline-none"
                  style={{ color: theme.colors.text.dark, backgroundColor: "transparent" }}
                />
              </div>
            </div>
            <div className="flex-grow overflow-y-auto mb-4 min-h-0">
              {filteredUsersForAdd.length > 0 ? (
                filteredUsersForAdd.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setUsersToAdd((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id],
                      );
                    }}
                    className={`flex items-center p-2 rounded cursor-pointer ${
                      usersToAdd.includes(user.id)
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
              onClick={addUsersToGroup}
              disabled={usersToAdd.length === 0}
              className="w-full p-2 rounded-lg disabled:opacity-50 flex items-center justify-center"
              style={{
                backgroundColor: theme.colors.primary.dark,
                color: theme.colors.text.light,
              }}
            >
              Add {usersToAdd.length} User{usersToAdd.length !== 1 ? 's' : ''} to Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
