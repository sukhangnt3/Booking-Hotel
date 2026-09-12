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
        "Xin chào, tôi có thể tìm chỗ nghỉ, hoạt động cho bạn hoặc trả lời các câu hỏi về du lịch. Tôi có thể giúp được gì cho bạn?",
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
          "Xin chào, tôi có thể tìm chỗ nghỉ, hoạt động cho bạn hoặc trả lời các câu hỏi về du lịch. Tôi có thể giúp được gì cho bạn?",
      },
    ]);
  };

  const toggleFav = (hotelId) => {
    setFavorites((prev) => ({ ...prev, [hotelId]: !prev[hotelId] }));
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " VND";

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* NÚT BẬT CHAT NỔI */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#003580] hover:bg-blue-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer group"
          title="Chat AI (beta) - GoStay"
        >
          <MessageCircle size={26} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* CỬA SỔ CHAT AI (CHUẨN BOOKING.COM) */}
      {isOpen && (
        <div className="bg-white w-[375px] sm:w-[460px] h-[640px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* HEADER CHAT AI (BETA) */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-700 cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-extrabold text-base text-slate-900">
                Chat AI{" "}
                <span className="text-xs font-normal text-slate-500">
                  (beta)
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-700 cursor-pointer"
                title="Bắt đầu cuộc trò chuyện mới"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* KHUNG NỘI DUNG CHAT */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 text-xs">
            {messages.map((m) => {
              const isBot = m.role === "assistant";

              return (
                <div key={m.id} className="space-y-3">
                  {/* BONG BÓNG TIN NHẮN */}
                  <div
                    className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl whitespace-pre-line leading-relaxed text-xs max-w-[90%] shadow-xs ${
                        isBot
                          ? "bg-white text-slate-800 border border-slate-200"
                          : "bg-slate-200 text-slate-900 font-medium"
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
                              className="w-[210px] sm:w-[220px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between shrink-0 snap-start select-none"
                            >
                              {/* ẢNH & TIM */}
                              <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                                <img
                                  src={roomImg}
                                  alt={h.hotel_name || h.name}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleFav(targetId)}
                                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition ${
                                    isFav
                                      ? "bg-white text-rose-500"
                                      : "bg-black/30 text-white hover:bg-white hover:text-rose-500"
                                  }`}
                                >
                                  <Heart
                                    size={14}
                                    fill={isFav ? "currentColor" : "none"}
                                  />
                                </button>
                              </div>

                              {/* THÔNG TIN */}
                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="flex text-amber-400 text-[10px]">
                                    {"⭐".repeat(h.star_rating || 3)}
                                  </div>

                                  <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-tight">
                                    {h.hotel_name || h.name}
                                  </h4>

                                  <p className="text-[10px] text-slate-500">
                                    {h.city || "Việt Nam"}
                                  </p>

                                  {/* ĐIỂM ĐÁNH GIÁ */}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className="bg-[#003580] text-white font-black text-[10px] px-1.5 py-0.5 rounded">
                                      {Number(h.average_rating || 8.5).toFixed(
                                        1,
                                      )}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-700">
                                      {Number(h.average_rating || 8.5) >= 9
                                        ? "Tuyệt vời"
                                        : "Rất tốt"}
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      • {h.review_count || 120} đánh giá
                                    </span>
                                  </div>
                                </div>

                                {/* GIÁ TIỀN */}
                                <div className="pt-2 border-t border-slate-100">
                                  <span className="text-[9px] text-slate-400 line-through block">
                                    VND {originalPrice.toLocaleString("vi-VN")}
                                  </span>
                                  <span className="text-sm font-black text-slate-900 block">
                                    VND {priceNum.toLocaleString("vi-VN")}
                                  </span>
                                </div>

                                {/* 2 NÚT THAO TÁC */}
                                <div className="pt-2 space-y-1.5 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/hotel/${targetId}`);
                                    }}
                                    className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-[#003580] font-bold text-[11px] rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                                    className="w-full py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <MessageSquareQuote size={13} /> Đặt câu hỏi
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* NÚT XEM TẤT CẢ KẾT QUẢ & ĐÁNH GIÁ THÍCH / KHÔNG THÍCH */}
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
                          <ListFilter size={14} /> Xem tất cả kết quả
                        </button>

                        <div className="flex items-center gap-2 text-slate-400">
                          <button
                            type="button"
                            onClick={() => alert("Cảm ơn bạn đã phản hồi!")}
                            className="p-1 hover:text-[#006ce4] cursor-pointer"
                            title="Hữu ích"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              alert("Cảm ơn bạn đã đóng góp ý kiến!")
                            }
                            className="p-1 hover:text-rose-500 cursor-pointer"
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
              <div className="flex gap-2 justify-start items-center text-slate-400 text-xs italic bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <Loader2 size={14} className="animate-spin text-[#003580]" />{" "}
                GoStay AI đang tìm kiếm phòng phù hợp nhất...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô NHẬP TIN NHẮN */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                placeholder="Soạn tin nhắn..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#003580] focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 bg-[#003580] hover:bg-blue-900 disabled:opacity-30 text-white rounded-xl transition cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>

            <p className="text-[10px] text-center text-slate-400 mt-2">
              Kết quả có thể không đúng. Đọc{" "}
              <span className="text-[#006ce4] underline cursor-pointer">
                bảo mật & sử dụng
              </span>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
