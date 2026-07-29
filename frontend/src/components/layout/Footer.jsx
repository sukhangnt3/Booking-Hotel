import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#002452] text-white text-xs py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-3 font-normal leading-relaxed opacity-90">
        
        {/* Nội dung thông tin doanh nghiệp */}
        <p>
          Công ty TNHH Traveloka Việt Nam. Mã số doanh nghiệp 0313581779 | 
          Địa chỉ: Tòa nhà An Phú, 117 - 119 Lý Chính Thắng, Phường Xuân Hòa, TP HCM | 
          Đại diện pháp luật: Nguyễn Thị Thu Hương | 
          Email: <a href="mailto:cs@traveloka.com" className="hover:underline">cs@traveloka.com</a> | 
          Tel: +84 28 3861 4699
        </p>

        {/* Bản quyền */}
        <p className="mt-1 font-medium opacity-80">
          Copyright © 2026 Traveloka. All rights reserved
        </p>
        
      </div>
    </footer>
  );
};

export default Footer;