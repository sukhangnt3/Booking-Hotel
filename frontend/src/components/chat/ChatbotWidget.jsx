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
  Clock,
  Moon,
  Sun,
  Hourglass,
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
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

const QUICK_SUGGESTIONS = [
  { label: "⚡ Thuê phòng theo giờ", text: "Tìm phòng thuê theo giờ giá tốt" },
  { label: "🌊 Khách sạn gần biển", text: "Tìm khách sạn gần biển view đẹp" },
  { label: "📍 Gần trung tâm", text: "Tìm khách sạn gần trung tâm thành phố" },
  { label: "💰 Phòng dưới 500k", text: "Tìm khách sạn giá dưới 500k" },
  { label: "🌙 Thuê phòng qua đêm", text: "Tìm khách sạn thuê qua đêm" },
  {
    label: "💳 Phương thức thanh toán",
    text: "Hệ thống hỗ trợ những phương thức thanh toán nào?",
  },
  {
    label: "📞 Hotline tổng đài GoStay",
    text: "Cho tôi số hotline tổng đài hỗ trợ GoStay",
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
        "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng theo giờ, qua đêm hoặc theo ngày với giá tốt nhất giữa các cơ sở lưu trú. Bạn dự định đi đâu hôm nay?",
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
            "Dạ tôi đã ghi nhận yêu cầu của bạn. Bạn thử lại sau ít giây hoặc chọn các gợi ý bên dưới nhé!",
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
          "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng theo giờ, qua đêm hoặc theo ngày với giá tốt nhất giữa các cơ sở lưu trú. Bạn dự định đi đâu hôm nay?",
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
    if (rentalType === "HALF_DAY") return "1 buổi";
    return "mỗi đêm";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* NÚT BẬT CHAT NỔI */}
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

      {/* CỬA SỔ CHAT AI */}
      {isOpen && (
        <div className="bg-white w-[375px] sm:w-[460px] h-[640px] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* HEADER CHAT */}
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
                <span className="text-[10px] text-blue-200 mt-1 block">
                  Trợ lý tư vấn & tìm phòng thông minh
                </span>
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
            {/* GỢI Ý CÂU HỎI NHANH */}
            {messages.length === 1 && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" /> Gợi ý tìm kiếm
                  nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.text)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-gray-700 hover:text-[#003580] text-[11px] font-semibold shadow-2xs transition cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isBot = m.role === "assistant";
              const currentRentalType = m.filter?.rentalType || "DAY";

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

                  {/* BĂNG CHUYỀN THẺ KHÁCH SẠN */}
                  {isBot && m.suggestions && m.suggestions.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
                        {m.suggestions.map((h) => {
                          const targetId = h.hotel_id || h.id;
                          const roomImg = parseImageUrl(
                            h.hotel_image || h.image || h.thumbnail,
                          );
                          const isFav = Boolean(favorites[targetId]);
                          const priceNum = Number(h.price || 100000);
                          const originalPrice = Math.round(priceNum * 1.25);
                          const ratingNum = Number(h.average_rating || 0);
                          const reviewCount = Number(h.review_count || 0);

                          // 🌟 CHUẨN UX: TIÊU ĐỀ CHÍNH LÀ TÊN KHÁCH SẠN
                          const hotelTitle =
                            h.hotel_name || h.name || "Khách sạn nghỉ dưỡng";
                          const roomSubtitle = h.room_name
                            ? `🛏️ ${h.room_name}`
                            : "🏨 Chỗ nghỉ tiêu biểu";

                          return (
                            <div
                              key={h.room_id || targetId}
                              className="w-[220px] sm:w-[230px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between shrink-0 snap-start select-none"
                            >
                              {/* ẢNH & NÚT TIM */}
                              <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
                                <img
                                  src={roomImg}
                                  alt={hotelTitle}
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="flex text-amber-400 text-[10px]">
                                      {"⭐".repeat(h.star_rating || 3)}
                                    </div>
                                    {/* HUY HIỆU GIÁP BIỂN */}
                                    {h.is_beachfront && (
                                      <span className="text-[9px] font-black text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                        <Waves
                                          size={10}
                                          className="text-cyan-600"
                                        />
                                        Giáp biển
                                      </span>
                                    )}
                                  </div>

                                  {/* 🌟 1. TÊN KHÁCH SẠN LÀ TIÊU ĐỀ CHÍNH BẬT NỔI BẬT */}
                                  <h4
                                    className="font-black text-xs text-[#0a2540] line-clamp-1 leading-tight"
                                    title={hotelTitle}
                                  >
                                    🏨 {hotelTitle}
                                  </h4>

                                  {/* 🌟 2. TÊN HẠNG PHÒNG VÀ ĐỊA ĐIỂM Ở DÒNG PHỤ */}
                                  <p className="text-[10px] text-blue-700 font-bold truncate">
                                    {roomSubtitle} • {h.city || "Việt Nam"}
                                  </p>

                                  {/* KHOẢNG CÁCH TỚI TRUNG TÂM */}
                                  {h.distance_to_center && (
                                    <div className="flex items-center gap-1 text-[10px] text-amber-800 font-semibold bg-amber-50/70 border border-amber-200/60 px-1.5 py-0.5 rounded-md w-fit">
                                      <Navigation
                                        size={10}
                                        className="text-amber-600 shrink-0"
                                      />
                                      <span>
                                        Cách TT {h.distance_to_center} km
                                      </span>
                                    </div>
                                  )}

                                  {reviewCount > 0 && ratingNum > 0 ? (
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <span className="bg-[#003580] text-white font-black text-[10px] px-1.5 py-0.5 rounded-md">
                                        {ratingNum.toFixed(1)}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-700">
                                        {ratingNum >= 9
                                          ? "Tuyệt vời"
                                          : "Rất tốt"}
                                      </span>
                                      <span className="text-[9px] text-gray-400 truncate">
                                        • {reviewCount} đánh giá
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 pt-0.5 text-[10px] font-bold text-emerald-700">
                                      <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                        Chỗ nghỉ mới
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* GIÁ TIỀN */}
                                <div className="pt-2 border-t border-gray-100">
                                  <span className="text-[9px] text-gray-400 block font-semibold">
                                    Giá {getPriceLabel(currentRentalType)} từ:
                                  </span>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-black text-[#ff6a00] tabular-nums">
                                      {formatVND(priceNum)}
                                    </span>
                                    <span className="text-[9px] text-gray-400 line-through tabular-nums">
                                      {formatVND(originalPrice)}
                                    </span>
                                  </div>
                                </div>

                                {/* THAO TÁC */}
                                <div className="pt-2 space-y-1.5 border-t border-gray-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      const checkIn = m.filter?.checkIn || "";
                                      const checkOut = m.filter?.checkOut || "";
                                      const rental =
                                        m.filter?.rentalType || "DAY";
                                      const hours = m.filter?.hours || 2;
                                      const adults = m.filter?.adults || 1;
                                      navigate(
                                        `/hotel/${targetId}?rentalType=${rental}&hours=${hours}&adults=${adults}&checkIn=${checkIn}&checkOut=${checkOut}`,
                                      );
                                    }}
                                    className="w-full py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold text-[11px] rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                                  >
                                    <Bed size={13} /> Xem chi tiết
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(
                                        `Cho tôi biết thêm thông tin chi tiết về khách sạn ${hotelTitle}`,
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
                            const rental = m.filter?.rentalType || "DAY";
                            const hours = m.filter?.hours || 2;
                            const adults = m.filter?.adults || 1;
                            const beachfrontParam = m.filter?.is_beachfront
                              ? "&beachfront=true"
                              : "";
                            const nearCenterParam = m.filter?.near_center
                              ? "&nearCenter=true"
                              : "";
                            navigate(
                              `/hotels?destination=${encodeURIComponent(dest)}&checkIn=${checkIn}&checkOut=${checkOut}&rentalType=${rental}&hours=${hours}&adults=${adults}${beachfrontParam}${nearCenterParam}`,
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
                placeholder="Nhập yêu cầu (VD: Tìm phòng theo giờ, gần biển, có hồ bơi)..."
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
