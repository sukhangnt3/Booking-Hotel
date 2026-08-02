import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

const HotelDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchHotelDetail = async () => {
      setLoading(true);
      try {
        if (!id || id === "undefined") throw new Error("ID không hợp lệ");
        const data = await hotelService.getHotelById(id);
        if (data) setHotel(data);
        else throw new Error("API No Data");
      } catch (err) {
        console.warn("Chuyển sang Mock Data chuẩn Booking:", err);
        // Dữ liệu giả lập khớp với ảnh mẫu của bạn
        setHotel({
          id: id || "1",
          name: "Crystal Apartment Hillside Phu Quoc - Sunset Town & Firework & Free Airport Pickup",
          address: "Khu pho 6 An Thoi (TH1, Sungrand City, Hillside Residence), Phú Quốc, Việt Nam",
          rating: 8.0,
          ratingText: "Rất tốt",
          reviewsCount: 88,
          locationRating: 9.3,
          stars: 4,
          images: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80",
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetail();
  }, [id]);

  const handleBookNow = () => {
    navigate(`/booking?hotelId=${id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`);
  };

  if (loading) return <LoadingSpinner />;

  const images = hotel?.images || [];

  return (
    <div className="bg-white min-h-screen pb-16 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* 1. THANH TAB MENU ĐIỀU HƯỚNG BÊN TRÊN */}
        <div className="flex items-center gap-8 border-b border-gray-200 text-sm font-medium pt-3 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 whitespace-nowrap transition ${
              activeTab === "overview"
                ? "border-b-2 border-[#006ce4] text-[#006ce4] font-bold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-3 whitespace-nowrap transition ${
              activeTab === "info"
                ? "border-b-2 border-[#006ce4] text-[#006ce4] font-bold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Thông tin & giá
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`pb-3 whitespace-nowrap transition ${
              activeTab === "facilities"
                ? "border-b-2 border-[#006ce4] text-[#006ce4] font-bold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Tiện nghi
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`pb-3 whitespace-nowrap transition ${
              activeTab === "rules"
                ? "border-b-2 border-[#006ce4] text-[#006ce4] font-bold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Quy tắc chung
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 whitespace-nowrap transition ${
              activeTab === "reviews"
                ? "border-b-2 border-[#006ce4] text-[#006ce4] font-bold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Đánh giá của khách ({hotel?.reviewsCount || 88})
          </button>
        </div>

        {/* 2. HEADER: TIÊU ĐỀ & NÚT ĐẶT NGAY */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            {/* Sao + Tag */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex text-amber-400 text-xs">
                {Array.from({ length: hotel?.stars || 4 }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <span className="bg-[#ffb700] text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                👍+
              </span>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                🌊 Giáp biển • Bãi biển riêng
              </span>
            </div>

            {/* Tên khách sạn */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
              {hotel?.name}
            </h1>

            {/* Địa chỉ */}
            <p className="text-xs text-gray-600 mt-1">
              📍 {hotel?.address} –{" "}
              <button type="button" className="text-[#006ce4] font-bold underline hover:text-blue-800">
                Vị trí xuất sắc - hiển thị bản đồ
              </button>
            </p>
          </div>

          {/* Cột Nút Action góc phải */}
          <div className="flex flex-col items-end gap-2 shrink-0 self-end md:self-start">
            <div className="flex items-center gap-3">
              <button type="button" className="p-2 border rounded-full hover:bg-gray-50 text-gray-600">
                🤍
              </button>
              <button type="button" className="p-2 border rounded-full hover:bg-gray-50 text-gray-600">
                🔗
              </button>
              <button
                type="button"
                onClick={handleBookNow}
                className="bg-[#006ce4] hover:bg-[#0057b8] text-white font-bold text-sm px-6 py-2.5 rounded-md transition"
              >
                Đặt ngay
              </button>
            </div>
            <button type="button" className="text-xs text-[#006ce4] underline font-medium hover:text-blue-800">
              Chúng Tôi Luôn Khớp Giá!
            </button>
          </div>
        </div>

        {/* 3. KHU VỰC CHÍNH: GALLERY ẢNH & BOX ĐÁNH GIÁ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* CỘT TRÁI: KHUNG GALLERY ẢNH (8 Cột) */}
          <div className="lg:col-span-9 space-y-2">
            {/* Lưới hàng trên */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-[360px]">
              {/* Ảnh lớn chính bên trái */}
              <div className="md:col-span-2 h-full rounded-l-lg overflow-hidden bg-gray-100">
                <img
                  src={images[0]}
                  alt="Main"
                  className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
                />
              </div>

              {/* 2 ảnh cột bên phải */}
              <div className="flex flex-col gap-2 h-full">
                <div className="h-1/2 rounded-r-lg overflow-hidden bg-gray-100">
                  <img
                    src={images[1]}
                    alt="Sub 1"
                    className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
                  />
                </div>
                <div className="h-1/2 rounded-r-lg overflow-hidden bg-gray-100">
                  <img
                    src={images[2]}
                    alt="Sub 2"
                    className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Lưới hàng ảnh nhỏ phía dưới */}
            <div className="grid grid-cols-5 gap-2 h-20">
              {images.slice(3, 7).map((img, idx) => (
                <div key={idx} className="h-full rounded-lg overflow-hidden bg-gray-100">
                  <img src={img} alt="" className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer" />
                </div>
              ))}

              {/* Ô xem thêm ảnh cuối cùng */}
              <div className="relative h-full rounded-lg overflow-hidden bg-gray-900 cursor-pointer group">
                <img src={images[7] || images[0]} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition" />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                  +96 ảnh
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BOX ĐÁNH GIÁ & BẢN ĐỒ (3 Cột) */}
          <div className="lg:col-span-3 space-y-3">
            
            {/* Box Đánh Giá Của Khách */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-gray-900">
                    {hotel?.ratingText || "Rất tốt"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {hotel?.reviewsCount || 88} đánh giá
                  </div>
                </div>
                <div className="bg-[#003580] text-white font-bold text-base px-2.5 py-1 rounded-t-lg rounded-br-lg">
                  {hotel?.rating || "8,0"}
                </div>
              </div>

              {/* Trích dẫn nhận xét */}
              <div className="border-t pt-2 text-xs text-gray-600 leading-relaxed">
                <p className="font-semibold text-gray-800 mb-1">Khách lưu trú ở đây thích điều gì?</p>
                <p className="italic">
                  “We had a wonderful time here. The apartment was cozy, clean, and had a fantastic view of the ocean...”
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-gray-700">
                  <span className="w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold text-[10px]">M</span>
                  <span>Maddison</span>
                  <span>🇳🇿 New Zealand</span>
                </div>
              </div>

              {/* Điểm Vị trí */}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800">Vị trí tuyệt vời!</span>
                <span className="border border-gray-300 font-bold text-xs px-1.5 py-0.5 rounded">
                  {hotel?.locationRating || "9,3"}
                </span>
              </div>
            </div>

            {/* Map Preview */}
            <div className="relative h-28 rounded-xl overflow-hidden border border-gray-200 bg-blue-50 flex flex-col items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80"
                alt="Map"
                className="w-full h-full object-cover opacity-60"
              />
              <button
                type="button"
                className="absolute bg-[#006ce4] text-white font-bold text-xs px-3 py-1.5 rounded-md shadow hover:bg-blue-700 transition"
              >
                Hiển thị trên bản đồ
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default HotelDetailPage;