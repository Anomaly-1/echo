// eslint-disable-next-line @typescript-eslint/no-explicit-any
"use client";

import { useEffect, useState } from "react";
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

  // Modal states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get logged in user ID and profile
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        setCurrentProfile(profile);
      }
    };
    getUser();
  }, [supabase]);

  // Load rooms for the logged in user
  useEffect(() => {
    if (!userId) return;

    const loadRooms = async () => {
      const { data: roomMemberships } = await supabase
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

      if (!roomMemberships) return;

      const roomsWithDetails = await Promise.all(
        roomMemberships.map(async (membership: any) => {
          const room = membership.chat_rooms;

          if (room.is_group) {
            // For group chats, get member count
            const { count } = await supabase
              .from("room_members")
              .select("*", { count: "exact", head: true })
              .eq("room_id", room.id);

            return {
              ...room,
              member_count: count || 0,
            };
          } else {
            // For direct messages, get the other user's info
            const { data: otherMember } = await supabase
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
              .neq("user_id", userId)
              .single();

            return {
              ...room,
              other_user: otherMember?.profiles,
            };
          }
        }),
      );

      setRooms(roomsWithDetails);
      if (roomsWithDetails.length > 0) {
        setSelectedRoom(roomsWithDetails[0]);
      }
    };

    loadRooms();
  }, [userId, supabase]);

  // Load messages for selected room + subscribe to new messages
  useEffect(() => {
    if (!selectedRoom) return;

    const loadMessages = async () => {
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

      if (!error && data) {
        // Type assertion to ensure correct structure
        const typedMessages = data.map((msg) => ({
          ...msg,
          profiles: Array.isArray(msg.profiles)
            ? msg.profiles[0]
            : msg.profiles,
        })) as Message[];
        setMessages(typedMessages);
      } else {
        console.error("Error loading messages:", error.message);
      }
    };

    loadMessages();

    // Subscribe to new messages in this room
    const channel = supabase
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
          const { data: newMessage } = await supabase
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

          if (newMessage) {
            // Ensure profiles is a single object, not an array
            const typedMessage = {
              ...newMessage,
              profiles: Array.isArray(newMessage.profiles)
                ? newMessage.profiles[0]
                : newMessage.profiles,
            } as Message;

            setMessages((prev) => [...prev, typedMessage]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, supabase]);

  // Load available users for new chats
  const loadAvailableUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, last_seen")
      .neq("id", userId)
      .order("username");

    setAvailableUsers(data || []);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedRoom || !userId) return;

    const { error } = await supabase.from("messages").insert([
      {
        room_id: selectedRoom.id,
        sender_id: userId,
        content: message.trim(),
      },
    ]);

    if (error) {
      console.error("Send message error:", error.message);
    } else {
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const createDirectMessage = async (otherUserId: string) => {
    // Check if DM already exists
    const { data: existingRoom } = await supabase
      .from("room_members")
      .select(
        `
        room_id,
        chat_rooms!inner (
          id,
          is_group
        )
      `,
      )
      .eq("user_id", userId)
      .eq("chat_rooms.is_group", false);

    if (existingRoom) {
      for (const room of existingRoom) {
        const { data: otherMember } = await supabase
          .from("room_members")
          .select("user_id")
          .eq("room_id", room.room_id)
          .eq("user_id", otherUserId)
          .single();

        if (otherMember) {
          // Room already exists, select it
          const existingRoomDetails = rooms.find((r) => r.id === room.room_id);
          if (existingRoomDetails) {
            setSelectedRoom(existingRoomDetails);
            setShowNewChatModal(false);
            return;
          }
        }
      }
    }

    // Create new DM room
    const { data: newRoom, error: roomError } = await supabase
      .from("chat_rooms")
      .insert([{ is_group: false }])
      .select()
      .single();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return;
    }

    // Add both users to the room
    const { error: membersError } = await supabase.from("room_members").insert([
      { room_id: newRoom.id, user_id: userId },
      { room_id: newRoom.id, user_id: otherUserId },
    ]);

    if (membersError) {
      console.error("Error adding members:", membersError);
      return;
    }

    // Refresh rooms list
    window.location.reload();
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

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

    if (roomError) {
      console.error("Error creating group:", roomError);
      return;
    }

    // Add all selected users plus current user to the room
    const memberInserts = [
      { room_id: newRoom.id, user_id: userId },
      ...selectedUsers.map((userId) => ({
        room_id: newRoom.id,
        user_id: userId,
      })),
    ];

    const { error: membersError } = await supabase
      .from("room_members")
      .insert(memberInserts);

    if (membersError) {
      console.error("Error adding members:", membersError);
      return;
    }

    // Reset form and refresh
    setGroupName("");
    setSelectedUsers([]);
    setShowNewGroupModal(false);
    window.location.reload();
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
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={() => {
                  loadAvailableUsers();
                  setShowNewGroupModal(true);
                }}
                style={{ color: theme.colors.text.light }}
                title="New Group Chat"
              >
                <Users size={20} />
              </button>
              <button style={{ color: theme.colors.text.light }}>
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-grow overflow-y-auto -mr-6 pr-4 space-y-2">
            {rooms.map((room) => (
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
                <div className="flex-grow">
                  <h3
                    className="font-semibold"
                    style={{ color: theme.colors.text.light }}
                  >
                    {room.is_group
                      ? room.name
                      : room.other_user?.username || "Unknown User"}
                  </h3>
                  {room.is_group && (
                    <p
                      className="text-xs"
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
            ))}

            {rooms.length === 0 && (
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
                    className="font-bold text-lg"
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
              className="p-4 flex items-center justify-center"
              style={{ backgroundColor: theme.colors.background.white }}
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
            {selectedRoom &&
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-4 ${
                    msg.sender_id === userId ? "justify-end" : "justify-start"
                  }`}
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
                        className="text-xs font-semibold mb-1"
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
                />
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-full hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: theme.colors.primary.dark,
                    color: theme.colors.text.light,
                  }}
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
            className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden"
            style={{ backgroundColor: theme.colors.background.white }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: theme.colors.text.dark }}
              >
                Start New Chat
              </h3>
              <button onClick={() => setShowNewChatModal(false)}>
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

            <div className="max-h-48 overflow-y-auto">
              {filteredUsers.map((user) => (
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
                  <div className="flex-grow">
                    <p style={{ color: theme.colors.text.dark }}>
                      {user.username}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: theme.colors.text.muted }}
                    >
                      {isUserOnline(user.last_seen) ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Group Chat Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden"
            style={{ backgroundColor: theme.colors.background.white }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: theme.colors.text.dark }}
              >
                Create Group Chat
              </h3>
              <button onClick={() => setShowNewGroupModal(false)}>
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
              />
            </div>

            <div className="max-h-32 overflow-y-auto mb-4">
              {filteredUsers.map((user) => (
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
                  <p style={{ color: theme.colors.text.dark }}>
                    {user.username}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={createGroupChat}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="w-full p-2 rounded-lg disabled:opacity-50"
              style={{
                backgroundColor: theme.colors.primary.dark,
                color: theme.colors.text.light,
              }}
            >
              Create Group ({selectedUsers.length} members)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
