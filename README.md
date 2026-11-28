# Kho Tươi: frontend giám sát và điều khiển kho lạnh

Frontend của đồ án đa ngành (hướng Hệ thống thông tin): ứng dụng web giám sát phòng bảo quản thực phẩm tươi sống và điều khiển thiết bị IoT (quạt, máy nén) qua backend FastAPI và Adafruit IO.

## Chức năng

- Danh sách phòng kho; chọn phòng để xem chi tiết.
- Nhiệt độ, độ ẩm mới nhất và biểu đồ diễn biến, kèm giới hạn nếu backend trả về.
- Cảnh báo đang mở của phòng, lấy từ backend. Frontend không tự tính cảnh báo.
- Bật, tắt quạt và máy nén. Lệnh cần xác nhận trước khi gửi; trạng thái trên màn hình chỉ đổi khi backend báo thiết bị đã đổi, quá 15 giây không có xác nhận thì báo lỗi.
- Trạng thái thiết bị được cập nhật mỗi 5 giây, nên thay đổi từ Adafruit hoặc từ bo mạch cũng hiện lên ứng dụng.
- Báo khi số đo đã cũ (2 phút không có bản ghi mới) hoặc khi mất kết nối tới backend.
- Giao diện đăng nhập (chưa nối xác thực).

Luồng demo giữa kỳ: bật/tắt thiết bị → trạng thái đổi trên Adafruit IO → trạng thái đổi trên ứng dụng, và chiều ngược lại từ ứng dụng.

## Công nghệ

React 18, Material UI 5, Vite 4.

## Chạy

```bash
npm install
npm run dev
```

Mở `http://localhost:5173` (trang giám sát) hoặc `/login` (đăng nhập).

Không cấu hình gì thì ứng dụng chạy bằng **dữ liệu mẫu** trong `src/data/sampleData.js`. Ở chế độ này các nút điều khiển bị khóa vì không có thiết bị thật.

Để nối backend, chạy backend trước (xem README của repo backend, kiểm tra `http://127.0.0.1:8000/docs`), rồi tạo file `.env.local` theo `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEV_USER_ID=1
VITE_WS_URL=ws://localhost:8000/api/ws/storage-rooms/{room_id}
```

Khởi động lại `npm run dev` sau khi sửa `.env.local`, và mở đúng `http://localhost:5173` (địa chỉ có trong `CORS_ORIGINS` của backend).

## Cấu trúc

```
src/
  App.jsx                       trang giám sát và điều khiển
  pages/LoginPage.jsx           trang đăng nhập
  components/ReadingChart.jsx   biểu đồ số đo
  hooks/useStorageDashboard.js  tải và cập nhật dữ liệu phòng, thiết bị, cảnh báo
  services/storageApi.js        gọi API phòng, thiết bị, cảnh báo, lệnh điều khiển
  services/roomApi.js           gọi API số đo
  data/sampleData.js            dữ liệu mẫu
```

## Tích hợp với backend

| Chức năng | Endpoint backend | Trạng thái |
| --- | --- | --- |
| Danh sách phòng | `GET /api/storage-rooms` | Đã nối |
| Số đo 24 giờ, ngưỡng | `GET /api/storage-rooms/{id}/readings` | Đã nối; ngưỡng lấy từ `nguong` của cảm biến |
| Thiết bị của phòng | `GET /api/storage-rooms/{id}/devices` | Đã nối; chưa có trạng thái bật/tắt (`powerState` là "Chưa rõ") |
| Số đo thời gian thực | `WS /api/ws/storage-rooms/{id}?user_id=` | Đã nối; sự kiện `telemetry.created` |
| Cảnh báo, lệnh điều khiển | `/alerts`, `/devices/{id}/commands` | Backend chưa có, hiện trả 404 |

Xác thực hiện là tạm thời: header `X-User-Id` và `?user_id=` lấy từ `VITE_DEV_USER_ID` (`src/services/devAuth.js`). Khi backend có JWT, thay file này bằng header `Authorization: Bearer`.

Tên trường được chuẩn hóa trong các hàm `normalize...` của `src/services/`. Câu trả lời của backend cho các câu hỏi bàn giao nằm cuối [`BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md).

## Chưa làm

Xác thực và phân quyền; xử lý cảnh báo; lịch trình; cấu hình ngưỡng và kịch bản; người dùng; nhật ký; báo cáo.
