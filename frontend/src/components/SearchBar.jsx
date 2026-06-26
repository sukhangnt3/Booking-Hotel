import React, { useState } from "react";

const SearchBar = ({ onSearchProtected }) => {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState({ rooms: 1, adults: 1, children: 0 });
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      alert("📍 Vui lòng nhập địa điểm cần đến!");
      return;
    }
    if (onSearchProtected) {
      onSearchProtected({ destination: destination.trim(), checkIn, checkOut, ...guests });
    }
  };

  const updateGuests = (type, operation) => {
    setGuests((prev) => {
      const newValue = operation === "+" ? prev[type] + 1 : prev[type] - 1;
      if (type === "rooms" && newValue < 1) return prev;
      if (type === "adults" && newValue < 1) return prev;
      if (type === "children" && newValue < 0) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  return (
    <div className="w-full relative z-20">
      <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-gray-800">
        <div className="md:col-span-4 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200">
          <label className="text-[10px] font-bold uppercase text-gray-400">Nơi đến</label>
          <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Thành phố, khách sạn..." className="w-full text-xs font-bold text-gray-800 outline-none mt-0.5" />
        </div>
        <div className="md:col-span-2 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200">
          <label className="text-[10px] font-bold uppercase text-gray-400">Nhận phòng</label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full text-xs font-bold text-gray-800 outline-none mt-0.5 cursor-pointer" />
        </div>
        <div className="md:col-span-2 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200">
          <label className="text-[10px] font-bold uppercase text-gray-400">Trả phòng</label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full text-xs font-bold text-gray-800 outline-none mt-0.5 cursor-pointer" />
        </div>
        <div className="md:col-span-3 flex flex-col px-3 py-1 relative border-b md:border-b-0">
          <label className="text-[10px] font-bold uppercase text-gray-400">Khách & Phòng</label>
          <div onClick={() => setShowGuestDropdown(!showGuestDropdown)} className="w-full text-xs font-bold text-gray-800 mt-0.5 cursor-pointer select-none truncate">
            {guests.rooms} phòng, {guests.adults} người lớn {guests.children > 0 && `, ${guests.children} trẻ em`}
          </div>
          {showGuestDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowGuestDropdown(false)}></div>
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-20 space-y-3 text-xs">
                {/* Hàng chọn số lượng */}
                {["rooms", "adults", "children"].map((type) => (
                  <div key={type} className="flex justify-between items-center capitalize">
                    <span className="font-bold text-gray-600">{type === "rooms" ? "Số phòng" : type === "adults" ? "Người lớn" : "Trẻ em"}</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateGuests(type, "-")} className="w-6 h-6 border rounded-full flex items-center justify-center font-bold hover:bg-gray-50">-</button>
                      <span className="font-bold w-4 text-center">{guests[type]}</span>
                      <button type="button" onClick={() => updateGuests(type, "+")} className="w-6 h-6 border rounded-full flex items-center justify-center font-bold hover:bg-gray-50">+</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setShowGuestDropdown(false)} className="w-full py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-center mt-2 border border-blue-100 hover:bg-blue-100 transition-colors">Xong</button>
              </div>
            </>
          )}
        </div>
        <div className="md:col-span-1 w-full h-full flex items-center justify-center pt-2 md:pt-0">
          <button type="submit" className="w-full md:w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer">🔍</button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;