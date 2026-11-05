# HUBACCOUNTS — NHẬT KÝ LƯU TRỮ VÀ TIẾN ĐỘ DỰ ÁN

> **Thời điểm cập nhật:** 07/10/2026
> **Thư mục làm việc:** `D:\Source\HubAcc\devic3-app-main\devic3-app-main`
> **Trạng thái hệ thống:** Ổn định 100% — Tất cả tính năng đã kiểm tra thực tế và sẵn sàng tiếp tục.

---

## 0a3. CẬP NHẬT 04/11/2026 — SỬA 3 LỖI NHỎ KHI NHẬP

- Kiểm tra trùng không phân biệt chữ hoa/thường và khoảng trắng (`duplicateKey`, `js/account-modal.js`); link vẫn so chính xác phần đường dẫn.
- Ngày phải là ngày có thật (`parseStrictDate`, `js/core.js`): 31/02 hay "abc" bị từ chối với thông báo (thủ công và hàng loạt, nêu số dòng); ngày hợp lệ lưu dạng dd/mm/yyyy.
- Link mới phải có tên miền thật (có dấu chấm, localhost hoặc IP) — `normalizeNewHttpLink` (`js/home-log.js`); link cũ đã lưu vẫn hiển thị như trước.
- Proxy: mật khẩu chứa `:` được giữ nguyên khi nhập hàng loạt và khôi phục backup (`splitProxyLine`). Cache SW `v42`.

## 0a2. CẬP NHẬT 04/11/2026 — SỬA LỖI TRƯỜNG NHẬP BỊ XÁO / BỊ XOÁ

- `smartCorrectFacebookFields` (`js/import-parse.js`) chỉ chuyển giá trị có hình dạng chắc chắn (cookie, token EAA, 2FA, email) đang nằm sai ô; không còn xáo SĐT/mật khẩu mỗi lần mở khoá. Ô Pass Email chỉ bị coi là sai khi chứa cookie/token.
- Ghi đè tài khoản trùng (thủ công và hàng loạt, `js/account-modal.js`) chỉ thay các trường có giá trị, giữ nguyên 2FA/cookie/email khôi phục/SĐT cũ. Cache SW `v41`.

## 0a. CẬP NHẬT 03/11/2026 — SỬA LỖI MẤT TÀI KHOẢN KHI MỞ NHIỀU TAB

- Lỗi: mỗi tab ghi đè toàn bộ danh sách, nên tab lưu sau xoá âm thầm tài khoản tab khác vừa lưu (kể cả bản cũ `D3vic3.html` cùng tên miền).
- Sửa (`js/core.js`): trước khi ghi, so với bản đã đọc; nếu khác thì gộp 3 chiều theo `id` (`mergeListsById`), khoá ghi qua Web Locks, báo cho tab khác qua BroadcastChannel, tự làm mới khi quay lại tab. Lỗi lưu luôn hiện thông báo. Cache SW `v40`. Có test trong `test/app-files.test.js`.

## 0. CẬP NHẬT 11/10/2026 — ĐỔI TÊN & THIẾT KẾ LẠI GIAO DIỆN

- Đổi tên ứng dụng **Devic3 → HubAccounts**: `HubAccounts.html`, `hubaccounts.css`, manifest, service worker (`hubaccounts-cache-v36`), `server.js` (`createHubAccountsServer`, endpoint `/hubaccounts-*` + alias cũ `/devic3-*`), `package.json`, `start-desktop.bat`, README.
- `D3vic3.html` (trang chuyển hướng cho bản cũ) và alias API `/devic3-*` đã được gỡ bỏ (12/10/2026) khi chuyển sang repo mới. Khoá lưu trữ, file Drive và định dạng backup giữ định danh `devic3*` để không mất dữ liệu (xem README → "Đổi tên ứng dụng").
- Giao diện thiết kế lại theo phong cách iPadOS/iOS (chỉ lớp trình bày): sidebar bo tròn với icon dạng squircle, tiêu đề lớn, nút/ô nhập dạng fill, segmented control, thẻ nhóm, modal dạng sheet, toast dạng pill, switch iOS; bỏ hiệu ứng "shine" chạy liên tục để giảm tải CPU/GPU.

## 0b. CẬP NHẬT 11/10/2026 — RÀ SOÁT & SỬA LỖI

- Bảo mật: Face ID/Windows Hello dùng WebAuthn PRF (không còn lưu khoá kho dạng thô; cấu hình cũ tự gỡ); AI Check không gửi mật khẩu thường; máy chủ cục bộ chỉ nhận yêu cầu từ app và origin được phép (chặn CORS `*`, chặn DNS rebinding).
- Logic kiểm tra: kết quả không chắc chắn → giữ nguyên trạng thái + báo lý do; Gmail chỉ kiểm tra định dạng; Hotmail không đoán khi thiếu máy chủ; Facebook không tính lỗi mạng là die; AI Check không ghi đè ô Ghi chú.
- Dọn dẹp: bỏ hàm/khoá dịch/CSS không dùng, gộp nút Khoá và đoạn tạo kho bị lặp, gộp 2 nút mở file kho, thêm `viewport-fit=cover` + safe-area, cảnh báo xuất .txt không mã hoá. `backup_devic3_latest.zip` chuyển ra `D:\Source\HubAcc\`.
- Gỡ bỏ hoàn toàn tính năng "Đăng nhập PC" / Login Helper (thiếu tiện ích, không dùng được).
- Dọn source 12/10/2026: gỡ file/đoạn tương thích cũ, gom hàm dùng chung vào `core.js`/`shell.js`, gộp CSS bị ghi đè (giao diện không đổi, đã đo kiểm).
- Cấu trúc: mã nguồn tách thành 16 file trong `js/`; thêm kiểm thử `npm test` (thư mục `test/`).

## 1. TỔNG HỢP TOÀN BỘ CÔNG VIỆC ĐÃ HOÀN THÀNH

### A. Giao diện (UI/UX) & Cấu trúc
- **Tách riêng CSS:** Tách toàn bộ giao diện thành `hubaccounts.css` , code HTML/JS trong `HubAccounts.html` sạch sẽ, chuẩn cấu trúc.
- **Nút Chuyển đổi Dark/Light Mode:** Nằm ngay cạnh nút ngôn ngữ `VN / EN` trên header thanh điều hướng (đã xóa nút đổi theme trong tab Công cụ như yêu cầu).
- **Thứ tự Tab tài khoản:**
  1. Facebook
  2. Gmail
  3. Hotmail
  4. **AI (Đã chuyển xuống dưới Hotmail và trên TikTok)**
  5. TikTok
  6. Steam
  7. Tiền tệ (Money)
- **Tối ưu Mobile & PWA (iPhone / iPad):** Hỗ trợ `manifest.json`, icon 192/512, viewport `viewport-fit=cover`, safe-area cho Dynamic Island / thanh điều hướng iOS (bổ sung thực tế 11/10/2026), Service Worker nạp cache offline `v36`.

### B. Tính năng nâng cao
1. **Quản lý Hotmail & Gmail:**
   - **Tính năng "Đăng nhập PC" (tiện ích Login Helper) đã được gỡ bỏ hoàn toàn** cho cả Hotmail và Gmail (11/10/2026).
   - **Nút [Kiểm tra] trạng thái Hotmail:** Sử dụng API xác thực Live Microsoft (`login.live.com/GetCredentialType.srf`), bóc tách token phiên `PPFT` & `correlationId`. Phân biệt chuẩn xác giữa tài khoản còn sống (Active - Xanh) và tài khoản không tồn tại/bị xóa (Inactive - Đỏ).
   - **Nút [Kiểm tra] trạng thái Gmail:** Kiểm tra định dạng cấu trúc tài khoản Google và endpoint xác thực.
2. **Quản lý Facebook:**
   - **Nút [Kiểm tra] trạng thái Live / Checkpoint / Die:** Tự động phát hiện Access Token (`EAA...`) hoặc UID người dùng (từ link profile, UID, cookie `c_user`).
   - Tích hợp kiểm tra qua Graph Avatar API kèm bộ lọc phát hiện chuyển hướng avatar mặc định silhouette (`static.xx.fbcdn.net`) để nhận diện chính xác acc bị checkpoint / die.
3. **Quản lý Tab AI:**
   - **Trình kiểm tra hạn mức API / Token Quota Checker:** Nút `[Kiểm tra]` / `[Check Key]` xuất hiện trực tiếp trên từng thẻ tài khoản AI.
   - Tự động nhận diện token OpenAI (`sk-...`), Anthropic (`sk-ant-...`), Google Gemini (`AIzaSy...`) và test trạng thái API.
4. **Proxy Tester:**
   - Đo độ trễ (latency ping) và kiểm tra IP xuất ra thực tế của Proxy trong tab Công cụ.
5. **Command Palette & Auto-fill Assistant:**
   - Phím tắt `Ctrl + K` (hoặc `Cmd + K` trên Mac/iOS) mở bảng tìm kiếm và sao chép nhanh 1 chạm cho mọi tài khoản.

---

## 2. KIẾN TRÚC MÁY CHỦ & FILE NGUỒN

| File | Vai trò | Trạng thái |
|---|---|---|
| `HubAccounts.html` | Ứng dụng chính (Giao diện web, logic IndexedDB, mã hóa AES-256-GCM) | Hoàn thiện |
| `hubaccounts.css` | Hệ thống stylesheet riêng biệt, theme Dark/Light | Hoàn thiện |
| `server.js` | Server backend Node.js cục bộ (Port 8765): kiểm tra Hotmail, Gmail, Facebook, Proxy, AI | Đang chạy nền |
| `sw.js` | Service Worker cache offline (phiên bản `hubaccounts-cache-v36`) | Hoàn thiện |
| `start-desktop.bat` | File chạy 1-click khởi động server cục bộ và tự mở trình duyệt | Sẵn sàng |

---

## 3. HƯỚNG DẪN KHI MỞ MÁY LẦN SAU ĐỂ LÀM TIẾP

1. **Khởi động ứng dụng trên máy tính:**
   - Chỉ cần click đúp vào file `start-desktop.bat` tại thư mục này.
   - Cửa sổ dòng lệnh sẽ chạy máy chủ Node.js tại `http://127.0.0.1:8765` và tự động mở trình duyệt.
2. **Sử dụng trên điện thoại (iPhone/iPad):**
   - Đảm bảo điện thoại cùng mạng Wi-Fi hoặc dùng trang GitHub Pages (`https://imin1x.github.io/devic3-app/HubAccounts.html`).
   - Dữ liệu luôn được sao lưu / nạp bằng tệp JSON mã hóa riêng tư.
3. **Khi cần làm tiếp tính năng mới:**
   - Yêu cầu trực tiếp với tôi — toàn bộ ngữ cảnh, kiến trúc file và tiến độ đã được khóa an toàn trong tệp này.
