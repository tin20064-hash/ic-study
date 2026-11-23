"""Apply independently checked answer corrections without regenerating the anime UI."""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ONLINE = ROOT / 'ic-study-online'
BANK = r'(<script[^>]*id="question-bank"[^>]*>)([\s\S]*?)(</script>)'
EX = r'(<script id="short-explanations"[^>]*>)([\s\S]*?)(</script>)'
base_html = (ONLINE / 'source/study.html').read_text(encoding='utf-8')
questions = json.loads(re.search(BANK, base_html)[2])
by_id = {q['id']: q for q in questions}
explanations = json.loads(re.search(EX, base_html)[2])
audit_path = ONLINE / 'source/answer-audit.json'
previous = json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.exists() else {}
audit = {}

refs = {
 'lti': ('MIT Signals and Systems, Lecture 5', 'https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/7cb1b42ee9eed3b7e2a45fd52a10fcab_mC3TiBJiCsY.pdf'),
 'dtft': ('MIT Signals and Systems, Lecture 11', 'https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/resources/lecture-11-discrete-time-fourier-transform/'),
 'dft': ('SciPy: DFT definition and normalization', 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.fft.fft.html'),
 'dm': ('NPTEL: granular noise and slope overload', 'https://archive.nptel.ac.in/content/storage2/courses/117104069/chapter_7/7_37.html'),
 'cmos': ('UCSB: Digital IC circuit styles', 'https://courses.ece.ucsb.edu/ECE125/125_W09Banerjee/Lectures/Lecture4.pdf'),
 'inverter': ('UBC: CMOS inverter and noise margins', 'https://courses.ece.ubc.ca/481/lectures/Lecture_06.pdf'),
 'load': ('KIIT: enhancement-load inverter', 'https://kp.kiit.ac.in/pdf_files/06/SM_5th-SEM_Etc_VLSI-Embedded-System.pdf'),
 'flop': ('Stanford EE371: Semi-Dynamic Flip-Flop', 'https://web.stanford.edu/class/archive/ee/ee371/ee371.1066/lectures/Old/Older/lect_08_1up.pdf'),
 'codes': ('MIT: uniquely decodable and prefix codes', 'https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf'),
 'driver': ('Linux kernel: character-device open callback', 'https://github.com/torvalds/linux/blob/master/fs/char_dev.c'),
 'yocto': ('Yocto: IMAGE_INSTALL', 'https://docs.yoctoproject.org/ref-manual/variables.html#term-IMAGE_INSTALL'),
}

def add(qid, *, answer=None, question=None, options=None, append=None, reason=None, tip=None, note, sources=(), kind='key'):
    q = by_id[qid]
    old = previous.get(qid, {}).get('original', {k: q[k] for k in ('question', 'options', 'answer')})
    changes = {}
    if question is not None: changes['question'] = question
    if options is not None:
        changed = list(q['options'])
        for i, value in options.items(): changed[int(i)] = value
        changes['options'] = changed
    if append is not None:
        changed = list(changes.get('options', q['options']))
        if append not in changed: changed.append(append)
        changes['options'] = changed
        if answer == 'last': answer = [changed.index(append)]
    if answer is not None: changes['answer'] = answer
    changes['review'] = False
    q.update(changes)
    e = explanations[qid]
    if reason is not None: e['reason'] = reason
    if tip is not None: e['tip'] = tip
    e.update(sourceConflict=True, verified=True, originalAnswer=old['answer'], correctedAnswer=q['answer'], correctionNote=note,
             references=[{'title': refs[s][0], 'url': refs[s][1]} for s in sources])
    audit[qid] = {'reviewedAt': '2026-11-08', 'kind': kind, 'original': old, 'changes': changes,
                  'reason': e['reason'], 'tip': e['tip'], 'note': note, 'references': e['references']}

# Correct the answer key using derivations, not the supplied screenshot key.
add('DGT302-510', answer=[0], reason='Tổng Σ n·aⁿ·e^(−jωn) = a·e^(−jω)/(1−a·e^(−jω))². Nhân j với đạo hàm DTFT cho dấu dương.', tip='n·aⁿu[n] → tử +a·e^(−jω), không có dấu trừ.', note='Đổi khóa D → A sau khi tính lại đạo hàm.', sources=('dtft',))
add('DGT302-519', answer=[0], reason='Viết cos thành hai hàm mũ rồi dùng tính chất dịch phổ: Xs[k] = ½{X[(k−k0) mod N] + X[(k+k0) mod N]}.', tip='Nhân cos → hai phổ dịch, mỗi phổ có hệ số ½.', note='Đổi khóa B → A; khóa cũ nhầm dịch tần số với dịch thời gian.', sources=('dtft','dft'))
add('DGT302-521', answer=[1], reason='Với DFT thuận X[k] = Σ x[n]e^(−j2πkn/N), tổng năng lượng là Σ|x[n]|² = (1/N)Σ|X[k]|².', tip='DFT thuận không chuẩn hóa → Parseval có 1/N.', note='Đổi khóa A → B; cần hệ số 1/N theo quy ước DFT của đề.', sources=('dft',))
add('DGT302-529', answer=[2], reason='Hai nhánh cùng nhận x[n], rồi cộng đầu ra: y = x*h₁ + x*h₂ = x*(h₁+h₂). Vì vậy h_eq[n] = h₁[n] + h₂[n].', tip='parallel / song song → cộng; cascade / nối tiếp → chập.', note='Đổi khóa A → C. Phép chập h₁*h₂ thuộc cấu hình nối tiếp.', sources=('lti',))
add('DGT302-777', answer='last', question='Two distinct analog signals produce exactly the same samples at a given sampling rate. Which explanation is most accurate?', append='The samples cannot distinguish the signals: this is an aliasing ambiguity, without requiring both signals to exceed Nyquist.', reason='Hai tín hiệu khác nhau có thể trùng ở mọi thời điểm lấy mẫu. Ví dụ cos(2π·1k·t) và cos(2π·7k·t) cho cùng mẫu khi fs=8 kHz; chỉ tone 7 kHz vượt Nyquist.', tip='Different analog signals, same samples → aliasing ambiguity; không cần cả hai vượt Nyquist.', note='Bổ sung E; khẳng định “cả hai đều bị alias” trong khóa D là quá mạnh.', sources=('dtft',), kind='missing-choice')

add('COS201-941', answer='last', append='Step size is too large relative to a slowly varying input signal', reason='Khi tín hiệu đổi chậm mà bước Δ quá lớn, bậc thang dao động quanh tín hiệu và tạo granular noise. Δ quá nhỏ mới dễ gây slope overload khi tín hiệu đổi nhanh.', tip='Δ lớn + tín hiệu chậm → granular; Δ/T thiếu → slope overload.', note='Đề cũ không có lựa chọn đúng. Giữ nguyên A–D và bổ sung E, đổi khóa B → E.', sources=('dm',), kind='missing-choice')
for qid in ('COS201-801','COS201-985'):
    add(qid, answer='last', question='If a variable-length code is not prefix-free, which conclusion is always valid?', append='Instantaneous decoding is not guaranteed; the code may still be uniquely decodable with lookahead.', reason='Prefix-free bảo đảm giải mã tức thời. Chiều ngược lại không đúng: mã {0,01} không prefix-free nhưng vẫn giải mã duy nhất, vì nó là suffix-free.', tip='Not prefix-free ≠ chắc chắn ambiguous; có thể cần nhìn trước.', note='Bổ sung E; vi phạm điều kiện prefix chưa đủ kết luận mã không giải mã duy nhất.', sources=('codes',), kind='missing-choice')
for qid in ('COS201-823','COS201-978'):
    add(qid, answer='last', question='Why does intersymbol interference (ISI) typically require channel equalization rather than just treating it as independent random noise?', append='It is structured interference from neighboring symbols caused by channel memory.', reason='ISI phụ thuộc các symbol lân cận và đáp ứng kênh có bộ nhớ. Equalizer xử lý phần trộn symbol này; chỉ gọi nó là “deterministic” không giải thích được độ khó.', tip='ISI → channel memory + neighboring symbols → equalization.', note='Làm rõ câu hỏi và bổ sung E; “deterministic” không tự chứng minh ISI khó hơn nhiễu.', sources=(), kind='missing-choice')

add('ICI211-268', answer=[3], reason='Dynamic logic giữ mức trên điện dung nút động; điện tích bị rò nên cần các pha precharge/evaluate theo clock để làm mới trạng thái.', tip='Dynamic node → lưu điện tích → cần refresh / precharge.', note='Đổi khóa B → D; không cần đường dẫn DC liên tục để lưu mức logic.', sources=('cmos',))
add('ICI211-334', answer=[2], reason='t = 0,69RC = 0,69·(2×10³)·(100×10⁻¹⁵) s = 138 ps.', tip='kΩ × fF = ps; 0,69 × 2 × 100 = 138.', note='Đổi khóa A → C; phép tính nguồn sai hệ số 10.')
add('ICI211-350', answer=[1], reason='ΔV = ΔQ/C = 2 fC / 20 fF = 0,10 V.', tip='fC/fF → V; 2/20 = 0,1.', note='Đổi khóa A → B; điện áp sụt là 0,1 V, không phải 1 V.')
add('ICI211-363', answer=[0], question='Compared with a saturated enhancement-load inverter, what advantage does a properly biased linear enhancement-load inverter provide?', reason='Nguồn bias cổng bổ sung giữ transistor tải ở vùng tuyến tính và giúp VOH đạt VDD, cải thiện noise margin so với tải enhancement bão hòa.', tip='Linear enhancement load → VOH gần VDD → noise margin tốt hơn.', note='Đổi khóa B → A; “smaller output swing” không phải ưu điểm ở đây.', sources=('inverter','load'))
add('ICI211-405', answer=[3], reason='Chi phí mỗi die hoạt động = 600.000 USD / 10.000 die = 60 USD/die.', tip='Cost/good die → chia tổng chi phí cho số die tốt.', note='Đổi khóa B → D; kết quả là 60 USD, không phải 600 USD.')
add('ICI211-407', answer=[3], reason='P_static = VDD·I_leak = 0,8 V·2 mA = 1,6 mW.', tip='V × mA → mW.', note='Đổi khóa A → D; công suất là 1,6 mW, không phải 0,16 mW.')
add('ICI211-433', answer=[1], reason='NMOS dẫn tốt ở mức thấp, PMOS dẫn tốt ở mức cao. Hai nhánh song song bù nhau nên R_ON tương đương khá phẳng theo điện áp, không bằng zero và không hoàn toàn hằng.', tip='Transmission gate → Rn ∥ Rp → roughly constant.', note='Đổi khóa D → B; thống nhất với câu ICI211-273 và đặc tính R_ON của transmission gate.', sources=('cmos',))
add('ICI211-440', answer=[3], reason='NMH = VOH−VIH = 1,8−1,1 = 0,7 V. NML = VIL−VOL = 0,7−0 = 0,7 V.', tip='NMH lấy ở đầu HIGH; NML lấy ở đầu LOW.', note='Đổi khóa C → D; cả hai noise margin đều bằng 0,7 V.', sources=('inverter',))
add('ICI211-450', answer=[3], reason='t = 0,69RC = 0,69·(4×10³)·(50×10⁻¹⁵) s = 138 ps.', tip='RC = 200 ps → 0,69RC = 138 ps.', note='Đổi khóa A → D; kết quả là 138 ps, không phải 69 ps.')

# Correct misleading acronyms and unsupported generalizations.
add('ICI211-255', question='What is a characteristic performance advantage of a semi-dynamic flip-flop (SDFF)?', options={0:'Fast clock-to-Q operation using a dynamic front end and a static latch'}, reason='SDFF là Semi-Dynamic Flip-Flop: tầng vào động giúp thao tác nhanh, tầng latch tĩnh giữ đầu ra. Nó không phải tên viết tắt “Sense Delay”.', tip='SDFF → semi-dynamic; dynamic front end + static latch.', note='Sửa cách khai triển SDFF và làm rõ lựa chọn A.', sources=('flop',), kind='wording')
add('ICI211-424', answer='last', question='Which performance advantage is characteristic of a semi-dynamic flip-flop (SDFF)?', append='Fast clock-to-Q operation using a dynamic front end and a static latch', reason='SDFF dùng tầng động trước latch tĩnh để giảm trễ. Khả năng drive còn phụ thuộc tầng ra và sizing; không phải ưu điểm định nghĩa của mọi SDFF.', tip='SDFF → semi-dynamic → fast clock-to-Q.', note='Sửa tên SDFF và bổ sung E; “signal drive strength” không diễn tả đúng ưu điểm đặc trưng.', sources=('flop',), kind='missing-choice')
add('COS201-815', question='Which requirement of conventional static Huffman coding can be inconvenient when source statistics are unavailable or change rapidly?', reason='Huffman tĩnh cần ước lượng xác suất ký hiệu để xây cây mã. Điều này không có nghĩa mọi hệ thống thời gian thực đều không dùng được Huffman; bảng mã có thể biết trước hoặc thích nghi.', tip='Static Huffman → cần thống kê để xây codebook; không cấm dùng real-time.', note='Bỏ khẳng định sai rằng Huffman luôn không phù hợp với hệ thời gian thực.', sources=('codes',), kind='wording')
add('COS201-873', question='A linear time-invariant (LTI) system initially at rest is completely characterized by its:', note='Bổ sung điều kiện LTI; chỉ “linear” chưa đủ để mô tả hệ bằng một đáp ứng xung.', sources=('lti',), kind='wording')
add('COS201-877', options={3:'0 < μ ≤ 1 for ideal AM with a normalized message and no overmodulation'}, reason='Với message chuẩn hóa và μ>0, μ≤1 giữ đường bao không đổi dấu. μ=1 là giới hạn lý tưởng hợp lệ; μ>1 gây overmodulation.', tip='Envelope detection → không overmodulate → 0 < μ ≤ 1.', note='Bổ sung trường hợp biên μ=1 vào lựa chọn D.', kind='wording')
add('COS201-906', question='In the I-Q representation of a modulated signal, what do I and Q stand for?', note='Khôi phục phần câu hỏi bị mất; đáp án A giữ nguyên.', kind='text')
add('COS201-992', question='In a coded OFDM system with sufficient interleaving and FEC redundancy, what may recover data affected by a lost subcarrier when the loss is within the code capability?', reason='FEC có thể khôi phục khi có đủ dư thừa và lỗi/xóa nằm trong khả năng mã. OFDM tự nó không bảo đảm cứu dữ liệu khi mất subcarrier.', tip='Lost subcarrier → FEC có thể phục hồi nếu còn đủ redundancy.', note='Bổ sung điều kiện để tránh hứa FEC luôn phục hồi được mọi subcarrier mất.', kind='wording')
add('DGT302-518', question='Using the standard radix-2 butterfly count (N/2)·log₂N, including trivial twiddle-factor multiplications, how many complex multiplications are counted for N = 1024?', note='Làm rõ quy ước đếm; 5120 không phải số nhân tối thiểu sau mọi tối ưu.', sources=('dft',), kind='wording')
add('DGT302-754', question='For a causal rational LTI system, poles strictly inside the unit circle imply:', note='Bổ sung điều kiện nhân quả; vị trí cực một mình chưa xác định ROC của một hệ hai phía.', sources=('dtft',), kind='wording')

# Restore formulas where OCR lost mathematical symbols. Existing option indices stay put.
add('DGT302-552', options={0:'10z^(-1)/(1−10z^(-2)), ROC: |z| > √10',1:'100z^(-1)/(1−10z^(-1)), ROC: |z| > 10',2:'100z^(-2)/(1−10z^(-1)), ROC: |z| > 10',3:'10z^(-2)/(1−10z^(-2)), ROC: |z| > √10'}, note='Điền các ROC còn thiếu; lựa chọn C vẫn đúng từ tổng bắt đầu tại n=2.', sources=('dtft',), kind='text')
add('DGT302-559', question='For delta modulation with step size Δ and sampling period T, which condition avoids slope-overload distortion?', options={0:'max_t |dx(t)/dt| ≤ Δ/T',1:'max_t |dx(t)/dt| ≤ 2Δ/T',2:'max_t |x(t)| ≤ Δ',3:'max_t |d²x(t)/dt²| ≤ Δ/T'}, note='Khôi phục dấu bất đẳng thức và trị tuyệt đối bị mất; đáp án A giữ nguyên.', sources=('dm',), kind='text')
add('DGT302-576', options={0:'A shift of the spectrum to X(ω−ω₀)',1:'A shift of the spectrum to X(ω+ω₀)'}, note='Khôi phục X(ω−ω₀) trong lựa chọn A bị lỗi nhận dạng.', sources=('dtft',), kind='text')
for qid in ('DGT302-626','DGT302-679'):
    add(qid, options={0:'O(1)',1:'O(N²)',2:'O(log₂N)',3:'O(N·log₂N)'}, note='Khôi phục đầy đủ O(N·log₂N); bản cũ làm mất hệ số N.', sources=('dft',), kind='text')
add('DGT302-782', question='What does |H(e^(jω))| indicate for a sinusoidal input at frequency ω?', note='Khôi phục |H| bị mất ở câu hỏi; đáp án C giữ nguyên.', sources=('lti',), kind='text')
add('DGT302-790', question='For a wide-sense stationary input with PSD Sxx(e^(jω)), which expression gives the output PSD of a stable LTI system?', options={0:'Syy(e^(jω)) = |H(e^(jω))|²·Sxx(e^(jω))',1:'Syy(e^(jω)) = H(e^(jω)) + Sxx(e^(jω))',2:'Syy(e^(jω)) = Sxx(e^(jω)) / |H(e^(jω))|',3:'Syy(e^(jω)) = H(e^(jω))·Sxx(e^(jω))'}, note='Khôi phục các biểu thức PSD bị OCR cắt mất; khóa A không đổi.', sources=('lti',), kind='text')
add('ICI211-411', options={0:'0.5 V',1:'1.3 V',2:'1.8 V',3:'1.0 V'}, reason='VDS,sat = VGS−VT = 1,8−0,5 = 1,3 V trong mô hình kênh dài lý tưởng.', tip='Saturation onset → VDS = overdrive = VGS−VT.', note='Khôi phục dấu thập phân; đáp án B là 1,3 V, không phải 13 V.', kind='text')
for qid, idx in [('ICI211-286',0),('ICI211-351',3)]:
    add(qid, question='In a symmetric CMOS inverter under a slow input sweep, where is the direct-path short-circuit current approximately greatest?', options={idx:'Vin near the inverter switching point VM ≈ VDD/2'}, note='Phân biệt điểm chuyển inverter VM với điện áp ngưỡng VTN của riêng transistor.', sources=('inverter',), kind='wording')
add('ICI211-352', options={1:'Subthreshold leakage and reverse-biased junction leakage'}, note='Tách dòng dưới ngưỡng và dòng rò tiếp giáp; “reverse subthreshold” là cách viết gây nhầm.', kind='wording')
add('ICI211-340', options={1:'Reducing coupling area or increasing dielectric separation, with other factors fixed'}, note='Nêu rõ điều kiện C≈εA/d; thu nhỏ toàn bộ hình học không luôn làm mọi điện dung giảm.', kind='wording')
add('LOS201-37', options={0:'KERNEL_FEATURES',1:'IMAGE_INSTALL',2:'PACKAGE_CLASSES'}, note='Khôi phục dấu gạch dưới trong tên biến cấu hình.', sources=('yocto',), kind='text')
add('LOS201-84', options={0:'An invalid function pointer or a bug inside the driver open callback'}, reason='Con trỏ callback không hợp lệ hoặc lỗi bên trong đường open có thể làm kernel crash. Callback .open bằng NULL theo API được kiểm tra, không mặc định gây crash.', tip='Crash on open → invalid callback / bug in .open; NULL hợp lệ không tự gây crash.', note='Bỏ khẳng định rằng callback NULL hợp lệ tất yếu làm crash.', sources=('driver',), kind='wording')
add('LOS201-128', question='Which function directly exposes the kernel file-descriptor read system-call interface, unlike formatted stdio or a memory allocator?', note='read() trong C cũng đi qua wrapper libc; câu cũ đối lập system call và wrapper quá tuyệt đối.', kind='wording')
add('LOS201-122', options={2:'lseek()'}, note='Sửa chữ I viết hoa thành l viết thường trong tên system call lseek.', kind='text')
add('LOS201-165', options={2:'XCU (Shell and Utilities)'}, note='Sửa XCIJ thành XCU; giữ nguyên vị trí đáp án C.', kind='text')
add('LOS201-201', options={1:'PDP-11'}, note='Sửa PDP-II thành PDP-11; giữ nguyên vị trí đáp án B.', kind='text')

backup = ROOT / 'backups/before-answer-audit-2026-11-08'
backup.mkdir(parents=True, exist_ok=True)
payload = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
for target in [ROOT / 'IC_Study_Anime.html', ONLINE / 'source/study.html']:
    text = target.read_text(encoding='utf-8')
    saved = backup / ('offline.html' if target.name == 'IC_Study_Anime.html' else 'online-source.html')
    if not saved.exists(): shutil.copy2(target, saved)
    bank = json.loads(re.search(BANK, text)[2])
    for q in bank:
        if q['id'] in audit: q.update(audit[q['id']]['changes'])
    text = re.sub(BANK, lambda m: m[1]+payload(bank)+m[3], text, count=1)
    text = re.sub(EX, lambda m: m[1]+payload(explanations)+m[3], text, count=1)
    target.write_text(text, encoding='utf-8')

for target in [ROOT/'data/answer-audit.json', audit_path]:
    target.write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
for name in ['questions.json', 'text-corrections.json', 'short-explanations.tsv']:
    dest = backup/name
    if not dest.exists(): shutil.copy2(ROOT/'data'/name, dest)
data = json.loads((ROOT/'data/questions.json').read_text(encoding='utf-8'))
corrections = json.loads((ROOT/'data/text-corrections.json').read_text(encoding='utf-8'))
for q in data:
    if q['id'] in audit:
        q.update(audit[q['id']]['changes'])
        corrections.setdefault(q['id'], {}).update(audit[q['id']]['changes'])
(ROOT/'data/questions.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
(ROOT/'data/text-corrections.json').write_text(json.dumps(corrections, ensure_ascii=False, indent=2), encoding='utf-8')
(ONLINE/'source/short-explanations.json').write_text(json.dumps(explanations, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
tsv = ROOT/'data/short-explanations.tsv'
rows=[]
for line in tsv.read_text(encoding='utf-8').splitlines():
    qid=line.split('\t')[0]
    rows.append('\t'.join([qid,audit[qid]['reason'],audit[qid]['tip']]) if qid in audit else line)
tsv.write_text('\n'.join(rows)+'\n', encoding='utf-8')
changed_keys = [qid for qid,a in audit.items() if a['original']['answer'] != by_id[qid]['answer']]
print(json.dumps({'reviewedRows':len(questions),'correctedQuestions':len(audit),'changedKeys':len(changed_keys),'keyIds':changed_keys,'fiveOptions':sum(len(q['options'])==5 for q in questions)}, ensure_ascii=False))
