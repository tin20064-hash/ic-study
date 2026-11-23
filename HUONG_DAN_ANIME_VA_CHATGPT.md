Mở file **OnTap_4Mon_Anime.html** bằng Chrome hoặc Edge. Đây là bản song song; **OnTap_4Mon.html** được giữ nguyên.

Trong bản mới, chọn **Góc học của bạn** ở góc trên bên phải để đổi bảng màu Sakura, Lavender hoặc Milk Tea, chọn ảnh nền từ máy và điều chỉnh độ hiện nền. Ảnh được xử lý trong trình duyệt và lưu trên thiết bị. Toàn bộ 959 câu hỏi và lựa chọn đều hiển thị bằng văn bản có thể bôi đen, sao chép và dịch. Cỡ chữ câu hỏi/đáp án được tăng nhẹ và đậm hơn; nút Đối chiếu ảnh gốc vẫn có để kiểm tra công thức khi cần. Các chức năng học/thi được giữ nguyên.

Tiến độ của Anime Edition lưu riêng. Khi dùng cùng nguồn lưu trữ, lần đầu mở có thể đọc tiến độ từ bản cũ mà không ghi đè bản cũ. Nếu trình duyệt tách dữ liệu từng file HTML, hãy **Xuất bản sao tiến độ** từ bản cũ rồi **Khôi phục tiến độ** ở bản mới.

**Đổi giao diện ChatGPT web hoặc ứng dụng ChatGPT Windows**

1. Chọn ảnh đại diện → **Settings** → **General**.
2. Ở **Appearance**, chọn **Light** để có nền sáng hoặc **Dark** để có nền tối.
3. Ở **Accent color**, chọn **Pink** hoặc **Purple** nếu có.

Các tùy chọn có thể khác theo nền tảng, phiên bản và tài khoản. Hướng dẫn chính thức: [Updating your visual experience on ChatGPT](https://help.openai.com/en/articles/11958281-updating-your-visual-experience-on-chatgpt).

**Nếu bạn đang nói tới cửa sổ Codex/ChatGPT desktop dùng để làm việc ở đây**

Mở **Settings** bằng **Ctrl+,** → **Appearance**. Bạn có thể chỉnh theme, màu accent, màu background, màu chữ và font tùy phiên bản. Thử nền hồng rất nhạt **#FFF7FB**, accent hồng **#B54D78**, chữ **#49384D**. Đây là các màu tôi gợi ý để gần với file ôn tập mới.

Tài liệu chính thức: [ChatGPT desktop app settings — Appearance](https://learn.chatgpt.com/docs/app/settings#appearance).

**Muốn đặt ảnh anime làm nền ChatGPT trên trình duyệt**

Tài liệu OpenAI ở trên mô tả theme và màu giao diện; chưa xác lập tính năng tải ảnh nền riêng. Có thể dùng tiện ích **Stylus** để áp dụng CSS cá nhân cho bản web. Bản desktop sử dụng các tùy chọn giao diện sẵn có của ứng dụng.

1. Cài **Stylus** của dự án **openstyles** từ [Chrome Web Store](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne). Tiện ích hỗ trợ Chrome và các trình duyệt Chromium như Edge.
2. Mở trình quản lý Stylus bằng **Manage**. Chọn **Write new style** và bật **UserCSS** cho kiểu mới nếu chưa bật.
3. Mở file **ChatGPT_Anime_Pastel.user.css** trong VS Code hoặc Notepad, nhấn **Ctrl+A**, **Ctrl+C**.
4. Dán toàn bộ vào trình soạn thảo UserCSS của Stylus, đặt tên **ChatGPT Sakura Pastel**, rồi **Save**.
5. Mở **chatgpt.com**, chọn Appearance **Light**, tải lại trang. Style đã giới hạn ở tên miền chatgpt.com và có ảnh nhúng, không cần tải ảnh từ máy chủ khác.
6. Muốn quay về giao diện trước đó, mở Stylus và tắt style **ChatGPT Sakura Pastel**.

File CSS là mẫu tùy chỉnh, đã được kiểm tra cú pháp cơ bản nhưng chưa kiểm thử trên phiên đăng nhập ChatGPT của bạn; có thể cần cập nhật selector nếu ChatGPT thay đổi giao diện. Tôi chưa cài tiện ích hay thay đổi giao diện tài khoản của bạn.

Tài liệu Stylus: [Dự án openstyles/stylus](https://github.com/openstyles/stylus), [Writing UserCSS](https://github.com/openstyles/stylus/wiki/Writing-UserCSS).

Ảnh anime của bản ôn tập mới được tạo bằng ImageGen, theo brief: **nhân vật nữ anime tai mèo, tóc tím sẫm, áo hồng, ngồi học trong căn phòng sáng; màu hồng sakura, kem và tím nhạt; bố cục ngang có chỗ cho tiêu đề; không chữ và không neon**. Asset nằm tại **anime/assets/sakura-study.png**.
