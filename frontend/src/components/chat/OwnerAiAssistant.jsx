// src/components/chat/OwnerAiAssistant.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Send, Bot, RotateCcw, Loader2, Sparkles } from "lucide-react";
import apiClient from "@/services/apiClient";

function OwnerAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      message: `Xin chào Quản lý! Tôi là trợ lý phân tích dữ liệu toàn hệ thống GoStay. Tôi có thể hỗ trợ kiểm tra doanh thu, công suất phòng hoặc kiểm toán công nợ cho bạn.`,
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
      // Mặc định phân tích toàn bộ chuỗi hệ thống (hotel_id=all)
      const statsRes = await apiClient
        .get(`/owner/stats?hotel_id=all&range=this_month`)
        .catch(() => null);

      const lower = textToSend.toLowerCase();
      let botReply = "";

      if (statsRes) {
        const occ = statsRes.occupancyCurrent || {};
        const rev = Number(statsRes.revenueTotal || 0).toLocaleString("vi-VN");
        const unpaid = statsRes.automationSummary?.paymentAlerts || [];
        const leaks = statsRes.automationSummary?.leakAlerts || [];
        const leakTotal = Number(
          statsRes.automationSummary?.potentialLeakTotal || 0,
        ).toLocaleString("vi-VN");

        if (
          lower.includes("thanh toán") ||
          lower.includes("chưa thu") ||
          lower.includes("nợ")
        ) {
          if (unpaid.length > 0) {
            botReply =
              `Trên toàn hệ thống GoStay, có **${unpaid.length} phòng** đang lưu trú chưa thu đủ tiền:\n\n` +
              unpaid
                .map(
                  (p) =>
                    `• **Phòng ${p.room}** (${p.guest}): Nợ **${Number(p.amount).toLocaleString("vi-VN")} đ**`,
                )
                .join("\n") +
              `\n\n👉 Bạn hãy vào mục **"Cảnh báo thanh toán"** trên Dashboard để xác nhận đối soát.`;
          } else {
            botReply = `✅ Tuyệt vời! Hiện tại tất cả các phòng có khách trên toàn hệ thống GoStay đều đã thanh toán đủ 100%.`;
          }
        } else if (
          lower.includes("rò rỉ") ||
          lower.includes("thất thoát") ||
          lower.includes("quá giờ") ||
          lower.includes("trễ")
        ) {
          if (leaks.length > 0) {
            botReply =
              `⚠️ **Kiểm toán check-out toàn hệ thống:**\nPhát hiện **${leaks.length} phòng** quá hạn check-out chưa tính phụ thu (~${leakTotal} đ):\n\n` +
              leaks
                .map(
                  (p) =>
                    `• **Phòng ${p.room}**: ${p.desc} (Phụ thu: **+${Number(p.amount).toLocaleString("vi-VN")} đ**)`,
                )
                .join("\n") +
              `\n\n👉 Vui lòng nhắc lễ tân các cơ sở hoàn tất thủ tục trả phòng hoặc cộng thêm phụ thu.`;
          } else {
            botReply = `🛡️ Không phát hiện rò rỉ phụ phí! Các phòng ở mọi chi nhánh đều trả đúng giờ quy định.`;
          }
        } else if (
          lower.includes("công suất") ||
          lower.includes("trống") ||
          lower.includes("lấp đầy")
        ) {
          botReply = `📊 **Công suất phòng toàn hệ thống:**\n• Tỷ lệ lấp đầy: **${occ.rate || 0}%**\n• Đang có khách: **${occ.occupied || 0}/${occ.total || 0} phòng**\n• Phòng đang trống sẵn sàng đón khách: **${occ.vacant || 0} phòng**.`;
        } else if (lower.includes("doanh thu")) {
          botReply = `💰 **Báo cáo doanh thu toàn hệ thống:**\nTổng thực thu tháng này đạt **${rev} đ** từ các lượt đặt phòng đã thanh toán hợp lệ.`;
        } else {
          try {
            const res = await apiClient.post("/chatbot/message", {
              message: `[Toàn hệ thống GoStay] ${textToSend}`,
              session_id: "owner_session_all",
            });
            botReply =
              res?.reply ||
              `Công suất toàn chuỗi hiện đạt **${occ.rate || 0}%**, Doanh thu ghi nhận **${rev} đ**. Bạn cần tra cứu thêm thông tin nào?`;
          } catch {
            botReply = `Công suất toàn hệ thống hiện đạt **${occ.rate || 0}%**, Doanh thu ghi nhận **${rev} đ**.`;
          }
        }
      } else {
        botReply =
          "Hệ thống đã nhận yêu cầu. Bạn cần kiểm tra công suất, doanh thu hay công nợ phòng?";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message: botReply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          message: "Lỗi kết nối máy chủ phân tích. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* ─── NÚT BẬT CHAT THEO BRAND GHOSTAY ─── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 bg-[#003580] hover:bg-blue-900 text-white rounded-2xl shadow-xl flex items-center gap-2.5 transition active:scale-95 cursor-pointer border border-white/20"
        >
          <Sparkles size={18} className="text-white" />
          <span className="text-xs font-black uppercase tracking-wider">
            Trợ lý GoStay
          </span>
        </button>
      )}

      {/* ─── CỬA SỔ CHAT ─── */}
      {isOpen && (
        <div className="bg-white w-[360px] sm:w-[410px] h-[580px] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header Chat */}
          <div className="bg-[#003580] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider leading-tight">
                  Trợ lý Phân tích
                </div>
                <div className="text-[10px] text-white/80 font-semibold leading-tight mt-0.5">
                  Toàn bộ hệ thống GoStay
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
                        "Đã làm mới hội thoại! Bạn cần phân tích số liệu nào?",
                    },
                  ])
                }
                className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Làm mới"
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

          {/* Gợi ý câu hỏi nhanh */}
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1.5">
            {[
              "Phòng chưa thanh toán?",
              "Kiểm tra trễ check-out",
              "Công suất phòng hôm nay",
              "Doanh thu tháng này",
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] bg-white hover:bg-blue-50 hover:text-[#003580] text-gray-700 font-bold px-3 py-1 rounded-xl border border-gray-200 transition cursor-pointer shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Khung tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] text-xs">
            {messages.map((m) => {
              const isBot = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl whitespace-pre-line leading-relaxed max-w-[88%] shadow-xs ${
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
                  Đang tổng hợp dữ liệu toàn chuỗi...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
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
                placeholder="Hỏi về doanh thu, phòng nợ, công suất..."
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
