import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // <-- Add this line back!
import { authService } from "@/services/authService";
import {
  Building2,
  Image as ImageIcon,
  Check,
  X,
  FileCheck,
  MapPin,
  Clock,
  Plus,
  Send,
  MessageSquare,
  ChevronDown,
  CreditCard,
  Home,
  Hotel,
  UploadCloud,
  FileText,
} from "lucide-react";

// ... rest of your code

const RegisterOwnerForm = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // CHỨA TOÀN BỘ DỮ LIỆU CẦN THIẾT CHO ADMIN DUYỆT
  const [formData, setFormData] = useState({
    // Tab 1: Cơ sở lưu trú & Phòng
    hotelNameEn: "",
    hotelType: "hotel",
    starRating: "3",
    province: "TP. Hồ Chí Minh",
    streetAddressEn: "",
    latitude: "10.762622",
    longitude: "106.660172",

    roomNameEn: "",
    bedType: "Giường đôi lớn (Queen/King)",
    maxGuests: "2",
    weekdayPrice: "",

    // Tab 2: Ảnh & Pháp lý
    hotelImages: [],
    licenseFile: null,

    // Tab 3: Hợp đồng & Ngân hàng nhận tiền
    commissionRate: "18",
    signerName: "",
    signerPhone: "",
    signerEmail: "",
    bankName: "Vietcombank",
    bankAccount: "",
    bankAccountName: "",
    taxCode: "",

    // Tab 4: Chính sách & Tiện nghi
    checkInFrom: "14:00",
    checkOutTo: "12:00",
    allowChildren: "yes",
    hasBreakfast: "no",
    amenities: [],
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.hotelImages.length > 5) {
      return setError("Tối đa 5 ảnh.");
    }
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFormData((prev) => ({
      ...prev,
      hotelImages: [...prev.hotelImages, ...newImages],
    }));
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      hotelImages: prev.hotelImages.filter((_, i) => i !== index),
    }));
  };

  const handleLicenseUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        licenseFile: {
          file,
          name: file.name,
          preview: URL.createObjectURL(file),
        },
      }));
    }
  };

  const toggleAmenity = (id) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(id);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((item) => item !== id)
          : [...prev.amenities, id],
      };
    });
  };

  // KIỂM TRA DỮ LIỆU TỪNG TAB TRƯỚC KHI CHO ĐI TIẾP
  const handleNext = () => {
    setError("");
    if (activeTab === 1) {
      if (
        !formData.hotelNameEn ||
        !formData.streetAddressEn ||
        !formData.roomNameEn ||
        !formData.weekdayPrice
      ) {
        return setError(
          "Vui lòng nhập đủ: Tên chỗ nghỉ, Địa chỉ, Tên phòng và Giá bán.",
        );
      }
    }
    if (activeTab === 2) {
      if (formData.hotelImages.length === 0)
        return setError("Vui lòng tải lên ít nhất 1 ảnh chỗ nghỉ.");
      if (!formData.licenseFile)
        return setError(
          "Vui lòng tải lên CCCD hoặc Giấy phép kinh doanh để Admin đối chiếu.",
        );
    }
    if (activeTab === 3) {
      if (!formData.signerName || !formData.signerPhone)
        return setError("Vui lòng nhập thông tin người ký hợp đồng.");
      if (
        !formData.bankName ||
        !formData.bankAccount ||
        !formData.bankAccountName
      )
        return setError("Vui lòng nhập số tài khoản ngân hàng để nhận tiền.");
    }
    setActiveTab((prev) => prev + 1);
  };

  // SUBMIT TOÀN BỘ LÊN API CHO ADMIN DUYỆT
  const handleSubmitFinal = async () => {
    setLoading(true);
    setError("");
    try {
      const submitData = new FormData();
      // Thông tin hiển thị
      submitData.append("hotel_name_en", formData.hotelNameEn);
      submitData.append("hotel_type", formData.hotelType);
      submitData.append("star_rating", formData.starRating);
      submitData.append("street_address", formData.streetAddressEn);
      submitData.append("province", formData.province);
      submitData.append("latitude", formData.latitude);
      submitData.append("longitude", formData.longitude);

      // Thông tin phòng cấu hình đầu tiên
      submitData.append("room_name", formData.roomNameEn);
      submitData.append("bed_type", formData.bedType);
      submitData.append("max_guests", formData.maxGuests);
      submitData.append("price", formData.weekdayPrice);

      // Thông tin hợp đồng & Thanh toán (Rất quan trọng cho Admin)
      submitData.append("signer_name", formData.signerName);
      submitData.append("signer_phone", formData.signerPhone);
      submitData.append("signer_email", formData.signerEmail);
      submitData.append("commission_rate", formData.commissionRate);
      submitData.append("bank_name", formData.bankName);
      submitData.append("bank_account", formData.bankAccount);
      submitData.append(
        "bank_account_name",
        formData.bankAccountName.toUpperCase(),
      );
      submitData.append("tax_code", formData.taxCode);

      // Chính sách & Tiện nghi
      submitData.append("check_in", formData.checkInFrom);
      submitData.append("check_out", formData.checkOutTo);
      submitData.append("allow_children", formData.allowChildren);
      submitData.append("has_breakfast", formData.hasBreakfast);
      submitData.append("amenities", JSON.stringify(formData.amenities));

      // File đính kèm
      formData.hotelImages.forEach((img) =>
        submitData.append("hotel_images", img.file),
      );
      submitData.append("license_document", formData.licenseFile.file);

      // GỌI API (Đổi status thành PENDING bên backend)
      await authService.registerOwner(submitData);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký không thành công!");
    } finally {
      setLoading(false);
    }
  };

  // MÀN HÌNH CHỜ DUYỆT
  if (isSubmitted) {
    return (
      <div className="w-full max-w-lg mx-auto py-20 px-6 text-center">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock size={40} className="animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Hồ Sơ Đang Được Xét Duyệt!</h2>
        <p className="text-gray-500 mb-6">
          GoStay sẽ thẩm định hồ sơ pháp lý, tài khoản ngân hàng của bạn và liên
          hệ lại qua email trong 24-48 giờ tới.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left text-xs text-gray-600 mb-6 space-y-2">
          <p>
            ✓ <b>Khách sạn:</b> {formData.hotelNameEn}
          </p>
          <p>
            ✓ <b>Ngân hàng nhận tiền:</b> {formData.bankName} -{" "}
            {formData.bankAccount}
          </p>
          <p>
            ✓ <b>Trạng thái:</b>{" "}
            <span className="text-amber-600 font-bold">
              Chờ Admin phê duyệt
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="w-full h-12 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
        >
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f7f9fa] font-sans">
      {/* THANH TAB TIẾN TRÌNH */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 pt-4 flex text-sm font-semibold text-gray-500 overflow-x-auto">
          {[
            { id: 1, name: "Thông tin & Phòng" },
            { id: 2, name: "Ảnh & Pháp lý" },
            { id: 3, name: "Hợp đồng & Thanh toán" },
            { id: 4, name: "Chính sách & Hoàn tất" },
          ].map((tab) => (
            <div
              key={tab.id}
              className={`flex-1 min-w-[150px] text-center pb-3 border-b-[3px] transition-colors ${activeTab >= tab.id ? "border-blue-600 text-blue-600 font-bold" : "border-transparent"}`}
            >
              {tab.name}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8 items-start">
        {/* KHUNG NỘI DUNG CHÍNH LÀM RỘNG RA */}
        <div className="flex-1 bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* ================= TAB 1: THÔNG TIN CƠ BẢN & PHÒNG ================= */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">
                <Building2 className="inline text-blue-600 mr-2" />
                1. Thông tin Cơ sở lưu trú
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tên cơ sở lưu trú (Tiếng Anh) *
                  </label>
                  <input
                    type="text"
                    name="hotelNameEn"
                    value={formData.hotelNameEn}
                    onChange={handleChange}
                    placeholder="VD: Grand Sea Hotel"
                    className="w-full h-12 px-4 border rounded-lg focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Loại hình & Xếp hạng *
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="hotelType"
                      value={formData.hotelType}
                      onChange={handleChange}
                      className="w-1/2 h-12 px-3 border rounded-lg bg-white"
                    >
                      <option value="hotel">Khách sạn</option>
                      <option value="homestay">Homestay</option>
                      <option value="resort">Resort</option>
                    </select>
                    <select
                      name="starRating"
                      value={formData.starRating}
                      onChange={handleChange}
                      className="w-1/2 h-12 px-3 border rounded-lg bg-white"
                    >
                      <option value="3">3 sao ⭐⭐⭐</option>
                      <option value="4">4 sao ⭐⭐⭐⭐</option>
                      <option value="5">5 sao ⭐⭐⭐⭐⭐</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Địa chỉ chi tiết *
                </label>
                <input
                  type="text"
                  name="streetAddressEn"
                  value={formData.streetAddressEn}
                  onChange={handleChange}
                  placeholder="Ví dụ: 120 Võ Nguyên Giáp, Đà Nẵng"
                  className="w-full h-12 px-4 border rounded-lg"
                />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mt-8">
                <Hotel className="inline text-blue-600 mr-2" />
                2. Thiết lập 1 Loại phòng để bán
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tên loại phòng *
                  </label>
                  <input
                    type="text"
                    name="roomNameEn"
                    value={formData.roomNameEn}
                    onChange={handleChange}
                    placeholder="VD: Deluxe Double Room"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Giá 1 đêm (VND) *
                  </label>
                  <input
                    type="number"
                    name="weekdayPrice"
                    value={formData.weekdayPrice}
                    onChange={handleChange}
                    placeholder="VD: 500000"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Loại giường
                  </label>
                  <select
                    name="bedType"
                    value={formData.bedType}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border rounded-lg bg-white"
                  >
                    <option value="Giường đôi (Double/Queen/King)">
                      Giường đôi (Double/Queen/King)
                    </option>
                    <option value="2 Giường đơn (Twin)">
                      2 Giường đơn (Twin)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Số khách tối đa / Phòng
                  </label>
                  <select
                    name="maxGuests"
                    value={formData.maxGuests}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border rounded-lg bg-white"
                  >
                    <option value="1">1 khách</option>
                    <option value="2">2 khách</option>
                    <option value="4">4 khách</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ẢNH VÀ PHÁP LÝ ================= */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 border-b pb-2">
                <ImageIcon className="text-blue-600" /> Ảnh & Hồ sơ pháp lý
              </h2>
              <p className="text-sm text-gray-500">
                Đây là các tài liệu Admin sẽ dùng để xác minh tính có thật của
                cơ sở lưu trú.
              </p>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ảnh chụp chỗ nghỉ (Mặt tiền, sảnh, phòng ngủ) *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {formData.hotelImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-square border rounded-xl overflow-hidden shadow-sm"
                    >
                      <img
                        src={img.preview}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.hotelImages.length < 5 && (
                    <label className="aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 bg-gray-50 hover:bg-blue-50 transition">
                      <Plus size={24} className="text-blue-500 mb-1" />
                      <span className="text-xs text-gray-500">Thêm ảnh</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-sm font-semibold mb-2">
                  Giấy phép kinh doanh hoặc CCCD Chủ hộ *
                </label>
                {formData.licenseFile ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText size={18} /> {formData.licenseFile.name}
                    </div>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, licenseFile: null })
                      }
                      className="text-red-500 hover:underline text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ) : (
                  <label className="h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 bg-gray-50 hover:bg-blue-50 transition">
                    <UploadCloud size={28} className="text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Tải lên file PDF hoặc Ảnh JPG/PNG
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleLicenseUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: HỢP ĐỒNG & THANH TOÁN (QUAN TRỌNG VỚI ADMIN) ================= */}
          {activeTab === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b pb-2">
                <FileCheck className="inline text-blue-600 mr-2" />
                Hợp đồng & Tài khoản nhận tiền
              </h2>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-blue-900">
                  Hoa hồng nền tảng (Trừ khi có đơn thành công)
                </span>
                <span className="text-2xl font-black text-blue-700">18%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Người đại diện ký hợp đồng *
                  </label>
                  <input
                    type="text"
                    name="signerName"
                    value={formData.signerName}
                    onChange={handleChange}
                    placeholder="Họ và tên"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    name="signerPhone"
                    value={formData.signerPhone}
                    onChange={handleChange}
                    placeholder="SĐT liên hệ"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
              </div>

              <h3 className="font-bold text-lg pt-4 border-t">
                <CreditCard className="inline text-blue-600 mr-2" />
                Tài khoản Ngân hàng (Để nhận doanh thu)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Ngân hàng *
                  </label>
                  <select
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border rounded-lg bg-white"
                  >
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="Techcombank">Techcombank</option>
                    <option value="MBBank">MB Bank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="ACB">ACB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Số tài khoản *
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    placeholder="Số tài khoản"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tên chủ tài khoản (Viết Hoa) *
                  </label>
                  <input
                    type="text"
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleChange}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Mã số thuế (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    name="taxCode"
                    value={formData.taxCode}
                    onChange={handleChange}
                    placeholder="Mã số thuế doanh nghiệp/cá nhân"
                    className="w-full h-12 px-4 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CHÍNH SÁCH VÀ TIỆN NGHI ================= */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b pb-2">
                <Clock className="inline text-blue-600 mr-2" />
                Chính sách & Tiện nghi
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Giờ nhận phòng (Từ)
                  </label>
                  <select
                    name="checkInFrom"
                    value={formData.checkInFrom}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border rounded-lg bg-white"
                  >
                    <option value="14:00">14:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Giờ trả phòng (Đến)
                  </label>
                  <select
                    name="checkOutTo"
                    value={formData.checkOutTo}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border rounded-lg bg-white"
                  >
                    <option value="12:00">12:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">
                  Tiện nghi có sẵn tại chỗ nghỉ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "wifi", name: "Wi-Fi miễn phí" },
                    { id: "pool", name: "Hồ bơi ngoài trời" },
                    { id: "parking", name: "Chỗ đỗ xe" },
                    { id: "restaurant", name: "Nhà hàng / Bữa sáng" },
                    { id: "gym", name: "Phòng tập Gym" },
                    { id: "shuttle", name: "Đưa đón sân bay" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`p-4 border rounded-xl cursor-pointer flex items-center justify-between transition-colors ${formData.amenities.includes(item.id) ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <span className="font-semibold text-sm">{item.name}</span>
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(item.id)}
                        onChange={() => toggleAmenity(item.id)}
                        className="w-5 h-5 accent-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= NÚT ĐIỀU HƯỚNG DƯỚI CÙNG ================= */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-100">
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 font-semibold text-sm hover:underline"
            >
              Lưu và thoát
            </button>
            <div className="flex gap-3">
              {activeTab > 1 && (
                <button
                  onClick={() => setActiveTab((prev) => prev - 1)}
                  className="px-6 h-11 border border-gray-300 hover:bg-gray-50 rounded-lg font-semibold text-sm"
                >
                  Quay lại
                </button>
              )}
              {activeTab < 4 ? (
                <button
                  onClick={handleNext}
                  className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={handleSubmitFinal}
                  disabled={loading}
                  className="px-8 h-11 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md transition disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? (
                    "Đang gửi..."
                  ) : (
                    <>
                      <Send size={18} /> Hoàn tất & Gửi duyệt
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= SIDEBAR TRỢ GIÚP BÊN PHẢI ================= */}
        <div className="w-72 hidden lg:block shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sticky top-28 space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-sm text-gray-900">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <MessageSquare size={13} />
              </div>
              Quy trình xét duyệt
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed border-b pb-4">
              Sau khi bạn gửi hồ sơ, bộ phận quản trị sẽ xác minh{" "}
              <b>Giấy phép kinh doanh</b> và <b>Tài khoản ngân hàng</b> của bạn.
              Quá trình này mất khoảng 24-48 giờ làm việc.
            </p>
            <h4 className="font-bold text-gray-900 text-sm">Bạn cần hỗ trợ?</h4>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập câu hỏi..."
                className="w-full h-10 pl-3 pr-9 border border-gray-300 focus:border-blue-600 outline-none rounded-lg text-xs"
              />
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterOwnerForm;
