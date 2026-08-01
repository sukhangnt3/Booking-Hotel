import React from "react";

const HotelGallery = ({ images = [] }) => {
  // Lấy ảnh thumbnail làm ảnh chính, còn lại là ảnh phụ
  const mainImage = images.find((img) => img.is_thumbnail) || images[0];
  const subImages = images.filter((img) => !img.is_thumbnail).slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-2xl overflow-hidden shadow-sm">
      <div className="md:col-span-2 h-[340px]">
        <img
          src={mainImage?.path || "/assets/images/placeholder-hotel.jpg"}
          alt="Main View"
          className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
        />
      </div>
      <div className="grid grid-rows-2 gap-2 h-[340px]">
        {subImages.map((img, idx) => (
          <img
            key={img.id || idx}
            src={img.path}
            alt={`Sub View ${idx}`}
            className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
          />
        ))}
      </div>
    </div>
  );
};

export default HotelGallery;
