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
