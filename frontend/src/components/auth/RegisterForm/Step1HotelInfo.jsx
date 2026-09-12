// src/components/auth/RegisterForm/Step1HotelInfo.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UserPlus,
  Building2,
  MapPin,
  ChevronDown,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User,
  CheckCircle2,
  ShieldCheck,
  Waves,
  Navigation,
  Compass,
  Search,
  Loader2,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

// ─── DANH MỤC TRUNG TÂM DU LỊCH & BÃI TẮM ĐẦY ĐỦ CÁC TỈNH THÀNH VIỆT NAM ───
const VIETNAM_TOURISM_HUBS = [
  {
    name: "Ninh Thuận (Phan Rang)",
    aliases: [
      "ninh thuận",
      "ninh thuan",
      "phan rang",
      "tháp chàm",
      "ninh chữ",
      "ninh chu",
      "cà ná",
      "ca na",
      "vĩnh hy",
      "vinh hy",
    ],
    center: { lat: 11.5645, lng: 108.9882 },
    beaches: [
      { name: "Biển Ninh Chữ", lat: 11.5794, lng: 109.0275 },
      { name: "Biển Bình Sơn", lat: 11.5686, lng: 109.0289 },
      { name: "Biển Cà Ná", lat: 11.3183, lng: 108.8683 },
      { name: "Vịnh Vĩnh Hy", lat: 11.7161, lng: 109.1932 },
    ],
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    aliases: [
      "vũng tàu",
      "vung tau",
      "bà rịa",
      "ba ria",
      "hồ tràm",
      "long hải",
    ],
    center: { lat: 10.3459, lng: 107.0725 },
    beaches: [
      { name: "Bãi Sau", lat: 10.3374, lng: 107.0863 },
      { name: "Bãi Trước", lat: 10.3444, lng: 107.0694 },
      { name: "Biển Hồ Tràm", lat: 10.4889, lng: 107.3452 },
    ],
  },
  {
    name: "Nha Trang (Khánh Hòa)",
    aliases: ["nha trang", "khánh hòa", "khanh hoa", "cam ranh"],
    center: { lat: 12.2388, lng: 109.1967 },
    beaches: [
      { name: "Biển Trần Phú", lat: 12.24, lng: 109.197 },
      { name: "Bãi Dài Cam Ranh", lat: 12.0416, lng: 109.1833 },
    ],
  },
  {
    name: "Đà Nẵng",
    aliases: ["đà nẵng", "da nang", "sơn trà", "ngũ hành sơn"],
    center: { lat: 16.061, lng: 108.223 },
    beaches: [
      { name: "Biển Mỹ Khê", lat: 16.0597, lng: 108.2435 },
      { name: "Biển Non Nước", lat: 16.0125, lng: 108.2612 },
    ],
  },
  {
    name: "Phú Quốc (Kiên Giang)",
    aliases: ["phú quốc", "phu quoc", "kiên giang", "kien giang"],
    center: { lat: 10.2167, lng: 103.9667 },
    beaches: [
      { name: "Bãi Sao", lat: 10.0528, lng: 104.0325 },
      { name: "Bãi Trường", lat: 10.1583, lng: 103.9611 },
    ],
  },
  {
    name: "Hồ Chí Minh",
    aliases: ["hồ chí minh", "ho chi minh", "sài gòn", "sai gon", "hcm"],
    center: { lat: 10.7769, lng: 106.7009 },
    beaches: [],
  },
  {
    name: "Hà Nội",
    aliases: ["hà nội", "ha noi"],
    center: { lat: 21.0285, lng: 105.8542 },
    beaches: [],
  },
];

const ALL_VIETNAM_BEACHES = VIETNAM_TOURISM_HUBS.flatMap((hub) =>
  (hub.beaches || []).map((b) => ({ ...b, hubName: hub.name })),
);

function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const Step1HotelInfo = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isTypingRef = useRef(false);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckError, setEmailCheckError] = useState("");
  const [nearestHubName, setNearestHubName] = useState("");
  const [nearestBeachInfo, setNearestBeachInfo] = useState("");

  const isAccountReady =
    (isAuthenticated && Boolean(user?.id)) || Boolean(data?.isAccountCreated);

  const displayOwnerName = user?.full_name || data?.ownerName || "Chủ cơ sở";
  const displayEmail = user?.email || data?.emailContact || "";

  const currentLat = Number(data?.latitude) || 10.7769;
  const currentLng = Number(data?.longitude) || 106.7009;

  // 🌟 HÀM KIỂM TRA EMAIL TỨC THÌ KHI GÕ XONG (ONBLUR)
  const handleCheckEmailBlur = async () => {
    const email = (data?.emailContact || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setCheckingEmail(true);
    setEmailCheckError("");

    try {
      const res = await apiClient.get(
        `/auth/check-email?email=${encodeURIComponent(email)}`,
      );
      if (res?.data?.exists || res?.exists) {
        setEmailCheckError(
          "⚠️ Email này đã có tài khoản trên hệ thống! Vui lòng dùng email khác.",
        );
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra email:", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  // 🌟 HÀM ĐỔI TÀI KHOẢN KHÁC (ĐĂNG XUẤT ĐỂ ĐĂNG KÝ TỪ ĐẦU)
  const handleSwitchAccount = () => {
    if (logout) logout();
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    onChange({
      isAccountCreated: false,
      ownerId: null,
      ownerName: "",
      emailContact: "",
      phoneContact: "",
      password: "",
    });
  };

  const calculateMetrics = useCallback(
    (lat, lng, explicitCity, extraContext = "") => {
      const normCity = (explicitCity || data?.city || "").toLowerCase().trim();

      let targetHub = null;
      if (normCity) {
        targetHub = VIETNAM_TOURISM_HUBS.find((h) =>
          h.aliases.some((alias) => normCity.includes(alias)),
        );
      }

      if (!targetHub) {
        let minDistance = Infinity;
        VIETNAM_TOURISM_HUBS.forEach((hub) => {
          const d = calculateHaversine(
            lat,
            lng,
            hub.center.lat,
            hub.center.lng,
          );
          if (d < minDistance) {
            minDistance = d;
            targetHub = hub;
          }
        });
      }

      if (!targetHub) targetHub = VIETNAM_TOURISM_HUBS[0];
      setNearestHubName(targetHub.name);

      const distCenter = calculateHaversine(
        lat,
        lng,
        targetHub.center.lat,
        targetHub.center.lng,
      );

      let minBeachDist = Infinity;
      let closestBeachName = "";

      ALL_VIETNAM_BEACHES.forEach((beach) => {
        const d = calculateHaversine(lat, lng, beach.lat, beach.lng);
        if (d < minBeachDist) {
          minBeachDist = d;
          closestBeachName = beach.name;
        }
      });

      const coastalKeywords = [
        "bãi tắm",
        "bãi biển",
        "bờ biển",
        "resort",
        "biển",
      ];
      const isContextSeaside = coastalKeywords.some((kw) =>
        (extraContext || "").toLowerCase().includes(kw),
      );

      const isBeach =
        minBeachDist <= 2.5 || (isContextSeaside && minBeachDist <= 4.5);
      if (isBeach && closestBeachName) {
        setNearestBeachInfo(`Cách ${closestBeachName} ~${minBeachDist}km`);
      } else {
        setNearestBeachInfo("");
      }

      return {
        distance_to_center: distCenter,
        is_beachfront: isBeach,
      };
    },
    [data?.city],
  );

  const calculateMetricsRef = useRef(calculateMetrics);
  useEffect(() => {
    calculateMetricsRef.current = calculateMetrics;
  }, [calculateMetrics]);

  const handleReverseGeocode = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
        { headers: { "User-Agent": "GoStayApp/1.0" } },
      );
      const resData = await res.json();

      let detectedCity = "";
      let detectedAddress = "";
      let rawDisplayName = resData?.display_name || "";

      if (resData && resData.address) {
        const addr = resData.address;
        detectedCity = addr.city || addr.province || addr.state || "";
        const roadName = addr.road || addr.suburb || addr.neighbourhood || "";
        const houseNum = addr.house_number ? `${addr.house_number} ` : "";
        detectedAddress = roadName
          ? `${houseNum}${roadName}`
          : resData.display_name.split(",")[0];
      }

      const cleanCity = detectedCity
        .replace("Thành phố ", "")
        .replace("Tỉnh ", "")
        .trim();
      const metrics = calculateMetricsRef.current(
        lat,
        lng,
        cleanCity,
        rawDisplayName,
      );

      onChange({
        latitude: lat,
        longitude: lng,
        city: cleanCity || data?.city || "",
        province: cleanCity || data?.city || "",
        address: detectedAddress.trim() || data?.address || "",
        distance_to_center: metrics.distance_to_center,
        is_beachfront: metrics.is_beachfront,
      });
      return;
    } catch (err) {
      console.warn("Lỗi toạ độ:", err.message);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocodeRef = useRef(handleReverseGeocode);
  useEffect(() => {
    handleReverseGeocodeRef.current = handleReverseGeocode;
  });

  const geocodeAddressToMap = useCallback(
    async (cityText, addressText) => {
      const cleanCity = (cityText || "").trim();
      const cleanAddress = (addressText || "").trim();
      if (!cleanCity && !cleanAddress) return;

      setIsGeocoding(true);
      try {
        let results = [];
        if (cleanAddress && cleanCity) {
          const query = `${cleanAddress}, ${cleanCity}, Việt Nam`;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
            { headers: { "User-Agent": "GoStayApp/1.0" } },
          );
          results = await res.json();
        }

        let lat = results[0]?.lat ? parseFloat(results[0].lat) : null;
        let lng = results[0]?.lon ? parseFloat(results[0].lon) : null;

        if (lat && lng && mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 14, {
            animate: true,
            duration: 1.2,
          });
          markerRef.current.setLatLng([lat, lng]);

          const metrics = calculateMetricsRef.current(
            lat,
            lng,
            cleanCity,
            `${cleanAddress} ${cleanCity}`,
          );
          onChange({
            latitude: lat,
            longitude: lng,
            distance_to_center: metrics.distance_to_center,
            is_beachfront: metrics.is_beachfront,
          });
        }
      } catch (err) {
        console.warn("Lỗi geocoding:", err.message);
      } finally {
        setIsGeocoding(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (!isTypingRef.current) return;
    const timer = setTimeout(() => {
      if (data?.city || data?.address) {
        geocodeAddressToMap(data?.city, data?.address);
      }
      isTypingRef.current = false;
    }, 800);
    return () => clearTimeout(timer);
  }, [data?.city, data?.address, geocodeAddressToMap]);

  useEffect(() => {
    const linkId = "leaflet-css-bundle";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js-bundle";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else if (window.L) {
      initMap();
    }

    function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = window.L;
      const initialCoords = [currentLat, currentLng];

      const map = L.map(mapContainerRef.current).setView(initialCoords, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-map-marker",
        html: `<div style="background-color: #006ce4; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"><div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker(initialCoords, {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      marker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        handleReverseGeocodeRef.current(
          Math.round(pos.lat * 100000) / 100000,
          Math.round(pos.lng * 100000) / 100000,
        );
      });

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handleReverseGeocodeRef.current(
          Math.round(lat * 100000) / 100000,
          Math.round(lng * 100000) / 100000,
        );
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 1 / 8: Tạo tài
          khoản & Thông tin chỗ nghỉ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Bắt đầu đăng ký cơ sở lưu trú của bạn
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gõ địa chỉ hoặc kéo ghim trên bản đồ — hệ thống sẽ tự động đồng bộ và
          tính toán khoảng cách.
        </p>
      </div>

      {/* ── KHỐI 1: TÀI KHOẢN ĐỐI TÁC ── */}
      {isAccountReady ? (
        <div className="p-4 sm:p-5 bg-emerald-50/80 border border-emerald-300 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                ✓ Tài khoản đối tác đang đăng nhập
              </span>
              <span className="text-sm font-black text-slate-900 block">
                {displayOwnerName} {displayEmail && `(${displayEmail})`}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cơ sở này sẽ được liên kết trực tiếp với tài khoản của bạn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwitchAccount}
            className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <LogOut size={14} /> Đổi tài khoản khác
          </button>
        </div>
      ) : (
        <div className="p-5 sm:p-7 bg-[#e8f2ff]/50 border border-blue-200 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-[#003580] uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={16} className="text-[#006ce4]" /> 1. Tạo tài khoản
              đối tác quản trị
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              Chưa có tài khoản
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên chủ cơ sở *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data?.ownerName || ""}
                  onChange={(e) => onChange({ ownerName: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.ownerName
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4]"
                  } outline-none transition`}
                />
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.ownerName && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.ownerName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại liên hệ *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={data?.phoneContact || ""}
                  onChange={(e) => onChange({ phoneContact: e.target.value })}
                  placeholder="VD: 0901234567"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.phoneContact
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4]"
                  } outline-none transition`}
                />
                <Phone
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.phoneContact && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.phoneContact}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Email đăng nhập quản trị *</span>
                {checkingEmail && (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Đang kiểm
                    tra...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={data?.emailContact || ""}
                  onChange={(e) => {
                    onChange({ emailContact: e.target.value });
                    setEmailCheckError("");
                  }}
                  onBlur={handleCheckEmailBlur}
                  placeholder="partner@example.com"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.emailContact || emailCheckError
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4]"
                  } outline-none transition`}
                />
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {(errors?.emailContact || emailCheckError) && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {emailCheckError || errors.emailContact}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu (≥ 6 ký tự) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={data?.password || ""}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.password
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4]"
                  } outline-none transition`}
                />
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.password && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.password}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KHỐI 2: TÊN CHỖ NGHỈ & LOẠI HÌNH ── */}
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-3xl space-y-4 shadow-xs">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Building2 size={16} className="text-[#006ce4]" /> 2. Thông tin cơ sở
          lưu trú
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên cơ sở lưu trú / Khách sạn *
            </label>
            <input
              type="text"
              value={data?.hotelName || ""}
              onChange={(e) => onChange({ hotelName: e.target.value })}
              placeholder="Ví dụ: Khách sạn Grand Sài Gòn, Sun Boutique Villa..."
              className={`w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.hotelName
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.hotelName && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.hotelName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại hình chỗ nghỉ *
            </label>
            <div className="relative">
              <select
                value={data?.propertyType || "hotel"}
                onChange={(e) => onChange({ propertyType: e.target.value })}
                className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4] pr-10"
              >
                <option value="hotel">Khách sạn (Hotel)</option>
                <option value="resort">Khu nghỉ dưỡng (Resort)</option>
                <option value="homestay">Homestay</option>
                <option value="villa">Biệt thự (Villa)</option>
                <option value="apartment">Căn hộ (Apartment)</option>
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── KHỐI 3: ĐỊA CHỈ & BẢN ĐỒ ĐỒNG BỘ 2 CHIỀU ── */}
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin size={16} className="text-[#006ce4]" /> 3. Chỗ nghỉ tọa lạc
            ở đâu?
          </h2>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            {isGeocoding ? (
              <>
                <Loader2 size={13} className="animate-spin text-blue-600" />{" "}
                Đang đồng bộ vị trí...
              </>
            ) : (
              <>
                <Compass size={13} /> Nhập chữ hoặc kéo ghim
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Thành phố / Tỉnh *
            </label>
            <input
              type="text"
              value={data?.city || ""}
              onChange={(e) => {
                isTypingRef.current = true;
                const val = e.target.value;
                onChange({ city: val, province: val });
              }}
              placeholder="v.d: Ninh Thuận, Vũng Tàu, Đà Nẵng, Nha Trang..."
              className={`w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.city
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.city && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.city}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Địa chỉ cụ thể *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data?.address || ""}
                onChange={(e) => {
                  isTypingRef.current = true;
                  onChange({ address: e.target.value });
                }}
                placeholder="Ví dụ: Đường 16 Tháng 4, Phường Mỹ Hải..."
                className={`flex-1 h-11 sm:h-12 px-4 text-xs sm:text-sm font-semibold bg-white rounded-xl border ${
                  errors?.address
                    ? "border-rose-500 bg-rose-50/20"
                    : "border-slate-300 focus:border-[#006ce4]"
                } outline-none transition`}
              />
              <button
                type="button"
                onClick={() => geocodeAddressToMap(data?.city, data?.address)}
                disabled={isGeocoding || (!data?.address && !data?.city)}
                className="h-11 sm:h-12 px-4 bg-[#006ce4] hover:bg-[#0057b8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition disabled:opacity-50"
              >
                <Search size={14} /> Tìm ngay
              </button>
            </div>
            {errors?.address && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.address}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Bản đồ tự động nhảy khi bạn gõ địa chỉ hoặc kéo ghim:</span>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              GPS: {data?.latitude || currentLat},{" "}
              {data?.longitude || currentLng}
            </span>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-64 sm:h-80 rounded-2xl border border-slate-300 shadow-inner overflow-hidden z-0"
          />
        </div>

        <div className="p-4 bg-white border border-blue-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-center shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Navigation size={18} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Khoảng cách đến Trung tâm{" "}
                {nearestHubName ? `(${nearestHubName})` : ""}
              </span>
              <span className="text-lg font-black text-slate-900">
                {data?.distance_to_center !== undefined
                  ? data.distance_to_center
                  : 1.2}{" "}
                km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                data?.is_beachfront
                  ? "bg-cyan-600 shadow-cyan-100"
                  : "bg-slate-300"
              }`}
            >
              <Waves size={18} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Phân loại Vị trí Biển
              </span>
              <span
                className={`text-sm font-extrabold ${data?.is_beachfront ? "text-cyan-700" : "text-slate-500"}`}
              >
                {data?.is_beachfront
                  ? "✓ Chỗ nghỉ Sát biển / Giáp biển"
                  : "Không nằm sát biển"}
              </span>
              {nearestBeachInfo && (
                <span className="text-[11px] text-cyan-600 font-semibold block">
                  {nearestBeachInfo}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1HotelInfo;
