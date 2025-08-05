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

// Theme configuration - easily swappable
const theme = {
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
};

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  last_seen?: string;
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  // Loading states
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingDM, setCreatingDM] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Modal states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

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
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setCurrentProfile(profile);
        }

        // Update last_seen for presence
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating last_seen:", updateError);
        }
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
          // If error is due to session, might need to re-auth
        }
      }
    }, 60000); // Update every minute

    return () => clearInterval(presenceInterval);
  }, [supabase, userId]);

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
          // You would ideally fetch the latest message timestamp for each room
          // and sort by that. For now, sorting by room creation.
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
        setRooms([]); // Ensure rooms is an empty array on error
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();

    // Subscribe to room changes (new rooms, member changes)
    const roomSubscription = supabase
      .channel("room_changes")
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
          // Reload rooms when a user is added to a new room
          loadRooms();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_members",
        },
        (payload) => {
          console.log("Room member updated:", payload);
          // Could update member count or handle member status changes
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSubscription);
    };
  }, [userId, supabase, selectedRoom]); // Add selectedRoom to dependency to avoid stale closure

  // Load messages for selected room + subscribe to new messages
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
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
        // Scroll to bottom after messages load
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();

    // Subscribe to new messages in this room
    const messageSubscription = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
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
            setMessages((prev) => [...prev, typedMessage]);
            // Scroll to bottom when new message arrives
            setTimeout(scrollToBottom, 100);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
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

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: message.trim(),
      sender_id: userId,
      created_at: new Date().toISOString(),
      profiles: currentProfile || { id: userId, username: "You" }, // Fallback
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, tempMessage]);
    setMessage("");
    scrollToBottom();

    try {
      const { error } = await supabase.from("messages").insert([
        {
          room_id: selectedRoom.id,
          sender_id: userId,
          content: message.trim(),
        },
      ]);

      if (error) throw error;
      // Message will be replaced by the real-time subscription
    } catch (error) {
      console.error("Send message error:", error);
      // Remove temp message and show error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line in textarea if used
      handleSendMessage();
    }
  };

  const createDirectMessage = async (otherUserId: string) => {
    if (creatingDM) return; // Prevent double clicks
    setCreatingDM(true);

    try {
      // Check if DM already exists by finding a room where:
      // 1. It's not a group chat
      // 2. Current user is a member
      // 3. The other user is also a member
      // 4. Only 2 members exist

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
        .insert([{ is_group: false }])
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

      // Refresh rooms list is handled by subscription
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

      // Refresh rooms list is handled by subscription
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: theme.colors.primary.light }}
    >
      <div className="w-full max-w-6xl h-[90vh] flex rounded-2xl shadow-2xl overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-1/3 p-6 flex flex-col"
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
              <button style={{ color: theme.colors.text.light }}>
                <MoreVertical size={20} />
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
                  onClick={() => setSelectedRoom(room)}
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
                    {" "}
                    {/* min-w-0 prevents flex issues */}
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
              </div>
            )}
          </div>
        </div>
        {/* Main Chat Area */}
        <div
          className="w-2/3 flex flex-col"
          style={{ backgroundColor: theme.colors.primary.light }}
        >
          {/* Chat Header */}
          {selectedRoom ? (
            <div
              className="p-4 flex items-center justify-between shadow-sm"
              style={{ backgroundColor: theme.colors.background.white }}
            >
              <div className="flex items-center">
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
              <div
                className="flex items-center space-x-2 text-sm"
                style={{ color: theme.colors.text.muted }}
              >
                <Lock size={16} />
                <span>End-to-end encrypted</span>
                <MoreVertical size={16} className="cursor-pointer ml-4" />
              </div>
            </div>
          ) : (
            <div
              className="p-4 flex items-center justify-center h-full"
              style={{ backgroundColor: theme.colors.background.chat }}
            >
              <p style={{ color: theme.colors.text.muted }}>
                Select a chat to start messaging
              </p>
            </div>
          )}
          {/* Messages Area */}
          <div
            className="flex-grow p-6 overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.chat }}
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
                    className={`flex mb-4 ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-t-2xl p-4 max-w-md shadow-sm ${
                        msg.sender_id === userId
                          ? "rounded-bl-2xl"
                          : "rounded-br-2xl"
                      }`}
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
                <div ref={messagesEndRef} /> {/* Invisible div for scrolling */}
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
                {/* <Plus size={20} style={{ color: theme.colors.text.muted }} className="cursor-pointer" /> */}
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
                  disabled={!selectedRoom} // Disable if no room selected (shouldn't happen)
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
              {" "}
              {/* min-h-0 for flex scrolling */}
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
    </div>
  );
}
