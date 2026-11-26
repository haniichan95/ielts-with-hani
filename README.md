# IELTS with Hani

Trang web tĩnh luyện thi IELTS (Listening, Reading, Writing AI, Speaking, Từ vựng) với giao diện thân thiện, tự động lưu dữ liệu trên trình duyệt (`localStorage`) và hỗ trợ đồng bộ đa thiết bị qua **Supabase**.

## Điểm nổi bật của phần Writing AI
- **Khung Criteria cố định (Task 1 & Task 2 riêng biệt)**: Tích hợp sẵn bộ tiêu chí chuẩn IELTS (`TA/TR`, `CC`, `LR`, `GRA`), có thể tick bật/tắt hoặc thêm tiêu chí mới.
- **Quản lý Feedback cố định của giáo viên**: Lưu danh sách lỗi/nhận xét từ giáo viên (có mức độ ưu tiên, nhóm tiêu chí, phạm vi Task 1/2, ví dụ sửa và nhập nhanh nhiều dòng).
- **Chấm bài bằng Google Gemini API**: Trả về band tổng quan, nhận xét 4 tiêu chí, **bảng đối chiếu từng feedback của giáo viên (Đã khắc phục / Cần cải thiện / Còn tái phạm)**, danh sách lỗi chi tiết, bài sửa lỗi, bài nâng band mục tiêu và gợi ý từ vựng để lưu thẳng sang tab Từ vựng.
- **Portfolio bài đã chấm**: Xem lại toàn bộ kết quả chấm cũ bất cứ lúc nào.

## Cấu trúc thư mục
- `index.html`: Giao diện chính
- `styles.css`: Giao diện pastel & hỗ trợ Dark Mode
- `data.js`: Bộ criteria cố định mặc định, dữ liệu mẫu & bảng câu hỏi/lỗi sai
- `storage.js`: Lưu `localStorage`, xuất/nhập JSON và đồng bộ REST API với Supabase
- `writing-ai.js`: Quản lý Criteria cố định, Feedback giáo viên và gọi Gemini API
- `app.js`: Logic Tổng quan, Mục tiêu, Luyện đề, Speaking và Từ vựng
- `supabase-schema.sql`: Script SQL tạo bảng `hani_profiles` trên Supabase

## Cách chạy & Triển khai (Deploy)

### 1. Chạy trực tiếp hoặc trên máy local
- Có thể mở thẳng file `index.html` bằng trình duyệt (Chrome / Edge / Safari), hoặc chạy server tĩnh:
  ```bash
  npx serve .
  ```

### 2. Deploy miễn phí lên GitHub Pages hoặc Vercel
- **GitHub Pages**:
  1. Push toàn bộ thư mục này lên một repository GitHub.
  2. Vào **Settings → Pages → Build and deployment → Deploy from a branch** (`main` / root).
- **Vercel / Netlify**:
  1. Kết nối repo hoặc kéo thả thư mục vào Vercel / Netlify (Static site, không cần bước build).

### 3. Bật đồng bộ Cloud đa thiết bị với Supabase (tùy chọn)
1. Tạo project miễn phí tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor** và chạy nội dung trong file `supabase-schema.sql`.
3. Vào **Project Settings → API** lấy **Project URL** và **anon public key**.
4. Mở trang web → bấm nút trạng thái **Lưu trên máy (Local)** ở góc phải trên → nhập URL, Anon Key và một **Mã đồng bộ (Sync ID)** bí mật dùng chung trên mọi thiết bị.
