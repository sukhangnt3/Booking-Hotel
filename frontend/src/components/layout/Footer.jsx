import React from "react";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#003580] text-white pt-12 pb-6 px-4 mt-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 border-b border-white/10 pb-10">
          <div className="space-y-4">
            <h4 className="text-lg font-bold">Về GoStay</h4>
            <ul className="space-y-2 opacity-80 text-sm">
              <li>
                <a href="#" className="hover:underline">
                  Liên hệ chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Trợ giúp
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Về chúng tôi
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-bold">Khám phá</h4>
            <ul className="space-y-2 opacity-80 text-sm">
              <li>
                <a href="#" className="hover:underline">
                  Khách sạn
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Căn hộ
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Resort
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-bold">Liên hệ</h4>
            <div className="text-sm opacity-80 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={16} /> TP. Hồ Chí Minh
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} /> +84 28 3861 4699
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} /> cs@gostay.com
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] opacity-60">
          <p>Mã số doanh nghiệp: 0313581779. Đại diện: Nguyễn Thị Thu Hương.</p>
          <p>Copyright © {currentYear} GoStay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
