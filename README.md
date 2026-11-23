# IC Study

Mã nguồn và tài liệu học được sao lưu từ folder `New folder`.

- Web đang hoạt động: https://icstudy.dpdns.org
- `IC_Study_Anime.html`: bản học offline Anime.
- `ic-study-online/`: mã nguồn bản web, đăng nhập, quản trị và đồng bộ tiến độ.
- `COS201/`, `DGT302/`, `ICI211/`, `LOS201/`: tài liệu và ảnh câu hỏi theo môn.
- `data/`, `scripts/`, `src/`, `anime/`: dữ liệu biên soạn, công cụ và tài nguyên giao diện.

## Chạy bản web

Trong `ic-study-online/`, chạy `npm ci` rồi `npm run build` và `npm test`.
Xem thêm hướng dẫn trong thư mục dự án. Thông tin đăng nhập ban đầu và các biến môi trường riêng phải được cấu hình riêng.

## Phạm vi sao lưu

Kho lưu bản chụp nội dung hiện tại. Tệp mật khẩu admin, cơ sở dữ liệu và tiến độ cục bộ, thông tin đăng nhập, thư mục kiểm tra, dependency tải lại được, bản staging và các gói triển khai cũ được loại khỏi bản GitHub. Các tệp gốc trên máy vẫn được giữ nguyên.

Việc đưa mã lên kho này không thay đổi máy chủ hoặc dữ liệu tài khoản của web đang chạy.
