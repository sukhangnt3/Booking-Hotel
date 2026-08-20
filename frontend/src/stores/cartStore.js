import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { differenceInDays } from "date-fns";

export const useCartStore = create()(
  persist(
    (set, get) => ({
      // --- 1. STATE (DỮ LIỆU ĐANG CHỌN) ---
      hotel: null, // Thông tin khách sạn: { id, name, address, image }
      checkIn: null, // ISO String
      checkOut: null, // ISO String
      rooms: [], // Mảng phòng đã chọn: [{ id, name, price, quantity, bedType }]
      promo: null, // Mã giảm giá: { code, discountAmount, type }
      taxRate: 0.1, // 10% VAT & phí dịch vụ

      // --- 2. ACTIONS (HÀNH ĐỘNG) ---

      // Thiết lập thông tin khách sạn và ngày đặt
      setBookingContext: (hotelData, checkInDate, checkOutDate) => {
        set({
          hotel: hotelData,
          checkIn: checkInDate,
          checkOut: checkOutDate,
        });
      },

      // Cập nhật số lượng của một loại phòng
      updateRoomSelection: (room, quantity) => {
        const currentRooms = get().rooms;
        let updatedRooms = [];

        if (quantity <= 0) {
          // Nếu số lượng = 0 thì xóa khỏi danh sách chọn
          updatedRooms = currentRooms.filter((r) => r.id !== room.id);
        } else {
          const exists = currentRooms.find((r) => r.id === room.id);
          if (exists) {
            updatedRooms = currentRooms.map((r) =>
              r.id === room.id ? { ...r, quantity } : r,
            );
          } else {
            updatedRooms = [...currentRooms, { ...room, quantity }];
          }
        }

        set({ rooms: updatedRooms });
      },

      // Áp dụng mã giảm giá
      applyPromo: (promoData) => {
        set({ promo: promoData });
      },

      // Gỡ bỏ mã giảm giá
      removePromo: () => {
        set({ promo: null });
      },

      // Xóa trắng giỏ hàng (Sau khi thanh toán thành công)
      clearCart: () => {
        set({
          hotel: null,
          checkIn: null,
          checkOut: null,
          rooms: [],
          promo: null,
        });
      },

      // --- 3. GETTERS (TỰ ĐỘNG TÍNH TOÁN TIỀN BẠC) ---

      // Tính số đêm lưu trú
      getNights: () => {
        const { checkIn, checkOut } = get();
        if (!checkIn || !checkOut) return 1;
        const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
        return nights > 0 ? nights : 1;
      },

      // Tính tổng số lượng phòng
      getTotalRoomsCount: () => {
        return get().rooms.reduce((total, r) => total + r.quantity, 0);
      },

      // Tính tiền phòng gốc (Subtotal)
      getSubTotal: () => {
        const nights = get().getNights();
        return get().rooms.reduce((total, r) => {
          return total + (r.price || r.sell_price || 0) * r.quantity * nights;
        }, 0);
      },

      // Tính tiền thuế & phí
      getTaxAmount: () => {
        const subTotal = get().getSubTotal();
        return subTotal * get().taxRate;
      },

      // Tính số tiền được giảm
      getDiscountAmount: () => {
        const { promo } = get();
        if (!promo) return 0;
        return promo.discountAmount || 0;
      },

      // TÍNH TỔNG TIỀN CUỐI CÙNG (FINAL TOTAL)
      getFinalTotal: () => {
        const subTotal = get().getSubTotal();
        const tax = get().getTaxAmount();
        const discount = get().getDiscountAmount();
        const total = subTotal + tax - discount;
        return total > 0 ? total : 0;
      },
    }),
    {
      name: "gostay-cart-storage", // Key lưu trong localStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useCartStore;
