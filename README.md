# Kho Tươi — frontend React + MUI

Frontend cho ứng dụng quản lý thiết bị trong phòng bảo quản thực phẩm tươi sống. Dự án có danh sách phòng, số đo nhiệt độ và độ ẩm, cảnh báo, danh sách thiết bị điều khiển và trang đăng nhập. Mã giao diện được tách thành `components`, `pages`, `hooks`, `services`, `data` theo cách tổ chức React/MUI tham khảo từ dự án Trello.

## Chạy dự án

```powershell
cd D:\FreshFoodStorageFrontend
npm install
npm run dev
```

- `/`: giao diện theo dõi phòng kho.
- `/login`: giao diện đăng nhập.

Chạy `npm run build` để kiểm tra bản build. Khi chưa có cấu hình backend, trang tổng quan dùng dữ liệu mẫu trong `src/data/sampleData.js` để nhóm xem và hoàn thiện UI. Dữ liệu mẫu **không phải số đo từ thiết bị thật**.

Để xem cảnh báo, mở trang `/`: phòng rau củ `P-02` được chọn sẵn và có một cảnh báo nhiệt độ. Chọn phòng hải sản `P-03` để xem cảnh báo độ ẩm. Các cảnh báo này là bản ghi mẫu trong `src/data/sampleData.js`, không phải kết quả frontend tự tính từ ngưỡng. Khi dùng API, chỉ danh sách cảnh báo do backend trả về mới tạo cảnh báo đỏ trên giao diện.

Phần "Thiết bị điều khiển" có quạt và máy nén cùng nút Bật/Tắt. Trong chế độ dữ liệu mẫu, nút bị khóa vì không có thiết bị thật. Khi nối API, người dùng xác nhận lệnh, giao diện gửi lệnh tới backend rồi chờ trạng thái thiết bị được backend xác nhận; không đổi trạng thái nút theo suy đoán. Video thiết bị thật vẫn cần backend, Adafruit IO và phần cứng hoạt động.

## Hợp đồng API cần thống nhất với backend

Tài liệu backend xác nhận đường dẫn `GET /storage-rooms/{roomId}/readings`, luồng WebSocket, command-service và rule engine. Tài liệu **chưa chốt URL hoặc schema** của API danh sách phòng, thiết bị, cảnh báo và lệnh điều khiển. Các đường dẫn dưới đây trong `src/services/storageApi.js` là **đề xuất để bàn giao**, cần sửa theo OpenAPI thật trước khi quay video thiết bị:

| Mục đích | Đường dẫn đang đặt trong adapter | Dữ liệu frontend cần |
| --- | --- | --- |
| Danh sách phòng | `GET /storage-rooms` | `id`, `name`, `warehouse`, `product`, giới hạn nhiệt độ/độ ẩm nếu có |
| Thiết bị của phòng | `GET /storage-rooms/{roomId}/devices` | `id`, `name`, `kind`, `online`, `powerState`, `controllable` |
| Cảnh báo đang mở | `GET /storage-rooms/{roomId}/alerts?status=open` | `id`, `message`, `status`, `severity` |
| Điều khiển | `POST /devices/{deviceId}/commands` với `{ "command": "TURN_ON" }` hoặc `TURN_OFF` | Chấp nhận/từ chối lệnh; trạng thái thực được xác nhận qua API thiết bị hoặc WebSocket |
| Số đo | `GET /storage-rooms/{roomId}/readings` | Bản ghi cảm biến theo phòng, có thời gian, giá trị, đơn vị, thiết bị |

`src/hooks/useStorageDashboard.js` lấy lịch sử lần đầu, nhận số đo mới qua WebSocket nếu được cấu hình. Khi WebSocket chưa mở, hook kiểm tra số đo mỗi 60 giây với `?start=<thời gian bản ghi cuối>` rồi gộp theo ID. Backend cần xác nhận bộ lọc `start` của endpoint phòng; nếu không hỗ trợ thì sửa adapter theo API truy vấn tăng dần thực tế. Danh sách thiết bị được hỏi lại mỗi 5 giây kể cả khi WebSocket đang mở, để thấy thay đổi từ Adafruit hoặc bo mạch; request chồng nhau được gộp, và bộ đếm dừng khi đổi phòng. Cảnh báo được tải riêng mỗi 30 giây. Màn hình đánh dấu số đo cũ sau 2 phút không có bản ghi mới và báo lỗi khi API số đo không truy cập được. Mốc 2 phút là quy tắc hiển thị của frontend, không thay cho rule mất tín hiệu của backend.

Tệp `BACKEND_HANDOFF.md` là danh sách thông tin backend cần xác nhận trước khi nối thiết bị thật và quay video giữa kỳ.

Ngưỡng **không lấy từ `.env`**. Giới hạn chỉ hiển thị nếu API danh sách phòng trả về; frontend không dùng giới hạn để tạo cảnh báo. Nếu API cảnh báo lỗi, màn hình báo rằng trạng thái an toàn chưa xác định.

`.env.example` chỉ giữ URL API và WebSocket. Sao chép thành `.env.local` khi đã có API thật. Không đặt mật khẩu hay API key Adafruit vào biến `VITE_` vì chúng được đưa vào mã chạy trên trình duyệt.

Trang đăng nhập mới có UI; **chưa có xác thực và chưa chặn truy cập trang tổng quan**. Backend cần cung cấp endpoint, định dạng request/response, phiên và phân quyền. Lệnh điều khiển phải được backend kiểm tra quyền, ca làm và trạng thái thiết bị theo command-service.

### Dữ liệu số đo mà adapter đang chấp nhận

API có thể trả mảng trực tiếp hoặc mảng trong `data`, `readings`, `items`, `results`. Adapter nhận các tên trường sau:

| Ý nghĩa | Tên trường |
| --- | --- |
| Giá trị số | `value`, `gia_tri`, `thong_so`, `gia_tri_thong_so` |
| Thời gian ISO 8601 | `recordedAt`, `thoi_gian_ghi`, `timestamp`, `created_at` |
| Mã thiết bị | `deviceId`, `device_id`, `ma_thiet_bi` |
| Tên thiết bị | `deviceName`, `ten_thiet_bi` |
| Đơn vị | `unit`, `don_vi_do` |
| Loại số đo | `kind`, `metric`, `sensorType`, `loai_cam_bien`, `ten_thong_so`; hoặc nhận biết độ ẩm từ tên thiết bị/đơn vị `%` |

Nếu OpenAPI thực tế khác, chỉnh các hàm chuẩn hóa trong `src/services/roomApi.js` và `src/services/storageApi.js`. Biểu đồ chọn cảm biến có bản ghi mới nhất cho mỗi loại số đo.

## Phạm vi còn chờ backend

Tích hợp API thật, xác nhận lệnh trên phần cứng, xử lý cảnh báo, lịch trình, cấu hình rule, người dùng và phân quyền, nhật ký, báo cáo và xuất file. Các nút điều khiển trong chế độ dữ liệu mẫu không gửi lệnh giả.

## Ghi chú UI/UX

Trên điện thoại, bản ghi hiển thị dạng thẻ thay cho bảng bị ép cột. Biểu đồ cuộn ngang bên trong thẻ để giữ chữ đọc được. Cảnh báo nghiệp vụ chỉ có một vùng màu đỏ ở đầu nội dung phòng; số đo thường dùng màu chữ trung tính. Từ Trello, dự án tham khảo cách dùng Vite/React, MUI theme và tách thành phần; giao diện kho được thiết kế riêng.
