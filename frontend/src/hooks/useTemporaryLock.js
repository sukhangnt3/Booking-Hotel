import { useState, useCallback, useEffect, useRef } from "react";
import inventoryService from "@/services/inventoryService"; // Giả sử bạn có service quản lý kho

export const useTemporaryLock = () => {
  const [lockId, setLockId] = useState(null);
  const [isLocking, setIsLocked] = useState(false);
  const [error, setError] = useState(null);

  // Dùng ref để lưu lockId mới nhất nhằm mục đích unlock khi unmount
  const lockIdRef = useRef(null);

  // --- 1. HÀM KHÓA PHÒNG TẠM THỜI ---
  const lockRooms = async (hotelId, rooms, durationMinutes = 15) => {
    /**
     * rooms: [{ roomId: 1, quantity: 2 }, ...]
     */
    setIsLocked(true);
    setError(null);

    try {
      const response = await inventoryService.createTemporaryLock({
        hotelId,
        rooms,
        expiresIn: durationMinutes,
      });

      // Backend trả về mã lockId để định danh phiên giữ chỗ này
      const newLockId = response.lockId;
      setLockId(newLockId);
      lockIdRef.current = newLockId;

      return newLockId;
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Phòng vừa có người khác đặt, vui lòng chọn loại phòng khác.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLocked(false);
    }
  };

  // --- 2. HÀM GIẢI PHÓNG PHÒNG (UNLOCK) ---
  const releaseLock = useCallback(async (id) => {
    const targetId = id || lockIdRef.current;
    if (!targetId) return;

    try {
      await inventoryService.releaseTemporaryLock(targetId);
      setLockId(null);
      lockIdRef.current = null;
    } catch (err) {
      console.error("[useTemporaryLock] Failed to release lock:", err);
    }
  }, []);

  // --- 3. TỰ ĐỘNG GIẢI PHÓNG KHI RỜI TRANG (CLEANUP) ---
  useEffect(() => {
    return () => {
      // Nếu khách đóng trình duyệt hoặc chuyển trang mà chưa thanh toán
      // Giải phóng lock để người khác có thể đặt
      if (lockIdRef.current) {
        releaseLock();
      }
    };
  }, [releaseLock]);

  // --- 4. TRUY VẤN CÁC LOCK ĐANG HOẠT ĐỘNG (Dành cho Admin/Owner) ---
  const getActiveLocks = async (hotelId) => {
    try {
      return await inventoryService.getActiveLocks(hotelId);
    } catch (err) {
      console.error("Lỗi lấy danh sách khóa tạm:", err);
      return [];
    }
  };

  return {
    lockRooms,
    releaseLock,
    getActiveLocks,
    lockId,
    isLocking,
    error,
  };
};

export default useTemporaryLock;
