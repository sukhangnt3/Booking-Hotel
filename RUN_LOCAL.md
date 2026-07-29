# Chạy Booking Hotel ở local

Ứng dụng gồm:

- Frontend React + Vite: `http://localhost:5173`
- Backend Node.js + Express: `http://localhost:5000`
- PostgreSQL database: `hotel_booking`

## Cấu hình database

Backend đọc credential từ `backend/.env`. Cấu hình local hiện tại:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123
DB_NAME=hotel_booking
```

File `.env` đã được thêm vào `.gitignore`. Khi chia sẻ dự án, dùng
`backend/.env.example` làm mẫu và không commit mật khẩu thật.

Kiểm tra PostgreSQL:

```powershell
Get-Service postgresql*
```

## Chạy dự án

Mở hai cửa sổ PowerShell tại thư mục dự án.

Terminal 1 - backend:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Terminal 2 - frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Sau đó mở `http://localhost:5173`.

Nếu PowerShell chặn `npm.ps1`, hãy dùng `npm.cmd` như các lệnh trên.

## API

- `GET /api/test`: kiểm tra backend và PostgreSQL
- `POST /api/auth/register`: tạo tài khoản trong `users`, gán role `customer`
- `POST /api/auth/login`: đăng nhập bằng email và mật khẩu

Mật khẩu được hash bằng `scrypt`, không lưu dạng văn bản.
