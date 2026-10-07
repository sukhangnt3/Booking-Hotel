// src/components/chat/OwnerAiAssistant.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Bot,
  RotateCcw,
  Loader2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import apiClient from "@/services/apiClient";

function OwnerAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      message: `Xin chào Quản lý! Tôi là GoStay AI Cố vấn Tài chính Khách sạn. Tôi được tích hợp Google Gemini để phân tích doanh thu, tỷ lệ lấp đầy và tư vấn giải pháp kiểm soát dòng tiền an toàn bảo mật.`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      // 1. Thu thập dữ liệu thống kê kinh doanh vĩ mô hiện tại từ hệ thống
      const statsRes = await apiClient
        .get(
          `/owner/stats?hotel_id=all&revenue_range=this_month&occupancy_range=this_month`,
        )
        .catch(() => null);

      const statsData = statsRes?.data || statsRes || {};

      // 2. Gửi yêu cầu tư vấn đến Backend Gemini với cơ chế khử định danh PII (Privacy Protection)
      const aiResponse = await apiClient.post("/chatbot/financial-advice", {
        question: textToSend,
        statsData: {
          period: "this_month",
          revenueTotal: statsData.revenueTotal || 0,
          occupancyCurrent: statsData.occupancyCurrent || {
            rate: 0,
            occupied: 0,
            vacant: 0,
          },
          automationSummary: statsData.automationSummary || {
            paymentAlerts: [],
            totalUnpaidAmount: 0,
            leakAlerts: [],
            potentialLeakTotal: 0,
          },
        },
      });

      const adviceReply =
        aiResponse?.data?.advice ||
        aiResponse?.advice ||
        "GoStay AI đã ghi nhận yêu cầu và đang đồng bộ dữ liệu.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message: adviceReply,
        },
      ]);
    } catch (err) {
      console.error("Lỗi khi kết nối với AI tư vấn tài chính:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message:
            "Không thể kết nối với dịch vụ Gemini AI lúc này. Vui lòng kiểm tra lại cấu hình API key trên máy chủ.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* NÚT BẬT TRỢ LÝ AI DÀNH CHO OWNER */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 bg-[#003580] hover:bg-blue-900 text-white rounded-2xl shadow-xl flex items-center gap-2.5 transition active:scale-95 cursor-pointer border border-white/20"
        >
          <Sparkles size={18} className="text-amber-300 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider">
            Gemini Cố Vấn Tài Chính
          </span>
        </button>
      )}

      {/* CỬA SỔ HỘI THOẠI AI */}
      {isOpen && (
        <div className="bg-white w-[360px] sm:w-[440px] h-[600px] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header Cửa sổ Chat */}
          <div className="bg-[#003580] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider leading-tight flex items-center gap-1.5">
                  <span>GoStay Financial AI</span>
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                    Gemini Grounded
                  </span>
                </div>
                <div className="text-[10px] text-blue-200 font-semibold leading-tight mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  <span>Dữ liệu được khử định danh & bảo vệ riêng tư</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      message:
                        "Đã làm mới phiên tư vấn! Bạn cần phân tích chỉ số tài chính hay tối ưu hóa doanh thu nào?",
                    },
                  ])
                }
                className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Gợi ý câu hỏi nhanh về tài chính */}
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1.5">
            {[
              "Tư vấn giải pháp tăng doanh thu",
              "Phân tích rò rỉ phụ phí trễ giờ",
              "Kiểm toán công nợ phòng chưa thu",
              "Chiến lược giá cải thiện công suất",
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] bg-white hover:bg-blue-50 hover:text-[#003580] text-gray-700 font-bold px-2.5 py-1 rounded-xl border border-gray-200 transition cursor-pointer shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Khung hiển thị nội dung tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] text-xs">
            {messages.map((m) => {
              const isBot = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl whitespace-pre-line leading-relaxed max-w-[90%] shadow-xs ${
                      isBot
                        ? "bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs"
                        : "bg-[#003580] text-white font-semibold rounded-br-xs"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-center text-gray-500 text-xs bg-white p-3 rounded-2xl border border-gray-200 w-fit shadow-xs">
                <Loader2 size={14} className="animate-spin text-[#006ce4]" />
                <span className="font-semibold">
                  Gemini đang phân tích số liệu tài chính & tối ưu hóa...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập câu hỏi */}
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
                placeholder="Hỏi về doanh thu, rò rỉ phụ phí, tư vấn giá..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] focus:bg-white transition font-medium"
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

export default OwnerAiAssistant;
