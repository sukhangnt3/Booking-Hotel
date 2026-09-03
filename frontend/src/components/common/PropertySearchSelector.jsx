// src/components/common/PropertySearchSelector.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Search,
  ChevronDown,
  Check,
  MapPin,
  X,
  Plus,
} from "lucide-react";

export default function PropertySearchSelector({
  hotels = [],
  selectedHotelId = "all",
  onSelectHotel = () => {},
  placeholder = "Chọn cơ sở lưu trú...",
  showAllOption = true,
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const selectedHotel = useMemo(() => {
    return hotels.find(
      (h) => String(h.id || h.applicationId) === String(selectedHotelId),
    );
  }, [hotels, selectedHotelId]);

  const filteredHotels = useMemo(() => {
    if (!searchTerm.trim()) return hotels;
    const q = searchTerm.toLowerCase().trim();
    return hotels.filter((h) => {
      const name = String(h.name || h.hotelNameVi || "").toLowerCase();
      const city = String(h.city || h.province || "").toLowerCase();
      return name.includes(q) || city.includes(q);
    });
  }, [hotels, searchTerm]);

  return (
    <div
      ref={dropdownRef}
      className="relative w-full sm:w-80 font-sans text-xs"
    >
      {/* Nút kích hoạt */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 bg-blue-50/70 border-2 rounded-2xl cursor-pointer transition shadow-xs select-none ${
          isOpen
            ? "border-[#003580] bg-white ring-2 ring-blue-100"
            : "border-blue-200 hover:border-blue-300"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-[#003580] text-white flex items-center justify-center shrink-0 font-bold">
            <Building2 size={16} />
          </div>

          <div className="text-left overflow-hidden">
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block leading-tight">
              {selectedHotelId === "all"
                ? "Phạm vi toàn sàn"
                : "Cơ sở đang quản lý"}
            </span>
            <p className="font-extrabold text-slate-900 text-xs truncate">
              {selectedHotelId === "all"
                ? `Tất cả cơ sở (${hotels.length})`
                : selectedHotel?.name || placeholder}
            </p>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-blue-700 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Menu tìm kiếm & Nút thêm cơ sở */}
      {isOpen && (
        <div className="absolute left-0 lg:right-0 lg:left-auto top-full mt-2 w-full sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[999] overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3 bg-slate-50 border-b">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm cơ sở theo tên hoặc thành phố..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border rounded-xl text-xs outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {showAllOption && !searchTerm && (
              <div
                onClick={() => {
                  onSelectHotel("all");
                  setIsOpen(false);
                }}
                className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition ${
                  selectedHotelId === "all"
                    ? "bg-blue-600 text-white font-bold"
                    : "hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">
                  🏢 Tất cả cơ sở lưu trú ({hotels.length})
                </span>
                {selectedHotelId === "all" && (
                  <Check size={16} strokeWidth={3} className="text-white" />
                )}
              </div>
            )}

            {filteredHotels.map((hotel) => {
              const hotelId = String(hotel.id || hotel.applicationId);
              const isSelected = selectedHotelId === hotelId;
              const hotelName = hotel.name || hotel.hotelNameVi || "Khách sạn";
              const hotelCity = hotel.city || hotel.province || "Việt Nam";

              return (
                <div
                  key={hotelId}
                  onClick={() => {
                    onSelectHotel(hotelId);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                      <img
                        src={hotel.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold block truncate">
                        {hotelName}
                      </span>
                      <span
                        className={`text-[10px] flex items-center gap-0.5 ${isSelected ? "text-blue-100" : "text-slate-400"}`}
                      >
                        <MapPin size={10} /> {hotelCity}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      size={16}
                      strokeWidth={3}
                      className="text-white shrink-0 ml-2"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 🚀 NÚT BẤM DƯỚI ĐÁY DROPDOWN ĐỂ THÊM CƠ SỞ MỚI NGAY LẬP TỨC */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/register-owner");
              }}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
            >
              <Plus size={14} /> Đăng ký thêm cơ sở lưu trú mới...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
