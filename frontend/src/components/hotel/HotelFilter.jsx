import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hotelService from '../../services/hotelService';

const HotelFilter = () => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  // ─── 1. STATE Ô ĐỊA ĐIỂM & TÌM KIẾM GẦN ĐÂY ───
  const [destination, setDestination] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  // Lấy lịch sử tìm kiếm từ localStorage khi component render
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    setRecentSearches(saved);
  }, []);

  // Gọi API gợi ý điểm đến khi gõ từ khóa (Debounce 300ms)
  useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setDestinations([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDest(true);
      try {
        const res = await hotelService.searchDestinations(destination);
        setDestinations(res || []);
      } catch (err) {
        console.error('Lỗi tìm địa điểm:', err);
      } finally {
        setLoadingDest(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  // Save điểm đến vào Tìm kiếm gần đây
  const saveRecentSearch = (name) => {
    if (!name) return;
    const updated = [name, ...recentSearches.filter((item) => item !== name)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };


  // ─── 2. STATE CHỌN NGÀY (LỊCH TRỰC QUAN) ───
  const today = new Date().toISOString().split('T')[0];
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);


  // ─── 3. STATE SỐ NGƯỜI / PHÒNG / TOGGLES ───
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [isBusiness, setIsBusiness] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const handleGuestChange = (field, delta) => {
    setGuests((prev) => {
      const val = prev[field] + delta;
      if (field === 'adults' && val < 1) return prev;
      if (field === 'children' && val < 0) return prev;
      if (field === 'rooms' && val < 1) return prev;
      return { ...prev, [field]: val };
    });
  };

  // Đóng tất cả dropdown khi nhấp ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowDestDropdown(false);
        setShowCalendar(false);
        setShowGuestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ─── NÚT TÌM KIẾM ───
  const handleSearch = (e) => {
    e.preventDefault();
    if (destination) saveRecentSearch(destination);

    const queryParams = new URLSearchParams({
      destination,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: guests.adults,
      children: guests.children,
      rooms: guests.rooms,
      isBusiness,
      hasPets,
    }).toString();

    navigate(`/hotels?${queryParams}`);
  };

  return (
    <div ref={filterRef} className="max-w-7xl mx-auto px-4">
      <form
        onSubmit={handleSearch}
        className="bg-[#ffb700] p-1 rounded-lg shadow-lg grid grid-cols-1 md:grid-cols-12 gap-1 text-gray-800"
      >
        {/* ────────────────── 1. Ô ĐỊA ĐIỂM (Ảnh 1) ────────────────── */}
        <div className="relative md:col-span-4 bg-white rounded-md flex items-center px-3 py-2.5">
          <span className="text-xl mr-2 text-gray-500">🛏️</span>
          <div className="flex-1 flex flex-col justify-center">
            {destination && (
              <span className="text-[10px] text-gray-400 font-medium leading-none">
                Nhập điểm đến
              </span>
            )}
            <input
              type="text"
              placeholder="Nhập điểm đến"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowDestDropdown(true);
              }}
              onFocus={() => {
                setShowDestDropdown(true);
                setShowCalendar(false);
                setShowGuestDropdown(false);
              }}
              className="w-full text-sm font-bold outline-none text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Nút X xóa từ khóa (Giống ảnh 1) */}
          {destination && (
            <button
              type="button"
              onClick={() => setDestination('')}
              className="text-gray-400 hover:text-gray-600 px-1 text-base font-bold"
            >
              ✕
            </button>
          )}

          {/* Dropdown Gợi ý / Tìm kiếm gần đây */}
          {showDestDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
              {/* Nếu chưa gõ từ khóa -> Hiện Tìm kiếm gần đây */}
              {!destination && recentSearches.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase">
                    Tìm kiếm gần đây của bạn
                  </div>
                  {recentSearches.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDestination(item);
                        setShowDestDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 cursor-pointer"
                    >
                      <span className="text-gray-400">🕒</span>
                      <span className="text-sm font-semibold text-gray-800">{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Danh sách kết quả từ API */}
              {loadingDest ? (
                <div className="p-4 text-xs text-gray-400 text-center">Đang tìm địa điểm...</div>
              ) : destinations.length > 0 ? (
                destinations.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDestination(item.name);
                      saveRecentSearch(item.name);
                      setShowDestDropdown(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-none"
                  >
                    <span className="text-lg mt-0.5 text-gray-600">📍</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.region || 'Việt Nam'}</div>
                    </div>
                  </div>
                ))
              ) : (
                destination && (
                  <div className="p-4 text-xs text-gray-400 text-center">
                    Không tìm thấy địa điểm phù hợp
                  </div>
                )
              )}
            </div>
          )}
        </div>


        {/* ────────────────── 2. Ô CHỌN NGÀY (Ảnh 2) ────────────────── */}
        <div className="relative md:col-span-4 bg-white rounded-md flex items-center px-3 py-2.5">
          <span className="text-xl mr-2 text-gray-500">📅</span>
          <div
            onClick={() => {
              setShowCalendar(!showCalendar);
              setShowDestDropdown(false);
              setShowGuestDropdown(false);
            }}
            className="w-full cursor-pointer"
          >
            <div className="text-[10px] text-gray-400 font-medium">Chọn ngày</div>
            <div className="text-xs font-bold text-gray-800 truncate">
              {checkInDate ? checkInDate : 'Nhận phòng'} — {checkOutDate ? checkOutDate : 'Trả phòng'}
            </div>
          </div>

          {/* Popup Lịch đơn giản (hoặc nhúng HTML5 Date Input) */}
          {showCalendar && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-50 min-w-[320px]">
              <div className="text-xs font-bold text-gray-500 mb-3 text-center">
                Chọn khoảng thời gian lưu trú
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-semibold block mb-1">Ngày nhận phòng:</label>
                  <input
                    type="date"
                    min={today}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-semibold block mb-1">Ngày trả phòng:</label>
                  <input
                    type="date"
                    min={checkInDate || today}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="w-full mt-4 bg-[#006ce4] text-white py-1.5 rounded text-xs font-semibold"
              >
                Xác nhận ngày
              </button>
            </div>
          )}
        </div>


        {/* ────────────────── 3. Ô SỐ LƯỢNG & TOGGLES (Ảnh 3) ────────────────── */}
        <div className="relative md:col-span-3 bg-white rounded-md flex items-center px-3 py-2.5">
          <span className="text-xl mr-2 text-gray-500">👤</span>
          <div
            onClick={() => {
              setShowGuestDropdown(!showGuestDropdown);
              setShowDestDropdown(false);
              setShowCalendar(false);
            }}
            className="w-full cursor-pointer"
          >
            <div className="text-[10px] text-gray-400 font-medium">Chọn số lượng</div>
            <div className="text-xs font-bold text-gray-800 truncate">
              {guests.adults} người lớn · {guests.children} trẻ em · {guests.rooms} phòng
            </div>
          </div>

          {/* Popup Số lượng + Công tắc Toggle (Thiết kế 100% giống Ảnh 3) */}
          {showGuestDropdown && (
            <div className="absolute top-full right-0 w-80 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 z-50 flex flex-col gap-4 text-gray-800">
              
              {/* Người lớn */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Người lớn</span>
                <div className="flex items-center border border-gray-300 rounded-md p-1 gap-4">
                  <button
                    type="button"
                    onClick={() => handleGuestChange('adults', -1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{guests.adults}</span>
                  <button
                    type="button"
                    onClick={() => handleGuestChange('adults', 1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Trẻ em */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Trẻ em</span>
                <div className="flex items-center border border-gray-300 rounded-md p-1 gap-4">
                  <button
                    type="button"
                    onClick={() => handleGuestChange('children', -1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{guests.children}</span>
                  <button
                    type="button"
                    onClick={() => handleGuestChange('children', 1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Số phòng */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-semibold">Phòng</span>
                <div className="flex items-center border border-gray-300 rounded-md p-1 gap-4">
                  <button
                    type="button"
                    onClick={() => handleGuestChange('rooms', -1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{guests.rooms}</span>
                  <button
                    type="button"
                    onClick={() => handleGuestChange('rooms', 1)}
                    className="w-7 h-7 text-[#006ce4] font-bold text-lg hover:bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Toggle: Đi công tác? */}
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">Đi công tác?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBusiness}
                    onChange={(e) => setIsBusiness(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006ce4]"></div>
                </label>
              </div>

              {/* Toggle: Mang thú cưng đi cùng */}
              <div className="flex justify-between items-center py-1 pb-2">
                <span className="text-sm font-medium">Mang thú cưng đi cùng</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.value)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006ce4]"></div>
                </label>
              </div>

              {/* Nút Xong (Viền xanh chữ xanh chuẩn Ảnh 3) */}
              <button
                type="button"
                onClick={() => setShowGuestDropdown(false)}
                className="w-full py-2 border-2 border-[#006ce4] text-[#006ce4] font-bold rounded-lg text-sm hover:bg-blue-50 transition-colors"
              >
                Xong
              </button>

            </div>
          )}
        </div>


        {/* ────────────────── 4. NÚT TÌM KIẾM ────────────────── */}
        <div className="md:col-span-1">
          <button
            type="submit"
            className="w-full h-full bg-[#006ce4] hover:bg-[#0056b3] text-white font-bold py-2.5 rounded-md text-base transition-colors"
          >
            Tìm
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelFilter;