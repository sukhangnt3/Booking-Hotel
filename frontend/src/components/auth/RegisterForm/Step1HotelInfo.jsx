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
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

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
    center: { lat: 11.5645, lng: 108.9882 }, // Quảng trường Phan Rang
    beaches: [
      { name: "Biển Ninh Chữ", lat: 11.5794, lng: 109.0275 },
      { name: "Biển Bình Sơn", lat: 11.5686, lng: 109.0289 },
      { name: "Biển Cà Ná", lat: 11.3183, lng: 108.8683 },
      { name: "Vịnh Vĩnh Hy", lat: 11.7161, lng: 109.1932 },
      { name: "Bãi biển Mũi Dinh", lat: 11.4883, lng: 109.0261 },
      { name: "Bãi biển Thái An", lat: 11.6667, lng: 109.1667 },
    ],
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    aliases: [
      "vũng tàu",
      "vung tau",
      "bà rịa",
      "ba ria",
      "đất đỏ",
      "dat do",
      "long hải",
      "long hai",
      "xuyên mộc",
      "hồ tràm",
      "phước hải",
      "phuoc hai",
      "côn đảo",
      "con dao",
    ],
    center: { lat: 10.3459, lng: 107.0725 },
    beaches: [
      { name: "Bãi Sau", lat: 10.3374, lng: 107.0863 },
      { name: "Bãi Trước", lat: 10.3444, lng: 107.0694 },
      { name: "Bãi Dâu", lat: 10.3688, lng: 107.0592 },
      { name: "Bãi Dứa", lat: 10.3294, lng: 107.0711 },
      { name: "Biển Long Hải", lat: 10.3705, lng: 107.2372 },
      { name: "Biển Phước Hải", lat: 10.4358, lng: 107.2831 },
      { name: "Biển Hồ Tràm", lat: 10.4889, lng: 107.3452 },
      { name: "Biển Hồ Cốc", lat: 10.5113, lng: 107.4526 },
      { name: "Bãi biển Bình Châu", lat: 10.5401, lng: 107.5255 },
      { name: "Bãi Đầm Trầu (Côn Đảo)", lat: 8.7301, lng: 106.6318 },
      { name: "Bãi An Hải (Côn Đảo)", lat: 8.6792, lng: 106.6083 },
    ],
  },
  {
    name: "Nha Trang (Khánh Hòa)",
    aliases: [
      "nha trang",
      "khánh hòa",
      "khanh hoa",
      "cam ranh",
      "vân phong",
      "ninh hòa",
    ],
    center: { lat: 12.2388, lng: 109.1967 },
    beaches: [
      { name: "Biển Trần Phú", lat: 12.24, lng: 109.197 },
      { name: "Biển Hòn Chồng", lat: 12.2725, lng: 109.2045 },
      { name: "Bãi Dài Cam Ranh", lat: 12.0416, lng: 109.1833 },
      { name: "Bãi biển Dốc Lết", lat: 12.5539, lng: 109.2317 },
      { name: "Biển Đại Lãnh", lat: 12.8364, lng: 109.3625 },
      { name: "Biển Bãi Trũ (Vinpearl)", lat: 12.2189, lng: 109.2458 },
    ],
  },
  {
    name: "Đà Nẵng",
    aliases: [
      "đà nẵng",
      "da nang",
      "sơn trà",
      "ngũ hành sơn",
      "liên chiểu",
      "thanh khê",
    ],
    center: { lat: 16.061, lng: 108.223 },
    beaches: [
      { name: "Biển Mỹ Khê", lat: 16.0597, lng: 108.2435 },
      { name: "Biển Non Nước", lat: 16.0125, lng: 108.2612 },
      { name: "Biển Phạm Văn Đồng", lat: 16.0715, lng: 108.246 },
      { name: "Biển Bắc Mỹ An", lat: 16.0456, lng: 108.2472 },
      { name: "Biển Xuân Thiều", lat: 16.0968, lng: 108.1565 },
      { name: "Bãi Rạng Bán đảo Sơn Trà", lat: 16.1152, lng: 108.2778 },
      { name: "Biển Nam Ô", lat: 16.1264, lng: 108.1256 },
    ],
  },
  {
    name: "Phú Quốc (Kiên Giang)",
    aliases: [
      "phú quốc",
      "phu quoc",
      "kiên giang",
      "kien giang",
      "rạch giá",
      "hà tiên",
    ],
    center: { lat: 10.2167, lng: 103.9667 },
    beaches: [
      { name: "Bờ biển Dinh Cậu", lat: 10.208, lng: 103.958 },
      { name: "Bãi Sao", lat: 10.0528, lng: 104.0325 },
      { name: "Bãi Trường", lat: 10.1583, lng: 103.9611 },
      { name: "Bãi Khem", lat: 10.035, lng: 104.034 },
      { name: "Bãi Ông Lang", lat: 10.2678, lng: 103.9142 },
      { name: "Bãi Gành Dầu", lat: 10.3667, lng: 103.85 },
      { name: "Bãi Cửa Cạn", lat: 10.3012, lng: 103.8961 },
      { name: "Bãi biển Mũi Nai (Hà Tiên)", lat: 10.3867, lng: 104.4444 },
    ],
  },
  {
    name: "Phan Thiết (Bình Thuận)",
    aliases: [
      "phan thiết",
      "phan thiet",
      "mũi né",
      "mui ne",
      "bình thuận",
      "binh thuan",
      "la gi",
      "hàm thuận nam",
    ],
    center: { lat: 10.9272, lng: 108.1022 },
    beaches: [
      { name: "Biển Đồi Dương", lat: 10.9238, lng: 108.113 },
      { name: "Biển Mũi Né", lat: 10.9388, lng: 108.2917 },
      { name: "Bãi Rạng Mũi Né", lat: 10.9525, lng: 108.2144 },
      { name: "Biển Hòn Rơm", lat: 10.9419, lng: 108.3189 },
      { name: "Biển Kê Gà", lat: 10.7028, lng: 107.9942 },
      { name: "Biển Tiến Thành", lat: 10.8411, lng: 108.0378 },
      { name: "Bãi biển Cam Bình (La Gi)", lat: 10.6653, lng: 107.7475 },
    ],
  },
  {
    name: "Quy Nhơn (Bình Định)",
    aliases: [
      "quy nhơn",
      "quy nhon",
      "bình định",
      "binh dinh",
      "kỳ co",
      "eo gió",
    ],
    center: { lat: 13.782, lng: 109.2194 },
    beaches: [
      { name: "Bãi biển Xuân Diệu", lat: 13.771, lng: 109.2312 },
      { name: "Bãi Kỳ Co", lat: 13.8833, lng: 109.3 },
      { name: "Bãi tắm Hoàng Hậu", lat: 13.7486, lng: 109.2272 },
      { name: "Biển Quy Hòa", lat: 13.7197, lng: 109.2158 },
      { name: "Bãi biển Trung Lương", lat: 13.9689, lng: 109.2483 },
      { name: "Bãi biển Eo Gió", lat: 13.8967, lng: 109.2994 },
    ],
  },
  {
    name: "Phú Yên (Tuy Hòa)",
    aliases: ["phú yên", "phu yen", "tuy hòa", "tuy hoa", "sông cầu"],
    center: { lat: 13.0882, lng: 109.3147 },
    beaches: [
      { name: "Bãi biển Tuy Hòa", lat: 13.095, lng: 109.325 },
      { name: "Bãi Xép", lat: 13.2083, lng: 109.2944 },
      { name: "Bãi Môn (Mũi Điện)", lat: 12.8944, lng: 109.4583 },
      { name: "Vịnh Vũng Rô", lat: 12.8683, lng: 109.4128 },
      { name: "Bãi biển Long Thủy", lat: 13.1583, lng: 109.3139 },
    ],
  },
  {
    name: "Hạ Long (Quảng Ninh)",
    aliases: [
      "hạ long",
      "ha long",
      "quảng ninh",
      "quang ninh",
      "bãi cháy",
      "vân đồn",
      "cô tô",
    ],
    center: { lat: 20.95, lng: 107.0733 },
    beaches: [
      { name: "Bãi tắm Bãi Cháy", lat: 20.9472, lng: 107.0505 },
      { name: "Bãi tắm Tuần Châu", lat: 20.9324, lng: 106.9931 },
      { name: "Bãi tắm Hòn Gai", lat: 20.9417, lng: 107.0917 },
      { name: "Bãi biển Quan Lạn", lat: 20.8911, lng: 107.5317 },
      { name: "Bãi biển Hồng Vàn (Cô Tô)", lat: 21.0028, lng: 107.7806 },
    ],
  },
  {
    name: "Huế (Thừa Thiên Huế)",
    aliases: [
      "huế",
      "hue",
      "thừa thiên huế",
      "thua thien hue",
      "lăng cô",
      "thuận an",
    ],
    center: { lat: 16.4637, lng: 107.5909 },
    beaches: [
      { name: "Biển Thuận An", lat: 16.5583, lng: 107.6417 },
      { name: "Biển Lăng Cô", lat: 16.2333, lng: 108.0167 },
      { name: "Biển Cảnh Dương", lat: 16.3267, lng: 107.9867 },
    ],
  },
  {
    name: "Hội An (Quảng Nam)",
    aliases: ["hội an", "hoi an", "quảng nam", "quang nam", "điện bàn"],
    center: { lat: 15.8801, lng: 108.338 },
    beaches: [
      { name: "Biển An Bàng", lat: 15.9037, lng: 108.3683 },
      { name: "Biển Cửa Đại", lat: 15.8872, lng: 108.3756 },
      { name: "Biển Hà My", lat: 15.9275, lng: 108.3494 },
      { name: "Bãi biển Tam Thanh", lat: 15.6028, lng: 108.5722 },
    ],
  },
  {
    name: "Đà Lạt (Lâm Đồng)",
    aliases: ["đà lạt", "da lat", "lâm đồng", "lam dong", "bảo lộc"],
    center: { lat: 11.9404, lng: 108.4377 },
    beaches: [],
  },
  {
    name: "Hồ Chí Minh",
    aliases: [
      "hồ chí minh",
      "ho chi minh",
      "sài gòn",
      "sai gon",
      "hcm",
      "cần giờ",
    ],
    center: { lat: 10.7769, lng: 106.7009 },
    beaches: [{ name: "Bãi biển Cần Giờ (30/4)", lat: 10.3958, lng: 106.9458 }],
  },
  {
    name: "Hà Nội",
    aliases: ["hà nội", "ha noi"],
    center: { lat: 21.0285, lng: 105.8542 },
    beaches: [],
  },
];

// Danh sách phẳng toàn bộ bãi biển cả nước để quét tìm bãi biển gần nhất
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
  const { user, isAuthenticated } = useAuthStore();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isTypingRef = useRef(false);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [nearestHubName, setNearestHubName] = useState("");
  const [nearestBeachInfo, setNearestBeachInfo] = useState("");

  const isAccountReady =
    isAuthenticated ||
    Boolean(data?.isAccountCreated) ||
    Boolean(data?.ownerId) ||
    Boolean(data?.userId);

  const displayOwnerName = user?.full_name || data?.ownerName || "Chủ cơ sở";
  const displayEmail = user?.email || data?.emailContact || "";

  const currentLat = Number(data?.latitude) || 10.7769;
  const currentLng = Number(data?.longitude) || 106.7009;

  // 🌟 TÍNH TOÁN KHOẢNG CÁCH CHUẨN XÁC & BÃI BIỂN TOÀN DIỆN
  const calculateMetrics = useCallback(
    (lat, lng, explicitCity, extraContext = "") => {
      const normCity = (explicitCity || data?.city || "").toLowerCase().trim();

      // 1. Tìm Hub trung tâm
      let targetHub = null;
      if (normCity) {
        targetHub = VIETNAM_TOURISM_HUBS.find((h) =>
          h.aliases.some((alias) => normCity.includes(alias)),
        );
      }

      // Tự động tìm Hub gần nhất nếu không khớp tên
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

      if (!targetHub) {
        targetHub = VIETNAM_TOURISM_HUBS[0];
      }

      setNearestHubName(targetHub.name);

      const distCenter = calculateHaversine(
        lat,
        lng,
        targetHub.center.lat,
        targetHub.center.lng,
      );

      // 2. KIỂM TRA BÃI BIỂN TOÀN DIỆN (QUÉT TRÊN TOÀN QUỐC)
      let minBeachDist = Infinity;
      let closestBeachName = "";

      ALL_VIETNAM_BEACHES.forEach((beach) => {
        const d = calculateHaversine(lat, lng, beach.lat, beach.lng);
        if (d < minBeachDist) {
          minBeachDist = d;
          closestBeachName = beach.name;
        }
      });

      // Nhận diện theo từ khóa địa lý từ OpenStreetMap (đường ven biển, bãi tắm, resort sát biển)
      const coastalKeywords = [
        "bãi tắm",
        "bãi biển",
        "bờ biển",
        "ven biển",
        "resort",
        "biển",
        "coast",
        "beach",
        "vịnh",
      ];
      const isContextSeaside = coastalKeywords.some((kw) =>
        (extraContext || "").toLowerCase().includes(kw),
      );

      // Sát biển nếu khoảng cách <= 2.5km đến điểm bãi tắm gần nhất HOẶC có từ khóa biển và khoảng cách <= 4.5km
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

  // Lưu calculateMetrics vào Ref để tránh lỗi Stale Closure trong Leaflet Event
  const calculateMetricsRef = useRef(calculateMetrics);
  useEffect(() => {
    calculateMetricsRef.current = calculateMetrics;
  }, [calculateMetrics]);

  // 🌟 REVERSE GEOCODE: KÉO GHIM TRÊN MAP -> TỰ ĐỘNG ĐIỀN ĐỊA CHỈ & THÀNH PHỐ
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
        detectedCity =
          addr.city || addr.province || addr.state || addr.county || "";

        const roadName =
          addr.road || addr.suburb || addr.neighbourhood || addr.quarter || "";
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
      console.warn("Lỗi đọc địa chỉ từ toạ độ:", err.message);
    } finally {
      setIsGeocoding(false);
    }

    const fallbackMetrics = calculateMetricsRef.current(lat, lng, data?.city);
    onChange({
      latitude: lat,
      longitude: lng,
      distance_to_center: fallbackMetrics.distance_to_center,
      is_beachfront: fallbackMetrics.is_beachfront,
    });
  };

  // Lưu handleReverseGeocode vào ref
  const handleReverseGeocodeRef = useRef(handleReverseGeocode);
  useEffect(() => {
    handleReverseGeocodeRef.current = handleReverseGeocode;
  });

  // 🌟 TÌM KIẾM ĐA TẦNG (MULTI-TIER GEOCODING): KHÔNG BAO GIỜ BỊ ĐỨNG IM
  const geocodeAddressToMap = useCallback(
    async (cityText, addressText) => {
      const cleanCity = (cityText || "").trim();
      const cleanAddress = (addressText || "").trim();

      if (!cleanCity && !cleanAddress) return;

      setIsGeocoding(true);

      try {
        let results = [];

        // TẦNG 1: Thử tìm chính xác cả Địa chỉ cụ thể + Thành phố
        if (cleanAddress && cleanCity) {
          const query = `${cleanAddress}, ${cleanCity}, Việt Nam`;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
            { headers: { "User-Agent": "GoStayApp/1.0" } },
          );
          results = await res.json();
        }

        // TẦNG 2: Nếu không thấy -> Tự động tìm riêng Thành phố / Tỉnh
        if ((!results || results.length === 0) && cleanCity) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanCity + ", Việt Nam")}&format=json&limit=1`,
            { headers: { "User-Agent": "GoStayApp/1.0" } },
          );
          results = await res.json();
        }

        // TẦNG 3: Nếu vẫn không ra -> Dò trong bảng tọa độ chuẩn của GoStay
        let lat = null;
        let lng = null;

        if (results && results.length > 0) {
          lat = parseFloat(results[0].lat);
          lng = parseFloat(results[0].lon);
        } else if (cleanCity) {
          const matchedHub = VIETNAM_TOURISM_HUBS.find((h) =>
            h.aliases.some((alias) => cleanCity.toLowerCase().includes(alias)),
          );
          if (matchedHub) {
            lat = matchedHub.center.lat;
            lng = matchedHub.center.lng;
          }
        }

        // BAY BẢN ĐỒ ĐẾN VỊ TRÍ ĐÍCH
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
        console.warn("Lỗi geocoding đa tầng:", err.message);
      } finally {
        setIsGeocoding(false);
      }
    },
    [onChange],
  );

  // Debounce: Sau khi ngừng gõ 800ms -> Tự động bay bản đồ
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

  // Khởi tạo bản đồ
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
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-map-marker",
        html: `
          <div style="background-color: #006ce4; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker(initialCoords, {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      // Gọi qua Ref để tránh giữ state cũ của component
      marker.on("dragend", (e) => {
        const position = e.target.getLatLng();
        const lat = Math.round(position.lat * 100000) / 100000;
        const lng = Math.round(position.lng * 100000) / 100000;
        handleReverseGeocodeRef.current(lat, lng);
      });

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        const roundedLat = Math.round(lat * 100000) / 100000;
        const roundedLng = Math.round(lng * 100000) / 100000;
        marker.setLatLng([roundedLat, roundedLng]);
        handleReverseGeocodeRef.current(roundedLat, roundedLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      const initialMetrics = calculateMetricsRef.current(
        currentLat,
        currentLng,
        data?.city,
      );
      if (data?.distance_to_center === undefined) {
        onChange({
          distance_to_center: initialMetrics.distance_to_center,
          is_beachfront: initialMetrics.is_beachfront,
        });
      }
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
      {/* ── TIÊU ĐỀ BƯỚC 1 ── */}
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
        <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                ✓ Tài khoản đối tác đã thiết lập
              </span>
              <span className="text-sm font-black text-slate-900 block">
                {displayOwnerName} {displayEmail && `(${displayEmail})`}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tài khoản đã sẵn sàng. Bạn không cần nhập lại mật khẩu khi quay
                lại bước này.
              </p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
            <ShieldCheck size={14} /> Đã kích hoạt
          </span>
        </div>
      ) : (
        <div className="p-5 sm:p-7 bg-[#e8f2ff]/50 border border-blue-200 rounded-2xl space-y-4 shadow-xs">
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
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
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
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email đăng nhập quản trị *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={data?.emailContact || ""}
                  onChange={(e) => onChange({ emailContact: e.target.value })}
                  placeholder="partner@example.com"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.emailContact
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
                />
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.emailContact && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.emailContact}
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
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
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
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-xs">
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
                  : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
              } outline-none transition shadow-2xs`}
            />
            {errors?.hotelName && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.hotelName}
              </p>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">
              Tên chính thức hiển thị trên kết quả tìm kiếm của GoStay.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại hình chỗ nghỉ *
            </label>
            <div className="relative">
              <select
                value={data?.propertyType || "hotel"}
                onChange={(e) => onChange({ propertyType: e.target.value })}
                className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100 shadow-2xs pr-10"
              >
                <option value="hotel">Khách sạn (Hotel)</option>
                <option value="resort">Khu nghỉ dưỡng (Resort)</option>
                <option value="homestay">Homestay</option>
                <option value="villa">Biệt thự (Villa)</option>
                <option value="apartment">Căn hộ dịch vụ (Apartment)</option>
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
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-xs">
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
                  : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
              } outline-none transition shadow-2xs`}
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
                    : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                } outline-none transition shadow-2xs`}
              />
              <button
                type="button"
                onClick={() => geocodeAddressToMap(data?.city, data?.address)}
                disabled={isGeocoding || (!data?.address && !data?.city)}
                className="h-11 sm:h-12 px-4 bg-[#006ce4] hover:bg-[#0057b8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition disabled:opacity-50"
              >
                <Search size={14} />
                Tìm ngay
              </button>
            </div>
            {errors?.address && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.address}
              </p>
            )}
          </div>
        </div>

        {/* 🌟 BẢN ĐỒ ĐỒNG BỘ 2 CHIỀU */}
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

        {/* 🌟 KẾT QUẢ TÍNH TOÁN KHOẢNG CÁCH TỰ ĐỘNG */}
        <div className="p-4 bg-white border border-blue-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-center shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Navigation size={18} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Khoảng cách đến Trung tâm{" "}
                {nearestHubName ? `(${nearestHubName})` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">
                  {data?.distance_to_center !== undefined
                    ? data.distance_to_center
                    : 1.2}{" "}
                  km
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  (Đường chim bay)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs transition-colors duration-300 ${
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
              <div className="flex flex-col">
                <span
                  className={`text-sm font-extrabold transition-colors ${
                    data?.is_beachfront ? "text-cyan-700" : "text-slate-500"
                  }`}
                >
                  {data?.is_beachfront
                    ? "✓ Chỗ nghỉ Sát biển / Giáp biển"
                    : "Không nằm sát biển"}
                </span>
                {nearestBeachInfo && (
                  <span className="text-[11px] text-cyan-600 font-semibold">
                    {nearestBeachInfo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1HotelInfo;
