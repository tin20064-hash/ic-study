# COS201 — Tổng ôn keyword

Đọc dòng keyword, tự trả lời câu ví dụ rồi xem đáp án. Mã `#845` tương ứng với câu `COS201-845` trên IC Study. Các ví dụ có số lấy từ slide hoặc được đặt theo dạng câu trong ngân hàng.

## Chương 1 · Hệ thống truyền thông

**Physical layer → Điều chế, mã hóa dạng sóng và truyền qua kênh vật lý.**  
**Ví dụ** Trong mô hình OSI, tầng nào đưa tín hiệu lên cáp hoặc sóng vô tuyến?  
**Đáp án** Tầng vật lý, tầng 1 trong 7 tầng OSI. `#856, #886`

**Carrier phase / symbol timing recovery → Máy thu.**  
**Ví dụ** Khối nào khôi phục thời điểm lấy mẫu từ tín hiệu đã nhận?  
**Đáp án** Máy thu. `#864`

**Channel impairment → Suy hao, fading, méo hoặc nhiễu.**  
**Ví dụ** Công suất tín hiệu giảm dần khi đi xa anten phát là hiện tượng gì?  
**Đáp án** Propagation loss, tức suy hao truyền sóng. `#854`

**Regeneration → Quyết định lại bit và tái tạo xung.**  
**Ví dụ** Vì sao bộ lặp số hạn chế tích lũy nhiễu analog qua nhiều chặng?  
**Đáp án** Nó quyết định lại bit rồi phát xung mới. Bit đã quyết định sai vẫn có thể đi tiếp. `#804`

## Chương 2 · Tín hiệu và hệ thống

**Periodic signal → Phổ vạch. Cosine tần số f꜀ → Hai vạch tại ±f꜀.**  
**Ví dụ** Phổ của cos(2π × 1000t) có các vạch ở đâu?  
**Đáp án** −1 kHz và +1 kHz. `#859, #862`

**Time delay → Đổi pha. Time compression → Phổ giãn.**  
**Ví dụ** Trễ g(t) đi t₀ giây thì phổ G(f) nhân với gì?  
**Đáp án** exp(−j2πft₀). Biên độ phổ giữ nguyên. `#846, #878`

**LTI → Đáp ứng xung h(t). Causal → h(t) bằng 0 trước t = 0.**  
**Ví dụ** Nếu h(t) khác 0 ở t = −1 thì hệ LTI có nhân quả không?  
**Đáp án** Không nhân quả. Nếu đề hỏi BIBO ổn định, kiểm tra ∫|h(t)|dt hữu hạn. `#840, #873, #880`

**Butterworth → Đáp ứng biên độ phẳng tối đa trong dải thông.**  
**Ví dụ** Đề yêu cầu chọn bộ lọc maximally flat, không ripple. Chọn gì?  
**Đáp án** Butterworth. `#889`

## Chương 3 · Điều chế biên độ

**AM thường và DSB-SC → B = 2W. SSB → B = W.**  
**Ví dụ** Bản tin có băng thông W = 4 kHz. Ba hệ cần bao nhiêu băng thông?  
**Đáp án** AM thường 8 kHz, DSB-SC 8 kHz, SSB 4 kHz. AM thường có carrier và hai dải biên. DSB-SC triệt carrier. `#822, #825, #860–861`

**AM một tone, μ = 1 → Carrier 2/3 tổng công suất, hai dải biên 1/3.**  
**Ví dụ** Điều chế AM 100%, công suất tổng 90 W. Hai dải biên chiếm bao nhiêu?  
**Bấm** `90 ÷ 3` → **30 W**. Nếu hỏi carrier, lấy **60 W**. Với μ bất kỳ, hiệu suất dải biên là μ²/(2 + μ²). `#845, #874`

**Envelope detector → 0 < μ ≤ 1 trong AM chuẩn lý tưởng.**  
**Ví dụ** Đề cho μ = 1.2. Máy thu dùng tách đường bao sẽ gặp gì?  
**Đáp án** Quá điều chế, làm méo đường bao. `#866, #877`

**Coherent DSB-SC, lệch pha φ → Tín hiệu thu nhân cos φ.**  
**Ví dụ** Lệch pha tham chiếu 90°. Thành phần bản tin thu được bằng bao nhiêu?  
**Đáp án** 0 vì cos 90° = 0. Thấy câu hỏi khôi phục sóng mang DSB-SC thì nghĩ đến Costas loop. `#851, #868`

## Chương 4 · FM và PM

**FM → Đổi tần số tức thời. PM → Đổi pha tức thời.**  
**Ví dụ** Biên độ RF giữ nguyên, tần số tức thời biến thiên theo bản tin. Đó là gì?  
**Đáp án** FM. `#803, #838, #899`

**FM một tone → β = Δf/fₘ. Carson → B ≈ 2(Δf + W).**  
**Ví dụ** Độ lệch đỉnh 75 kHz, bản tin là tone 15 kHz. Tính β và băng thông.  
**Bấm** `75 ÷ 15` → **β = 5**. `2 × (75 + 15)` → **180 kHz**. `#947`

**NBFM → β rất nhỏ, băng thông xấp xỉ 2W. Sideband FM một tone → Bessel.**  
**Ví dụ** Đề hỏi dùng hàm gì để tính biên độ từng dải biên FM một tone?  
**Đáp án** Hàm Bessel. `#842, #895, #939`

## Chương 5 · Xác suất và quá trình ngẫu nhiên

**CDF → P(X ≤ x). PDF → Đạo hàm CDF với biến tuyệt đối liên tục, tại điểm khả vi.**  
**Ví dụ** X phân bố đều trên [0, 4]. Tính P(X ≤ 1).  
**Bấm** `1 ÷ 4` → **0.25**. CDF luôn không giảm. `#831, #843, #926`

**Marginal PDF → Tích phân bỏ biến còn lại. Independent → Nhân các mật độ riêng.**  
**Ví dụ** Có fₓᵧ(x,y), đề hỏi mật độ riêng của X. Làm gì?  
**Đáp án** Tích phân fₓᵧ(x,y) theo y trên toàn miền của y. `#904, #930`

**Gaussian → Mean và variance. Standard deviation → Căn của variance.**  
**Ví dụ** Variance bằng 9. Độ lệch chuẩn là bao nhiêu?  
**Bấm** `√9` → **3**. `#826, #848`

**WSS → Mean hằng, autocorrelation phụ thuộc độ trễ. PSD → Fourier của autocorrelation.**  
**Ví dụ** Đề cho Rₓ(τ), hỏi cách tìm Sₓ(f).  
**Đáp án** Biến đổi Fourier Rₓ(τ). `#909`

## Chương 6 · Nhiễu trong AM và FM

**White noise → PSD phẳng. Receiver input BPF → Giới hạn băng nhiễu.**  
**Ví dụ** Đề cho PSD bằng N₀/2 ở mọi tần số. Từ khóa cần chọn là gì?  
**Đáp án** White. Trong AWGN, A là additive, W là white, G là Gaussian. `#819, #908, #929`

**FM limiter → Loại biến thiên biên độ. De-emphasis → Giảm nhiễu cao tần ở máy thu.**  
**Ví dụ** Sau discriminator, nhiễu nghe rõ ở vùng âm cao. Khối nào giúp giảm?  
**Đáp án** De-emphasis. `#905, #912`

**FM discriminator trên ngưỡng → PSD nhiễu ∝ f², tổng công suất nhiễu trong băng ∝ W³.**  
**Ví dụ** Nhiễu đầu vào trắng, chưa de-emphasis, W tăng từ 5 lên 10 kHz. Tổng công suất nhiễu tăng bao nhiêu?  
**Bấm** `(10 ÷ 5)³` → **8 lần**. `#816, #935`

**Figure of Merit → SNR đầu ra chia SNR tham chiếu.**  
**Ví dụ** SNR đầu ra 20 dB, SNR tham chiếu 23 dB. Figure of Merit theo dB bằng bao nhiêu?  
**Bấm** `20 − 23` → **−3 dB**, tương đương khoảng 0.5 theo tỉ số tuyến tính. `#932`

## Chương 7 · Sampling, PCM và DM

**Nyquist rate → 2W. Dưới 2W → Aliasing. Đúng 2W → Không có guard band.**  
**Ví dụ** Tín hiệu thông thấp có W = 4 kHz, lấy mẫu ở 7 kHz. Chuyện gì xảy ra?  
**Bấm** `2 × 4` → **8 kHz**. 7 kHz dưới ngưỡng nên có aliasing. `#805, #811, #903`

**PCM bit rate → Số kênh × tần số lấy mẫu × bit/mẫu, cộng phần phụ nếu có.**  
**Ví dụ trong slide** T1 có 24 kênh, 8 kHz/kênh, 8 bit/mẫu và 1 bit khung mỗi lượt lấy mẫu.  
**Bấm** `(24 × 8 + 1) × 8000` → **1.544 Mbit/s**.

**ADC đều, sin toàn thang → Thêm 1 bit tăng SQNR khoảng 6 dB.**  
**Ví dụ** ADC lý tưởng tăng từ 8 lên 10 bit, giữ nguyên toàn thang. SQNR tăng bao nhiêu?  
**Bấm** `(10 − 8) × 6` → **khoảng 12 dB**. `#962`

**Delta modulation → 1 bit báo hướng bậc thang. Slope overload → Dốc vượt Δfₛ.**  
**Ví dụ** Δ = 0.1 V, fₛ = 10 kHz, dốc tín hiệu đạt 1500 V/s. Có bám kịp không?  
**Bấm** `0.1 × 10000` → **1000 V/s**. Dốc thực lớn hơn nên có slope overload. Đoạn gần phẳng với bước quá lớn thì nghĩ đến granular noise. `#812, #941, #965`

**PAM / PWM / PPM → Biên độ / độ rộng / vị trí xung.**  
**Ví dụ** Xung giữ chiều cao và độ rộng, chỉ dịch sớm hoặc muộn theo bản tin. Đó là gì?  
**Đáp án** PPM. `#918, #934`

## Chương 8 · Baseband, matched filter và ISI

**Maximize SNR at sampling instant in AWGN → Matched filter.**  
**Ví dụ** Bộ thu so dạng sóng nhận được với mẫu đã biết. Mô tả này nói đến cách nhìn nào?  
**Đáp án** Correlator. Nó cho thống kê quyết định tương ứng với mẫu đầu ra matched filter. `#807, #832`

**ISI → Xung của ký hiệu lân cận lấn vào thời điểm lấy mẫu.**  
**Ví dụ** Xung ký hiệu trước còn đuôi tại thời điểm đọc ký hiệu hiện tại. Chọn lỗi gì?  
**Đáp án** ISI. Có thể dùng equalizer để giảm ảnh hưởng do méo kênh. `#823, #837`

**Eye diagram → Ngang là dung sai timing, dọc là biên độ dự trữ.**  
**Ví dụ** Eye pattern hẹp lại theo chiều ngang. Bộ thu nhạy hơn với lỗi gì?  
**Đáp án** Sai thời điểm lấy mẫu hoặc clock jitter. `#974, #977, #1001`

**Zero-ISI → B tối thiểu = Rₛ/2 ở baseband một phía. Raised cosine → B = (1 + α)Rₛ/2.**  
**Ví dụ** PAM 4 mức, Rᵦ = 100 kbit/s, α = 0.2. Tính B.  
**Bấm** `100 ÷ log₂(4) = 50` kbaud. `1.2 × 50 ÷ 2` → **30 kHz**. `#967, #1011`

## Chương 9 · Điều chế số và OFDM

**BPSK / QPSK / 16-QAM → 1 / 2 / 4 bit mỗi symbol.**  
**Ví dụ** QPSK có tốc độ bit 200 kbit/s. Tốc độ ký hiệu là bao nhiêu?  
**Bấm** `200 ÷ 2` → **100 kbaud**.

**Gray coding → Hai điểm chòm sao kề nhau khác 1 bit.**  
**Ví dụ** Máy thu QPSK nhầm sang điểm ngay bên cạnh. Với mã Gray, nhầm đó làm sai mấy bit?  
**Đáp án** 1 bit. Với QAM vuông, tăng bậc M ở cùng năng lượng trung bình mỗi symbol làm các điểm gần nhau hơn. `#973, #1006`

**Coherent orthogonal BFSK → Cần hơn coherent BPSK khoảng 3 dB để đạt cùng BER trong AWGN.**  
**Ví dụ** BPSK cần Eᵦ/N₀ = 7 dB để đạt BER mục tiêu. BFSK cần khoảng bao nhiêu?  
**Bấm** `7 + 3` → **10 dB**. Thấy DPSK thì nhớ dùng symbol trước làm tham chiếu pha. `#827, #976`

**OFDM → IFFT ở phát, FFT ở thu. Khoảng cách sóng mang Δf = 1/Tᵤ.**  
**Ví dụ** Thời gian hữu ích Tᵤ = 64 μs. Tính Δf.  
**Bấm** `1 ÷ (64 × 10⁻⁶)` → **15.625 kHz**. `#847, #979, #1000`

**Zero-forcing mỗi sóng mang con → Chia Yₖ cho Hₖ khi Hₖ ≠ 0.**  
**Ví dụ** Bỏ qua nhiễu, Yₖ = 1 và Hₖ = 0.5. Ước lượng Xₖ?  
**Bấm** `1 ÷ 0.5` → **2**. `#883`

## Chương 10 · Entropy, Huffman và mã sửa lỗi

**Self-information → −log₂p. Entropy → Trung bình lượng tin.**  
**Ví dụ** Một ký hiệu có p = 1/8. Khi xuất hiện, nó mang bao nhiêu bit thông tin?  
**Bấm** `−log(1/8) ÷ log(2)` → **3 bit**. `#834, #994`

**Huffman → Ghép hai xác suất nhỏ nhất mỗi lượt. 2ᵏ ký hiệu đồng xác suất → k bit/ký hiệu.**  
**Ví dụ** Có 8 ký hiệu đồng xác suất. Mỗi từ mã Huffman dài bao nhiêu?  
**Bấm** `log(8) ÷ log(2)` → **3 bit**. `#964, #998`

**Capacity → Max I(X;Y). BSC xác suất lật p → C = 1 − H₂(p).**  
**Ví dụ** BSC có xác suất lật p = 0.5. Dung lượng bao nhiêu?  
**Đáp án** H₂(0.5) = 1 nên **C = 0 bit/lần dùng kênh**. `#984, #987`

**Block code (n,k) → Rate k/n. Phát hiện dₘᵢₙ − 1 lỗi hoặc sửa ⌊(dₘᵢₙ − 1)/2⌋ lỗi.**  
**Ví dụ trong slide** Hamming (7,4), dₘᵢₙ = 3. Tính rate và số lỗi phát hiện hoặc sửa bảo đảm.  
**Bấm** `4 ÷ 7` → **0.571**. `3 − 1` → phát hiện **2**. `(3 − 1) ÷ 2` → sửa **1**. `#1008–1009`

**Syndrome = 0 → Từ nhận thỏa các phương trình kiểm tra.**  
**Ví dụ** Mã lặp 3 gửi 000, cả ba bit bị lật thành 111. Bộ kiểm tra có phát hiện không?  
**Đáp án** Không phát hiện vì 111 cũng là từ mã hợp lệ. `#966`
