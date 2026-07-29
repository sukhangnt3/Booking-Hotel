import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hotelService from '../../services/hotelService';

const HotelFilter = ({ onSearch }) => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  // States
  const [destination, setDestination] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [isBusiness, setIsBusiness] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // Popups toggle
  const [activeTab, setActiveTab] = useState(null); // 'dest' | 'date' | 'guest' | null
  const [loadingDest, setLoadingDest] = useState(false);

  useEffect(() => {
    setRecentSearches(JSON.parse(localStorage.getItem('recent_searches') || '[]'));
  }, []);

  // Debounce gọi API địa điểm
  useEffect(() => {
    if (!destination.trim() || destination.length < 2) return setDestinations([]);
    const timer = setTimeout(async () => {
      setLoadingDest(true);
      try { setDestinations(await hotelService.searchDestinations(destination) || []); } 
      catch (e) { console.error(e); } 
      finally { setLoadingDest(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [destination]);

  // Click outside để đóng popups
  useEffect(() => {
    const handleOutside = (e) => filterRef.current && !filterRef.current.contains(e.target) && setActiveTab(null);
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleGuestChange = (field, delta) => {
    setGuests(prev => {
      const val = prev[field] + delta;
      if (val < (field === 'children' ? 0 : 1)) return prev;
      return { ...prev, [field]: val };
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (destination) {
      const updated = [destination, ...recentSearches.filter(i => i !== destination)].slice(0, 5);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
    }
    const params = { destination, checkIn: checkInDate, checkOut: checkOutDate, ...guests, isBusiness, hasPets };
    
    if (onSearch) onSearch(params);
    else navigate(`/hotels?${new URLSearchParams(params).toString()}`);
    setActiveTab(null);
  };

  return (
    <div ref={filterRef} className="w-full">
      <form onSubmit={handleSearch} className="bg-[#ffb700] p-1 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-12 gap-1 text-xs">
        
        {/* 1. ĐỊA ĐIỂM */}
        <div className="relative md:col-span-4 bg-white rounded flex items-center px-3 py-2">
          <span className="mr-2 text-base">🛏️</span>
          <div className="flex-1">
            <span className="text-[10px] text-gray-400 block font-medium">Nhập điểm đến</span>
            <input
              type="text"
              placeholder="Bạn muốn đến đâu?"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setActiveTab('dest'); }}
              onFocus={() => setActiveTab('dest')}
              className="w-full font-bold outline-none text-gray-900"
            />
          </div>
          {destination && <button type="button" onClick={() => setDestination('')} className="text-gray-400 font-bold px-1">✕</button>}

          {/* Popup Dropdown Địa Điểm */}
          {activeTab === 'dest' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {!destination && recentSearches.map((item, i) => (
                <div key={i} onClick={() => { setDestination(item); setActiveTab(null); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                  <span>🕒</span><span className="font-semibold">{item}</span>
                </div>
              ))}
              {loadingDest ? <div className="p-3 text-center text-gray-400">Đang tìm...</div> : 
                destinations.map((item, i) => (
                  <div key={i} onClick={() => { setDestination(item.name); setActiveTab(null); }} className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-none">
                    <div className="font-bold text-gray-800">📍 {item.name}</div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* 2. NGÀY NHẬN / TRẢ PHÒNG */}
        <div className="relative md:col-span-4 bg-white rounded flex items-center px-3 py-2">
          <span className="mr-2 text-base">📅</span>
          <div onClick={() => setActiveTab(activeTab === 'date' ? null : 'date')} className="w-full cursor-pointer">
            <span className="text-[10px] text-gray-400 block font-medium">Thời gian lưu trú</span>
            <div className="font-bold truncate">{checkInDate} — {checkOutDate || 'Trả phòng'}</div>
          </div>

          {activeTab === 'date' && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-3 z-50 w-64 space-y-2">
              <div><label className="text-[10px] font-bold text-gray-500">Nhận phòng</label>
                <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="w-full border rounded p-1" />
              </div>
              <div><label className="text-[10px] font-bold text-gray-500">Trả phòng</label>
                <input type="date" min={checkInDate} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="w-full border rounded p-1" />
              </div>
              <button type="button" onClick={() => setActiveTab(null)} className="w-full bg-[#006ce4] text-white py-1 rounded font-bold">Xác nhận</button>
            </div>
          )}
        </div>

        {/* 3. KHÁCH & PHÒNG */}
        <div className="relative md:col-span-3 bg-white rounded flex items-center px-3 py-2">
          <span className="mr-2 text-base">👤</span>
          <div onClick={() => setActiveTab(activeTab === 'guest' ? null : 'guest')} className="w-full cursor-pointer">
            <span className="text-[10px] text-gray-400 block font-medium">Số lượng</span>
            <div className="font-bold truncate">{guests.adults} nl · {guests.children} trẻ · {guests.rooms} phòng</div>
          </div>

          {activeTab === 'guest' && (
            <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-xl p-4 z-50 w-64 space-y-3">
              {['adults', 'children', 'rooms'].map((type) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize font-semibold">{type === 'adults' ? 'Người lớn' : type === 'children' ? 'Trẻ em' : 'Phòng'}</span>
                  <div className="flex items-center gap-2 border rounded p-0.5">
                    <button type="button" onClick={() => handleGuestChange(type, -1)} className="w-6 h-6 text-[#006ce4] font-bold hover:bg-gray-100 rounded">-</button>
                    <span className="font-bold w-4 text-center">{guests[type]}</span>
                    <button type="button" onClick={() => handleGuestChange(type, 1)} className="w-6 h-6 text-[#006ce4] font-bold hover:bg-gray-100 rounded">+</button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t space-y-2">
                <label className="flex justify-between items-center cursor-pointer">
                  <span>Đi công tác?</span>
                  <input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} className="accent-[#006ce4]" />
                </label>
                <label className="flex justify-between items-center cursor-pointer">
                  <span>Mang thú cưng</span>
                  <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className="accent-[#006ce4]" />
                </label>
              </div>
              <button type="button" onClick={() => setActiveTab(null)} className="w-full border-2 border-[#006ce4] text-[#006ce4] py-1 rounded-lg font-bold">Xong</button>
            </div>
          )}
        </div>

        {/* 4. NÚT TÌM KIẾM */}
        <div className="md:col-span-1">
          <button type="submit" className="w-full h-full bg-[#006ce4] hover:bg-blue-700 text-white font-bold py-2 rounded text-sm transition">
            Tìm
          </button>
        </div>

      </form>
    </div>
  );
};

export default HotelFilter;