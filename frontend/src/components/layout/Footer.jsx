import React from "react";
import { Mail, Phone, MapPin, Building, ShieldCheck } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    /* BỎ px-4 ở thẻ footer để không làm lệch khung max-w-7xl */
    <footer className="w-full bg-[#0a2540] text-slate-300 font-sans border-t border-amber-500/20 pt-16 pb-8 mt-16 select-none">
      {/* Container chuẩn: Dùng đúng px-4 sm:px-6 lg:px-8 khớp 100% với Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* CHIA ĐỀU 4 CỘT CÂN ĐỐI (TRẢI ĐỀU TỪ MÉP TRÁI SANG MÉP PHẢI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12 pb-12 border-b border-white/10">
          
          {/* CỘT 1: THƯƠNG HIỆU & GIỚI THIỆU (Thẳng hàng với Logo Header) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0a2540] p-2 rounded-xl shadow-md shrink-0">
                <Building size={22} strokeWidth={2.5} />
              </div>   
                <span className="text-2xl font-serif tracking-wide font-black bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
                  GoStay
                </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-400 font-normal">
              Nền tảng đặt phòng nghỉ dưỡng, resort cao cấp và homestay phong cách hàng đầu Việt Nam với mức giá đặc quyền.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck size={16} className="text-amber-400 shrink-0" />
              <span>Hệ thống đặt phòng an toàn 24/7</span>
            </div>
          </div>

          {/* CỘT 2: VỀ GOSTAY */}
          <div className="space-y-4 lg:pl-6">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Về GoStay
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Về chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Liên hệ chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Trung tâm trợ giúp
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Điều khoản dịch vụ
                </a>
              </li>
            </ul>
          </div>

          {/* CỘT 3: KHÁM PHÁ */}
          <div className="space-y-4 lg:pl-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Khám phá
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Khách sạn cao cấp
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Căn hộ sang trọng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Resort biển & Villa
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Ưu đãi độc quyền
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-300 hover:translate-x-1 inline-block transition-all">
                  Dành cho Chủ chỗ nghỉ
                </a>
              </li>
            </ul>
          </div>

          {/* CỘT 4: LIÊN HỆ & THANH TOÁN (Thẳng hàng với cụm Avatar Header) */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Liên hệ hỗ trợ
            </h4>
            
            <div className="text-xs space-y-3 text-slate-300">
              <div className="flex items-center gap-3">
                <MapPin size={17} className="text-amber-400 shrink-0" />
                <span>TP. Hồ Chí Minh, Việt Nam</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={17} className="text-amber-400 shrink-0" />
                <span className="font-bold text-white tracking-wider">+84 28 3861 4699</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">24/7</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={17} className="text-amber-400 shrink-0" />
                <a href="mailto:cs@gostay.com" className="hover:text-amber-300 transition-colors">
                  cs@gostay.com
                </a>
              </div>
            </div>

            {/* Các cổng thanh toán */}
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Phương thức thanh toán
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-slate-700">VNPay QR</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;