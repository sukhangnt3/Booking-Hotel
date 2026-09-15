// src/components/chat/ChatbotWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bed,
  MessageSquareQuote,
  ListFilter,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Plus,
  Loader2,
  Bot,
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
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      message:
        "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng khách sạn giá tốt, gợi ý điểm đến hấp dẫn hoặc hỗ trợ giải đáp thắc mắc về chuyến đi. Bạn cần hỗ trợ gì hôm nay?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const messagesEndRef = useRef(null);

  const sessionId = useRef(`guest_${Date.now()}`).current;

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

      const botReply =
        res?.reply || res?.data?.reply || "Dạ em đã ghi nhận thông tin!";
      const suggestions = res?.suggestions || res?.data?.suggestions || [];
      const filter = res?.filter || res?.data?.filter || {};

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message: botReply,
          suggestions: suggestions,
          filter: filter,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message:
            "Dạ tạm thời em đang bận một chút, bạn thử lại sau ít giây nhé!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        message:
          "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng khách sạn giá tốt, gợi ý điểm đến hấp dẫn hoặc hỗ trợ giải đáp thắc mắc về chuyến đi. Bạn cần hỗ trợ gì hôm nay?",
      },
    ]);
  };

  const toggleFav = (hotelId) => {
    setFavorites((prev) => ({ ...prev, [hotelId]: !prev[hotelId] }));
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* NÚT BẬT CHAT NỔI THEO PHONG CÁCH GHOSTAY */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#003580] hover:bg-blue-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 group"
          title="Trợ lý du lịch AI - GoStay"
        >
          <Sparkles size={24} className="text-white animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </button>
      )}

      {/* CỬA SỔ CHAT AI (CHUẨN GIAO DIỆN GHOSTAY) */}
      {isOpen && (
        <div className="bg-white w-[375px] sm:w-[460px] h-[640px] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* HEADER CHAT SANG TRỌNG VỚI TÔNG XANH NAVY #003580 */}
          <div className="bg-[#003580] text-white px-5 py-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-white tracking-tight leading-none">
                    GoStay AI
                  </h3>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white cursor-pointer transition"
                title="Bắt đầu cuộc trò chuyện mới"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* KHUNG NỘI DUNG CHAT */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 text-xs">
            {messages.map((m) => {
              const isBot = m.role === "assistant";

              return (
                <div key={m.id} className="space-y-3">
                  {/* BONG BÓNG TIN NHẮN */}
                  <div
                    className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl whitespace-pre-line leading-relaxed text-xs max-w-[90%] shadow-2xs ${
                        isBot
                          ? "bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs"
                          : "bg-[#003580] text-white font-medium rounded-br-xs"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>

                  {/* BĂNG CHUYỀN THẺ KHÁCH SẠN VUỐT NGANG (CAROUSEL SLIDER) */}
                  {isBot && m.suggestions && m.suggestions.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
                        {m.suggestions.map((h) => {
                          const targetId = h.hotel_id || h.id;
                          const roomImg = parseImageUrl(
                            h.hotel_image || h.image || h.thumbnail,
                          );
                          const isFav = Boolean(favorites[targetId]);
                          const priceNum = Number(h.price || 850000);
                          const originalPrice = Math.round(priceNum * 1.35);

                          return (
                            <div
                              key={h.room_id || targetId}
                              className="w-[215px] sm:w-[225px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between shrink-0 snap-start select-none"
                            >
                              {/* ẢNH & NÚT TIM */}
                              <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
                                <img
                                  src={roomImg}
                                  alt={h.hotel_name || h.name}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleFav(targetId)}
                                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition cursor-pointer ${
                                    isFav
                                      ? "bg-white text-rose-500"
                                      : "bg-black/35 text-white hover:bg-white hover:text-rose-500"
                                  }`}
                                >
                                  <Heart
                                    size={14}
                                    fill={isFav ? "currentColor" : "none"}
                                  />
                                </button>
                              </div>

                              {/* THÔNG TIN CHỖ NGHỈ */}
                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="flex text-amber-400 text-[10px]">
                                    {"⭐".repeat(h.star_rating || 3)}
                                  </div>

                                  <h4 className="font-black text-xs text-[#0a2540] line-clamp-2 leading-tight">
                                    {h.hotel_name || h.name}
                                  </h4>

                                  <p className="text-[10px] text-gray-500 font-medium">
                                    {h.city || "Việt Nam"}
                                  </p>

                                  {/* ĐIỂM ĐÁNH GIÁ */}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className="bg-[#003580] text-white font-black text-[10px] px-1.5 py-0.5 rounded-md">
                                      {Number(h.average_rating || 8.5).toFixed(
                                        1,
                                      )}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-700">
                                      {Number(h.average_rating || 8.5) >= 9
                                        ? "Tuyệt vời"
                                        : "Rất tốt"}
                                    </span>
                                    <span className="text-[9px] text-gray-400">
                                      • {h.review_count || 120} đánh giá
                                    </span>
                                  </div>
                                </div>

                                {/* GIÁ TIỀN */}
                                <div className="pt-2 border-t border-gray-100">
                                  <span className="text-[9px] text-gray-400 line-through block tabular-nums">
                                    {originalPrice.toLocaleString("vi-VN")} ₫
                                  </span>
                                  <span className="text-sm font-black text-[#ff6a00] block tabular-nums">
                                    {priceNum.toLocaleString("vi-VN")} ₫
                                  </span>
                                </div>

                                {/* THAO TÁC */}
                                <div className="pt-2 space-y-1.5 border-t border-gray-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/hotel/${targetId}`);
                                    }}
                                    className="w-full py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold text-[11px] rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                                  >
                                    <Bed size={13} /> Xem chi tiết
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(
                                        `Cho tôi biết thêm thông tin chi tiết về khách sạn ${h.hotel_name || h.name}`,
                                      )
                                    }
                                    className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-[11px] rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <MessageSquareQuote size={13} /> Đặt câu hỏi
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* XEM TẤT CẢ KẾT QUẢ */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            const dest = m.filter?.city || "";
                            const checkIn = m.filter?.checkIn || "";
                            const checkOut = m.filter?.checkOut || "";
                            navigate(
                              `/hotels?destination=${encodeURIComponent(dest)}&checkIn=${checkIn}&checkOut=${checkOut}`,
                            );
                          }}
                          className="font-bold text-[#006ce4] hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <ListFilter size={14} /> Xem tất cả chỗ nghỉ phù hợp
                          &rarr;
                        </button>

                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            type="button"
                            onClick={() => alert("Cảm ơn bạn đã phản hồi!")}
                            className="p-1 hover:text-[#006ce4] cursor-pointer transition"
                            title="Hữu ích"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              alert("Cảm ơn bạn đã đóng góp ý kiến!")
                            }
                            className="p-1 hover:text-rose-500 cursor-pointer transition"
                            title="Chưa đúng ý"
                          >
                            <ThumbsDown size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 justify-start items-center text-gray-500 text-xs font-medium bg-white p-3 rounded-2xl border border-gray-200 w-fit shadow-2xs">
                <Loader2 size={14} className="animate-spin text-[#003580]" />
                <span>GoStay AI đang tìm kiếm phòng phù hợp nhất...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô NHẬP TIN NHẮN */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                placeholder="Nhập yêu cầu tìm phòng (VD: Khách sạn ở Đà Nẵng dưới 1 triệu)..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] focus:bg-white transition font-medium"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 bg-[#003580] hover:bg-blue-900 disabled:opacity-30 text-white rounded-xl transition cursor-pointer shadow-xs"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
