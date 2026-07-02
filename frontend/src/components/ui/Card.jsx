import React from 'react';

const Card = ({ image, title, subTitle, onClick, className = '', ...props }) => {
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer group flex flex-col overflow-hidden rounded-lg transition-all duration-200 ${className}`}
      {...props}
    >
      {/* Khung chứa ảnh */}
      <div className="w-full aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      
      {/* Phần chữ bên dưới */}
      <div className="pt-3 pb-1">
        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#006ce4]">
          {title}
        </h3>
        {subTitle && (
          <p className="text-sm text-gray-500 mt-0.5">
            {subTitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default Card;