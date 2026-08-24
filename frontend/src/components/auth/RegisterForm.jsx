import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { Button, Input, Badge } from "../ui";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User,
  MapPin,
  CreditCard,
  Hotel,
} from "lucide-react";

const RegisterOwnerForm = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({
    // Bước 1: Tài khoản người đại diện
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",

    // Bước 2: Thông tin Chỗ nghỉ / Khách sạn
    hotelName: "",
    hotelType: "hotel",
    address: "",
    city: "Đà Nẵng",
    totalRooms: "",

    // Bước 3: Tài khoản nhận tiền
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
    taxCode: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  // KIỂM TRA BƯỚC 1 (Tài khoản + Mật khẩu gom chung)
  const validateStep1 = () => {
    if (!formData.fullName.trim())
      return "Vui lòng nhập họ và tên người đại diện";
    if (!formData.email.trim() || !formData.email.includes("@"))
      return "Vui lòng nhập email hợp lệ";
    if (!formData.phone.trim() || formData.phone.length < 9)
      return "Vui lòng nhập số điện thoại hợp lệ";
    if (!formData.password || formData.password.length < 6)
      return "Mật khẩu phải có ít nhất 6 ký tự";
    if (formData.password !== formData.confirmPassword)
      return "Mật khẩu xác nhận không trùng khớp";
    return null;
  };

  // KIỂM TRA BƯỚC 2 (Khách sạn)
  const validateStep2 = () => {
    if (!formData.hotelName.trim())
      return "Vui lòng nhập tên khách sạn/chỗ nghỉ";
    if (!formData.address.trim()) return "Vui lòng nhập địa chỉ chi tiết";
    if (!formData.totalRooms || Number(formData.totalRooms) <= 0)
      return "Vui lòng nhập số lượng phòng";
    return null;
  };

  // KIỂM TRA BƯỚC 3 (Ngân hàng)
  const validateStep3 = () => {
    if (!formData.bankName.trim())
      return "Vui lòng nhập tên ngân hàng nhận thanh toán";
    if (!formData.bankAccount.trim())
      return "Vui lòng nhập số tài khoản nhận tiền";
    if (!formData.bankAccountName.trim())
      return "Vui lòng nhập tên chủ tài khoản";
    return null;
  };

  const handleNext = (e) => {
    e.preventDefault();
    let err = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();

    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep3();
    if (err) return setError(err);

    setLoading(true);
    setError("");
    try {
      // Đăng ký trực tiếp không qua Gmail
      const response = await authService.register({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "owner", // Gán quyền chủ khách sạn
      });

      const user = response?.user || response?.data?.user || response?.data;
      const token =
        response?.systemToken || response?.token || response?.data?.token;

      if (!user) throw new Error("Không thể tạo tài khoản đối tác.");

      loginStore({ ...user, role: "owner" }, token);

      // Chuyển thẳng vào Dashboard Chủ chỗ nghỉ
      navigate("/owner/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Đăng ký không thành công!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-10 px-4 sm:px-6 font-sans">
      {/* TIÊU ĐỀ */}
      <div className="text-center mb-6">
        <Badge variant="primary" className="mb-2 px-3 py-1">
          Kênh Đối Tác GoStay
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Đăng Ký Chỗ Nghỉ Của Quý Vị
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Hoàn tất 3 bước đơn giản để bắt đầu nhận đặt phòng
        </p>
      </div>

      {/* THANH TIẾN TRÌNH */}
      <div className="flex items-center justify-between mb-8 px-4 sm:px-8">
        <div className="flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step >= 1
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            1
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}
          >
            Tài khoản
          </span>
        </div>

        <div
          className={`flex-1 h-1 mx-2 rounded ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}
        />

        <div className="flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step >= 2
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            2
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}
          >
            Khách sạn
          </span>
        </div>

        <div
          className={`flex-1 h-1 mx-2 rounded ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}
        />

        <div className="flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step === 3
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            3
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${step === 3 ? "text-blue-600" : "text-gray-400"}`}
          >
            Nhận tiền
          </span>
        </div>
      </div>

      {/* BOX LỖI */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r-lg">
          {error}
        </div>
      )}

      {/* FORM */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
        {/* ================= BƯỚC 1: TÀI KHOẢN + MẬT KHẨU GOM CHUNG ================= */}
        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <User className="text-blue-600" size={18} /> Bước 1: Thông tin
              người đại diện & Mật khẩu
            </h2>

            <Input
              label="Họ và tên người đại diện *"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              leftIcon={<User size={18} />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email liên hệ kinh doanh *"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="hotel@domain.com"
                leftIcon={<Mail size={18} />}
              />
              <Input
                label="Số điện thoại *"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="0905 xxx xxx"
                leftIcon={<Phone size={18} />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mật khẩu *"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Ít nhất 6 ký tự"
                leftIcon={<Lock size={18} />}
              />
              <Input
                label="Xác nhận mật khẩu *"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                leftIcon={<Lock size={18} />}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-200"
            >
              Tiếp tục: Thông tin khách sạn <ArrowRight size={18} />
            </Button>
          </form>
        )}

        {/* ================= BƯỚC 2: THÔNG TIN KHÁCH SẠN ================= */}
        {step === 2 && (
          <form onSubmit={handleNext} className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Hotel className="text-blue-600" size={18} /> Bước 2: Thông tin
              Chỗ nghỉ / Khách sạn
            </h2>

            <Input
              label="Tên chỗ nghỉ / Khách sạn *"
              name="hotelName"
              required
              value={formData.hotelName}
              onChange={handleChange}
              placeholder="VD: Grand Sea Hotel & Spa"
              leftIcon={<Building2 size={18} />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Loại hình cơ sở *
                </label>
                <select
                  name="hotelType"
                  value={formData.hotelType}
                  onChange={handleChange}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="hotel">Khách sạn (Hotel)</option>
                  <option value="resort">Khu nghỉ dưỡng (Resort)</option>
                  <option value="homestay">Homestay / Căn hộ</option>
                  <option value="villa">Biệt thự (Villa)</option>
                </select>
              </div>

              <Input
                label="Số lượng phòng *"
                name="totalRooms"
                type="number"
                min="1"
                required
                value={formData.totalRooms}
                onChange={handleChange}
                placeholder="VD: 15"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tỉnh / Thành phố *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Nha Trang">Nha Trang</option>
                  <option value="Phú Quốc">Phú Quốc</option>
                  <option value="Đà Lạt">Đà Lạt</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Địa chỉ chi tiết *"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Số nhà, Tên đường, Phường/Xã"
                  leftIcon={<MapPin size={18} />}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-1/3 h-12 font-bold flex items-center justify-center gap-1"
              >
                <ArrowLeft size={16} /> Quay lại
              </Button>
              <Button
                type="submit"
                className="w-2/3 h-12 font-bold flex items-center justify-center gap-2"
              >
                Tiếp tục: Thanh toán <ArrowRight size={18} />
              </Button>
            </div>
          </form>
        )}

        {/* ================= BƯỚC 3: TÀI KHOẢN NHẬN TIỀN & HOÀN TẤT ================= */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={18} /> Bước 3: Tài
              khoản nhận tiền phòng
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ngân hàng nhận tiền *"
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                placeholder="VD: Vietcombank, Techcombank"
              />
              <Input
                label="Số tài khoản ngân hàng *"
                name="bankAccount"
                required
                value={formData.bankAccount}
                onChange={handleChange}
                placeholder="VD: 0123456789"
              />
            </div>

            <Input
              label="Tên chủ tài khoản (In hoa không dấu) *"
              name="bankAccountName"
              required
              value={formData.bankAccountName}
              onChange={handleChange}
              placeholder="VD: NGUYEN VAN A"
            />

            <Input
              label="Mã số thuế / CCCD (Tùy chọn)"
              name="taxCode"
              value={formData.taxCode}
              onChange={handleChange}
              placeholder="Mã số thuế hoặc CCCD"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-1/3 h-12 font-bold flex items-center justify-center gap-1"
              >
                <ArrowLeft size={16} /> Quay lại
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                className="w-2/3 h-12 font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                <CheckCircle2 size={18} /> Hoàn Tất & Vào Dashboard
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        Bạn đã có tài khoản đối tác?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-600 font-bold hover:underline"
        >
          Đăng nhập ngay
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
        <ShieldCheck size={16} />
        <span className="text-[11px] font-medium">
          Bảo mật thông tin doanh nghiệp theo tiêu chuẩn quốc tế
        </span>
      </div>
    </div>
  );
};

export default RegisterOwnerForm;
