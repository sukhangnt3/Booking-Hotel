import React from 'react';
import AppRoutes from './routes';
import './index.css'; // Đảm bảo đã import Tailwind CSS

function App() {
  return (
    <>
      {/* Kích hoạt bản đồ định tuyến để lắp ghép Layout + Page */}
      <AppRoutes />
    </>
  );
}

export default App;