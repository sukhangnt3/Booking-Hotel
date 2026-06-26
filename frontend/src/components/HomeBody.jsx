const HomeBody = ({ onOpenLogin }) => {
  return (
    <div className="max-w-6xl mx-auto p-8 text-center bg-white mt-6 rounded-xl shadow-sm border border-gray-200 text-gray-800">
      <h2 className="text-xl font-bold">Khám phá các khách sạn hot nhất</h2>
      <p className="text-gray-500 text-sm mt-1 mb-4">Hệ thống tìm kiếm thông minh kết nối dữ liệu thời gian thực.</p>
      <button 
        onClick={onOpenLogin}
        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
      >
        Nhận Ưu Đãi Thành Viên
      </button>
    </div>
  );
};

export default HomeBody;