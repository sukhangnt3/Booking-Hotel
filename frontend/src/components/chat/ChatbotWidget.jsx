// src/components/chat/ChatbotWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/services/apiClient";

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      message:
        "Xin chào! Em là trợ lý GoStay AI. Bạn đang muốn tìm khách sạn ở thành phố nào, hoặc tầm giá bao nhiêu ạ?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sessionId = useRef(`guest_${Date.now()}`).current;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", message: userText },
    ]);
    setLoading(true);

    try {
      const res = await apiClient.post("/chatbot/message", {
        message: userText,
        session_id: sessionId,
      });

      const botReply = res?.reply || "Dạ em đã ghi nhận thông tin!";
      const suggestions = res?.suggestions || [];

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message: botReply,
          suggestions: suggestions,
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

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* Nút bật tắt chat nổi */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#003580] hover:bg-blue-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer group"
          title="Trợ lý tìm phòng GoStay"
        >
          <MessageCircle size={26} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="bg-white w-[350px] sm:w-[380px] h-[520px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#003580] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/15 rounded-xl">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  GoStay AI Assistant{" "}
                  <Sparkles size={13} className="text-amber-300" />
                </h4>
                <span className="text-[10px] text-blue-200">
                  Hỗ trợ tìm phòng & tư vấn 24/7
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Khung chat */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((m) => {
              const isBot = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isBot ? "justify-start" : "justify-end"}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-[#003580] flex items-center justify-center shrink-0">
                      <Bot size={14} />
                    </div>
                  )}

                  <div className="space-y-2 max-w-[80%]">
                    <div
                      className={`p-3 rounded-2xl whitespace-pre-line leading-relaxed shadow-xs ${
                        isBot
                          ? "bg-white text-slate-800 border border-slate-200"
                          : "bg-[#003580] text-white"
                      }`}
                    >
                      {m.message}
                    </div>

                    {/* Thẻ gợi ý khách sạn có thể bấm xem ngay */}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {m.suggestions.map((h) => (
                          <div
                            key={h.id}
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/hotel/${h.id}`);
                            }}
                            className="p-2.5 bg-white border border-blue-200 rounded-xl hover:border-blue-500 cursor-pointer shadow-xs transition flex items-center justify-between"
                          >
                            <div className="overflow-hidden pr-2">
                              <span className="font-bold text-[11px] text-slate-900 block truncate">
                                {h.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {h.city} • ⭐ {h.star_rating} sao
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                              {Number(h.price).toLocaleString("vi-VN")} ₫
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0">
                      <User size={14} />
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-2 justify-start items-center text-slate-400 text-[11px] italic">
                <Bot size={14} className="animate-spin" /> GoStay AI đang tìm
                chỗ nghỉ tốt nhất...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder="VD: Tìm khách sạn ở Đà Nẵng dưới 1 triệu..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#003580]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2 bg-[#003580] hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
