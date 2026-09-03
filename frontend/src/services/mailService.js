// src/services/mailService.js
export const mailService = {
  // Gửi xác nhận đặt phòng
  sendBookingConfirmation: async (guestEmail, bookingDetails) => {
    console.log(
      `[SMTP Mailer] Gửi email xác nhận đặt phòng tới ${guestEmail}`,
      bookingDetails,
    );
    return { success: true, timestamp: new Date().toISOString() };
  },

  // Gửi thông báo phê duyệt thanh toán
  sendPaymentApproved: async (guestEmail, paymentDetails) => {
    console.log(
      `[SMTP Mailer] Gửi thông báo DUYỆT thanh toán tới ${guestEmail}`,
      paymentDetails,
    );
    return { success: true };
  },

  // Gửi thông báo từ chối thanh toán kèm lý do
  sendPaymentRejected: async (guestEmail, reason) => {
    console.log(
      `[SMTP Mailer] Gửi thông báo TỪ CHỐI thanh toán tới ${guestEmail}. Lý do: ${reason}`,
    );
    return { success: true };
  },
};

export default mailService;
