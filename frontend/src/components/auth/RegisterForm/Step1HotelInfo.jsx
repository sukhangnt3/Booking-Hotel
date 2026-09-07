// src/components/auth/RegisterForm/Step1HotelInfo.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  ChevronDown,
  Navigation,
  Loader2,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PROVINCES_DATA } from "@/constants/provincesData";
import { DEFAULT_AMENITIES_LIST } from "@/constants/amenitiesData";

export { PROVINCES_DATA, DEFAULT_AMENITIES_LIST };

export const Step1HotelInfo = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const isExistingOwner = Boolean(isAuthenticated && user && user.email);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState("");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [selectedProvince, setSelectedProvince] = useState(
    PROVINCES_DATA.find((p) => p.name === (data?.city || data?.province)) ||
      PROVINCES_DATA[0],
  );

  const currentLat = Number(data?.latitude || selectedProvince.coords.lat);
  const currentLng = Number(data?.longitude || selectedProvince.coords.lng);

  // 📍 Tự động điền địa chỉ khi click bản đồ (Reverse Geocoding)
  const reverseGeocode = async (lat, lng) => {
    setGeocodingStatus("Đang nhận diện địa chỉ...");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`,
      );
      const resData = await res.json();
      if (!resData || !resData.address) return;

      const addr = resData.address;
      const provinceRaw = addr.city || addr.state || addr.province || "";
      const matchedProvince = PROVINCES_DATA.find(
        (p) => provinceRaw.includes(p.name) || p.name.includes(provinceRaw),
      );

      const districtRaw =
        addr.city_district || addr.district || addr.suburb || "";
      let matchedDistrict = "";
      if (matchedProvince?.districts) {
        matchedDistrict =
          matchedProvince.districts.find(
            (d) => districtRaw.includes(d) || d.includes(districtRaw),
          ) || matchedProvince.districts[0];
      }

      const road = addr.road || "";
      const houseNumber = addr.house_number ? `${addr.house_number} ` : "";
      const fullStreet = [houseNumber + road, addr.suburb || ""]
        .filter(Boolean)
        .join(", ");

      const updates = { latitude: Number(lat), longitude: Number(lng) };
      if (matchedProvince) {
        setSelectedProvince(matchedProvince);
        updates.province = matchedProvince.name;
        updates.city = matchedProvince.name;
        updates.district =
          matchedDistrict || matchedProvince.districts[0] || "";
      }
      if (fullStreet) updates.address = fullStreet;
      if (addr.postcode) updates.zipCode = addr.postcode;

      onChange(updates);
      setGeocodingStatus("✓ Đã nhận diện và tự động điền địa chỉ!");
      setTimeout(() => setGeocodingStatus(""), 4000);
    } catch (err) {
      setGeocodingStatus("");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initMap = () => {
      if (!mapContainerRef.current || !window.L || mapInstanceRef.current)
        return;
      const L = window.L;
      const map = L.map(mapContainerRef.current).setView(
        [currentLat, currentLng],
        15,
      );
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-pin",
        html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; transform: translate(-50%, -50%);">📍</div>`,
        iconSize: [32, 32],
      });

      const marker = L.marker([currentLat, currentLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        reverseGeocode(lat, lng);
      });
    };

    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => isMounted && initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleProvinceSelect = (e) => {
    const provinceName = e.target.value;
    const found = PROVINCES_DATA.find((p) => p.name === provinceName);
    if (found) {
      setSelectedProvince(found);
      onChange({
        province: provinceName,
        city: provinceName,
        district: found.districts[0] || "",
        latitude: found.coords.lat,
        longitude: found.coords.lng,
      });
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView(
          [found.coords.lat, found.coords.lng],
          14,
        );
        markerRef.current.setLatLng([found.coords.lat, found.coords.lng]);
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 10000 },
    );
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=5&accept-language=vi`,
      );
      const results = await res.json();
      setSearchResults(results || []);
    } catch (err) {
      // bỏ qua lỗi tìm kiếm
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    setSearchQuery(item.display_name);
    setSearchResults([]);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
    }
    reverseGeocode(lat, lon);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 1/4</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Vị trí
        </h1>
      </div>

      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 size={18} className="animate-spin text-blue-600" />
            ) : (
              <Search size={18} />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Tìm địa chỉ, tên đường hoặc địa danh cơ sở lưu trú..."
            className="w-full h-12 pl-11 pr-4 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm font-medium rounded-full border border-transparent focus:border-blue-600 outline-none transition shadow-inner"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-14 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-fadeIn">
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(item)}
                className="p-3.5 hover:bg-blue-50/60 cursor-pointer text-xs font-medium text-slate-700 flex items-center gap-2.5 transition"
              >
                <MapPin size={15} className="text-blue-600 shrink-0" />
                <span className="truncate">{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={14} className="text-rose-500" /> Bản đồ định vị:
          </label>
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer transition"
          >
            {isLocating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Navigation size={12} />
            )}
            <span>Định vị vị trí của tôi (GPS)</span>
          </button>
        </div>

        <div className="w-full h-72 rounded-3xl overflow-hidden border border-slate-300 relative shadow-sm z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <p>💡 Click vào điểm trên bản đồ để tự động điền địa chỉ.</p>
          {geocodingStatus && (
            <span className="text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
              <CheckCircle2 size={13} /> {geocodingStatus}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold text-slate-900">
          Vị trí cơ sở lưu trú
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={data?.city || selectedProvince.name}
              onChange={handleProvinceSelect}
              className="w-full h-12 px-4 text-sm font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer focus:border-blue-600 outline-none"
            >
              {PROVINCES_DATA.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              value={data?.district || selectedProvince.districts[0] || ""}
              onChange={(e) => onChange({ district: e.target.value })}
              className="w-full h-12 px-4 text-sm font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer focus:border-blue-600 outline-none"
            >
              {(selectedProvince.districts || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={data?.hotelName || ""}
              onChange={(e) => onChange({ hotelName: e.target.value })}
              placeholder="Tên cơ sở lưu trú / Khách sạn *"
              className={`w-full h-12 px-4 text-sm font-bold bg-white rounded-xl border ${
                errors?.hotelName
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300"
              } focus:border-blue-600 outline-none`}
            />
          </div>
          <div>
            <select
              value={data?.propertyType || "hotel"}
              onChange={(e) => onChange({ propertyType: e.target.value })}
              className="w-full h-12 px-3 text-sm font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 outline-none cursor-pointer"
            >
              <option value="hotel">Khách sạn (Hotel)</option>
              <option value="resort">Khu nghỉ dưỡng (Resort)</option>
              <option value="homestay">Homestay</option>
              <option value="villa">Biệt thự (Villa)</option>
              <option value="apartment">Căn hộ (Apartment)</option>
            </select>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={data?.address || ""}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Địa chỉ đường phố (Số nhà, tên đường) *"
            className={`w-full h-12 px-4 text-sm font-medium bg-white rounded-xl border ${
              errors?.address
                ? "border-rose-500 bg-rose-50/20"
                : "border-slate-300"
            } focus:border-blue-600 outline-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={data?.buildingInfo || ""}
            onChange={(e) => onChange({ buildingInfo: e.target.value })}
            placeholder="Tòa nhà, tầng (không bắt buộc)"
            className="w-full h-12 px-4 text-sm bg-white rounded-xl border border-slate-300 outline-none"
          />
          <input
            type="text"
            value={data?.zipCode || ""}
            onChange={(e) => onChange({ zipCode: e.target.value })}
            placeholder="Mã bưu điện ZIP (không bắt buộc)"
            className="w-full h-12 px-4 text-sm bg-white rounded-xl border border-slate-300 outline-none"
          />
        </div>
      </div>

      {!isExistingOwner && (
        <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
            <UserPlus size={15} />
            <span>Tạo tài khoản quản trị cơ sở (Owner Account)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <input
              type="text"
              placeholder="Họ và tên chủ cơ sở *"
              value={data?.ownerName || ""}
              onChange={(e) => onChange({ ownerName: e.target.value })}
              className="h-10 px-3 bg-white border border-slate-300 rounded-xl outline-none"
            />
            <input
              type="tel"
              placeholder="SĐT đăng nhập *"
              value={data?.phoneContact || ""}
              onChange={(e) => onChange({ phoneContact: e.target.value })}
              className="h-10 px-3 bg-white border border-slate-300 rounded-xl outline-none"
            />
            <input
              type="email"
              placeholder="Email đăng nhập *"
              value={data?.emailContact || ""}
              onChange={(e) => onChange({ emailContact: e.target.value })}
              className="h-10 px-3 bg-white border border-slate-300 rounded-xl outline-none"
            />
            <input
              type="password"
              placeholder="Mật khẩu (≥ 6 ký tự) *"
              value={data?.password || ""}
              onChange={(e) => onChange({ password: e.target.value })}
              className="h-10 px-3 bg-white border border-slate-300 rounded-xl outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1HotelInfo;
