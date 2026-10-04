// src/components/chat/ChatbotWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Sparkles,
  Heart,
  Bed,
  MessageSquareQuote,
  ListFilter,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2,
  Zap,
  Waves,
  Navigation,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/services/apiClient";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  let raw = typeof img === "string" ? img : img.url || img.path || "";
  raw = String(raw).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  return `${BACKEND_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const QUICK_SUGGESTIONS = [
  { label: "⚡ Thuê phòng theo giờ", text: "Tìm phòng thuê theo giờ giá tốt" },
  { label: "🌊 Khách sạn gần biển", text: "Tìm khách sạn gần biển view đẹp" },
  { label: "📍 Gần trung tâm", text: "Tìm khách sạn gần trung tâm thành phố" },
  { label: "💰 Phòng dưới 500k", text: "Tìm khách sạn giá dưới 500k" },
  { label: "🌙 Thuê phòng qua đêm", text: "Tìm khách sạn thuê qua đêm" },
  {
    label: "💳 Cách thanh toán",
    text: "Hệ thống hỗ trợ những phương thức thanh toán nào?",
  },
];

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      message:
        "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng theo giờ, qua đêm hoặc theo ngày với giá tốt nhất. Bạn dự định đi đâu?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const messagesEndRef = useRef(null);
  const [sessionId, setSessionId] = useState(`guest_${Date.now()}`);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    if (!customText) setInputMessage("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", message: textToSend },
    ]);
    setLoading(true);

    try {
      const res = await apiClient.post("/chatbot/message", {
        message: textToSend,
        session_id: sessionId,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message:
            res?.reply || res?.data?.reply || "Dạ mình đã ghi nhận thông tin!",
          suggestions: res?.suggestions || res?.data?.suggestions || [],
          filter: res?.filter || res?.data?.filter || {},
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message:
            "Dạ kết nối tạm thời gián đoạn. Bạn thử lại sau ít giây nhé!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(`guest_${Date.now()}`);
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        message:
          "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng theo giờ, qua đêm hoặc theo ngày với giá tốt nhất. Bạn dự định đi đâu?",
      },
    ]);
  };

  const toggleFav = (hotelId) => {
    setFavorites((prev) => ({ ...prev, [hotelId]: !prev[hotelId] }));
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  const getPriceLabel = (rentalType) => {
    if (rentalType === "HOUR") return "1 giờ đầu";
    if (rentalType === "OVERNIGHT") return "qua đêm";
    return "mỗi đêm";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* NÚT BẬT CHAT */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#003580] hover:bg-blue-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
          title="Trợ lý du lịch AI - GoStay"
        >
          <Sparkles size={24} className="text-white animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </button>
      )}

      {/* CỬA SỔ CHAT */}
      {isOpen && (
        <div className="bg-white w-[360px] sm:w-[440px] h-[600px] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* HEADER */}
          <div className="bg-[#003580] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white leading-none">
                  GoStay AI
                </h3>
                <span className="text-[10px] text-blue-200">
                  Trợ lý tìm phòng thông minh
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition"
                title="Đoạn chat mới"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* NỘI DUNG CHAT */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 text-xs">
            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" /> Gợi ý nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.text)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl text-gray-700 hover:text-[#003580] text-[11px] font-semibold transition"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isBot = m.role === "assistant";
              return (
                <div key={m.id} className="space-y-3">
                  <div
                    className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl whitespace-pre-line leading-relaxed text-xs max-w-[88%] ${
                        isBot
                          ? "bg-white text-gray-800 border border-gray-200 rounded-bl-xs shadow-2xs"
                          : "bg-[#003580] text-white font-medium rounded-br-xs"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>

                  {/* THẺ KHÁCH SẠN */}
                  {isBot && m.suggestions && m.suggestions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {m.suggestions.map((h) => {
                          const targetId = h.hotel_id || h.id;
                          const roomImg = parseImageUrl(h.hotel_image);
                          const isFav = Boolean(favorites[targetId]);
                          const priceNum = Number(h.price || 100000);

                          return (
                            <div
                              key={h.room_id || targetId}
                              className="w-[210px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between shrink-0 snap-start"
                            >
                              <div className="relative h-28 w-full bg-gray-100">
                                <img
                                  src={roomImg}
                                  alt={h.hotel_name}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleFav(targetId)}
                                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow ${
                                    isFav
                                      ? "bg-white text-rose-500"
                                      : "bg-black/40 text-white"
                                  }`}
                                >
                                  <Heart
                                    size={12}
                                    fill={isFav ? "currentColor" : "none"}
                                  />
                                </button>
                              </div>

                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-amber-400 text-[9px]">
                                    {"⭐".repeat(h.star_rating || 3)}
                                    {h.is_beachfront && (
                                      <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-1 py-0.2 rounded ml-1 flex items-center gap-0.5">
                                        <Waves size={9} /> Biển
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                                    {h.hotel_name}
                                  </h4>
                                  <p className="text-[10px] text-blue-700 font-medium truncate">
                                    🛏️ {h.room_name}
                                  </p>
                                  {h.distance_to_center && (
                                    <div className="flex items-center gap-1 text-[9px] text-gray-500">
                                      <Navigation size={9} /> Cách TT{" "}
                                      {h.distance_to_center} km
                                    </div>
                                  )}
                                </div>

                                <div className="pt-1.5 border-t border-gray-100">
                                  <span className="text-[9px] text-gray-400 block">
                                    Giá {getPriceLabel(m.filter?.rentalType)}:
                                  </span>
                                  <span className="text-xs font-black text-[#ff6a00]">
                                    {formatVND(priceNum)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate(`/hotel/${targetId}`);
                                  }}
                                  className="w-full py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-[10px] rounded-lg transition"
                                >
                                  Xem chi tiết
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(
                            `/hotels?destination=${encodeURIComponent(m.filter?.city || "")}`,
                          );
                        }}
                        className="font-bold text-[#006ce4] hover:underline flex items-center gap-1 text-xs"
                      >
                        <ListFilter size={13} /> Xem thêm các chỗ nghỉ khác
                        &rarr;
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-center text-gray-500 text-xs bg-white p-3 rounded-2xl border border-gray-200 w-fit">
                <Loader2 size={14} className="animate-spin text-[#003580]" />
                <span>GoStay AI đang tìm kiếm...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Nhập yêu cầu (VD: Khách sạn Vũng Tàu gần biển)..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] focus:bg-white"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2 bg-[#003580] hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl transition"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
