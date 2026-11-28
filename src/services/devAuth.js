// TẠM THỜI: backend chưa có đăng nhập (nhiệm vụ 6), nên mỗi yêu cầu khai mã người dùng
// qua header X-User-Id (REST) và ?user_id= (WebSocket). Xóa file này khi có JWT.
export const devUserId = import.meta.env?.VITE_DEV_USER_ID ?? ''

export function authHeaders() {
  return devUserId ? { 'X-User-Id': devUserId } : {}
}
