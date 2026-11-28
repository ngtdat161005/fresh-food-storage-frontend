# Thông tin backend cần bàn giao cho frontend

Mục tiêu giữa kỳ: đổi trạng thái quạt hoặc máy nén trên thiết bị/Adafruit → backend cập nhật → frontend hiển thị trạng thái mới; và gửi lệnh từ frontend → backend/thiết bị xác nhận → frontend mới báo hoàn tất.

Các đường dẫn đang đặt trong `src/services/storageApi.js` chỉ là **đề xuất**, chưa được xác nhận bởi OpenAPI. Nhóm backend vui lòng gửi URL Swagger/OpenAPI hoặc bảng endpoint kèm JSON request/response mẫu cho các mục sau:

| Cần xác nhận | Câu trả lời cần có |
| --- | --- |
| Danh sách phòng | URL, phương thức, cấu trúc danh sách, mã phòng; giới hạn nhiệt độ/độ ẩm có được trả về không |
| Thiết bị của phòng | URL, phương thức; mã, tên, loại, `online` và trạng thái **bật/tắt thực tế** của từng quạt/máy nén |
| Lệnh điều khiển | URL, phương thức, body bật/tắt, phản hồi khi chấp nhận/từ chối; thời gian chờ xác nhận |
| Cập nhật trạng thái sau lệnh | Frontend đọc lại trạng thái qua API thiết bị hay nhận sự kiện WebSocket? Tên trường, giá trị hợp lệ và thời điểm backend cập nhật |
| Cảnh báo đang mở | URL, phương thức, ID, nội dung, trạng thái và mức độ cảnh báo |
| Xác thực và phân quyền | Cookie session hay Bearer token; API đăng nhập nếu cần, CORS/credentials, tài khoản và ca làm hợp lệ để thử lệnh |

**Điểm cần phân biệt:** `online`/`trang_thai_hoat_dong` cho biết thiết bị còn kết nối hay không; trạng thái `on/off` cho biết quạt hoặc máy nén đang bật hay tắt. Nếu backend chỉ trả trạng thái kết nối, frontend không thể xác nhận lệnh đã tác động lên thiết bị. Phản hồi “đã nhận lệnh” cũng chưa phải xác nhận thiết bị đã đổi trạng thái.

Frontend hiện hỏi lại danh sách thiết bị mỗi 5 giây dù có WebSocket. Để kiểm tra luồng đầu tiên, hãy đổi quạt trên Adafruit hoặc bo mạch và xác nhận API thiết bị đổi `powerState` trong thời gian mong đợi. Để kiểm tra chiều ngược lại, gửi lệnh từ frontend và xác nhận thiết bị thật đổi trạng thái, sau đó API trả trạng thái mới. Cần dùng tài khoản/quyền/ca làm hợp lệ nếu command-service có kiểm tra.

Khi có hợp đồng API thật, frontend sẽ sửa adapter, nối đăng nhập nếu cần, rồi thử lại cả hai chiều trên phần cứng. Không đặt token hoặc khóa Adafruit trong biến `VITE_`.

## Trả lời từ backend (28/11/2026)

Chi tiết và JSON mẫu: README của repo backend, mục endpoint; Swagger tại `http://127.0.0.1:8000/docs`. Mọi route có tiền tố `/api`.

| Câu hỏi | Trả lời |
| --- | --- |
| Danh sách phòng | `GET /api/storage-rooms` trả mảng `{ma_phong_kho, ten_phong_kho, ma_nha_kho, ten_nha_kho, so_luong_thiet_bi, so_luong_thiet_bi_dang_hoat_dong}`. Không có giới hạn nhiệt độ/độ ẩm ở đây. |
| Ngưỡng | Theo từng cảm biến, trong `GET /api/storage-rooms/{id}/readings` → `thiet_bi[].nguong[]` (`gioi_han_duoi`, `gioi_han_tren`). Số đo trong `thiet_bi[].ban_ghi[]`, 24 giờ gần nhất, thời gian UTC. |
| Thiết bị của phòng | `GET /api/storage-rooms/{id}/devices` trả `{ma_thiet_bi, ten_thiet_bi, ten_phan_loai, don_vi_do, trang_thai_hoat_dong}`. `don_vi_do` khác null là cảm biến, null là thiết bị điều khiển. `trang_thai_hoat_dong` (`HOAT_DONG`, `MAT_KET_NOI`, `NGUNG_SU_DUNG`) là trạng thái kết nối, **chưa có** trạng thái bật/tắt. |
| Lệnh điều khiển, trạng thái sau lệnh | Chưa có (nhiệm vụ 10). Hướng dự kiến: backend gửi lệnh qua Adafruit, thiết bị phản hồi qua feed `phan-hoi`, backend cập nhật trạng thái bật/tắt và phát sự kiện WebSocket. |
| Cảnh báo đang mở | Chưa có endpoint. |
| Thời gian thực | `WS /api/ws/storage-rooms/{id}?user_id=`, mỗi điểm mới gửi `{"event": "telemetry.created", "data": {ma_thiet_bi, feed_key, gia_tri_thong_so, thoi_gian_ghi}}`. |
| Xác thực | Tạm thời: header `X-User-Id` (REST), `?user_id=` (WebSocket); không dùng cookie. Sẽ thay bằng JWT `Authorization: Bearer` (nhiệm vụ 6). CORS cho phép `http://localhost:5173`. |
