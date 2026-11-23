import json,re,collections,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
qs=json.loads((ROOT/'data/duplicate-candidates-COS201.json').read_text(encoding='utf-8'))['questions']
by={q['id']:q for q in qs}
def norm(s):return re.sub(r'[^a-z0-9]+','',unicodedata.normalize('NFKD',s).casefold())
def optionnorm(s):
 s=unicodedata.normalize('NFKC',s).casefold().replace('−','-').replace('–','-').replace('—','-')
 return ''.join(c for c in s if c.isalnum() or c in '<>=+-*/^')
def qid(n):return f'COS201-{n}'
clusters=collections.defaultdict(list)
for q in qs:clusters[norm(q['question'])].append(q['id'])
groups=[{'ids':ids,'reasonVi':'Cùng nội dung câu hỏi và cùng kiến thức cần trả lời; khác thứ tự lựa chọn hoặc chỉ khác cách ghi các phương án.','kind':'exact' if len({tuple(sorted(optionnorm(o) for o in by[id]['options'])) for id in ids})==1 else 'reworded'} for ids in clusters.values() if len(ids)>1]
def add(ids,reason):
 global groups
 names=[qid(n) for n in ids];nameset=set(names)
 groups=[g for g in groups if not nameset.intersection(g['ids'])]
 groups.append({'ids':names,'reasonVi':reason,'kind':'reworded'})
add([803,894,950,952],'Cùng kiểm tra định nghĩa/liên hệ: điều chế góc mang thông tin bằng biến thiên góc pha hoặc tần số của sóng mang. Hai cặp chỉ diễn đạt “định nghĩa” và “thông tin nằm ở đâu” của cùng một liên hệ.')
add([963,814],'Cùng liên hệ đường bao hằng của FSK/CPFSK với khả năng dùng bộ khuếch đại phi tuyến. Giữ 963 vì đã nêu rõ CPFSK và phân biệt với BPSK được tạo xung làm biến thiên đường bao.')
add([825,891],'Cùng kiểm tra lợi thế băng thông của SSB so với các điều chế AM hai dải biên/VSB; câu kia chỉ đảo cách hỏi từ ưu điểm sang chọn kỹ thuật.')
add([879,839],'Cùng kiểm tra điều kiện khả tích tuyệt đối đủ cho biến đổi Fourier thường. Giữ 879 vì đã sửa rõ ordinary transform và điều kiện đủ, tránh các phương án Fourier suy rộng/zero gây mơ hồ.')
add([844,882],'Cùng định nghĩa chức năng bộ phát: biến thông điệp thành dạng tín hiệu phù hợp môi trường truyền. Một câu hỏi chức năng, câu kia hỏi tên khối thực hiện đúng chức năng đó.')
add([955,1003],'Cùng kiểm tra hiệu ứng biên độ sinc của PAM flat-top/sample-and-hold gây suy giảm cao tần. Giữ 955 vì đã chỉ rõ méo biên độ, tránh nhầm với trễ pha đi kèm.')
add([1006,990],'Cùng kiểm tra liên hệ khoảng cách điểm chòm sao nhỏ hơn làm lỗi dễ xảy ra. Giữ 1006 vì nêu rõ cùng năng lượng symbol và mức AWGN, và cụ thể hóa bằng M-QAM; không có phép tính hay mục tiêu kiến thức mới trong 990.')

# Do not invent mappings for inverse-form questions or changed distractors.
for g in groups:
 canonical=by[g['ids'][0]];maps={}
 for alias in g['ids'][1:]:
  values=[]
  for o in by[alias]['options']:
   matches=[i for i,c in enumerate(canonical['options']) if optionnorm(o)==optionnorm(c)]
   values.append(matches[0] if len(matches)==1 else None)
  maps[alias]=values
 g['optionMaps']=maps
# Exact semantic synonyms where the same answer content really is equivalent.
def mapped(canonical,alias,aliasindex,targetindex):
 g=next(g for g in groups if g['ids'][0]==qid(canonical));g['optionMaps'][qid(alias)][aliasindex]=targetindex
mapped(803,894,3,1);mapped(803,950,2,1)
mapped(879,839,0,0)
mapped(955,1003,3,2)
mapped(982,986,0,0);mapped(982,986,1,3);mapped(982,986,2,2)
groups.sort(key=lambda g:int(g['ids'][0].split('-')[1]))
assert len([id for g in groups for id in g['ids']])==len({id for g in groups for id in g['ids']})
kept=[
 ([808,885],'Giữ riêng: 808 yêu cầu biết thành phần tần số tổng/hiệu sinh ra bởi phép nhân; 885 hỏi vai trò chuyển tần của mixer.'),
 ([858,906],'Giữ riêng theo tiêu chí bảo toàn mục tiêu: 858 chỉ kiểm tra Q=Quadrature; 906 kiểm tra đủ cả I=In-phase và Q=Quadrature. Cùng chủ đề nhưng 906 có thông tin bổ sung.'),
 ([837,970],'Giữ riêng: 837 nhận diện tính giới hạn băng của kênh gây chồng xung khi không bù; 970 hỏi cơ chế loại thành phần cao tần làm xung trải rộng.'),
 ([899,949],'Giữ riêng: biên độ sóng mang hằng và công suất trung bình hằng là hai đại lượng khác nhau; 949 còn nêu điều kiện tải cố định và trung bình thay vì công suất tức thời.'),
 ([811,805,903,910,981],'Giữ riêng: tốc độ Nyquist, khoảng chuyển tiếp bộ lọc khi lấy đúng biên, bất đẳng thức dưới Nyquist, hậu quả aliasing và cơ chế lặp phổ là các mục tiêu khác nhau.'),
 ([816,935],'Giữ riêng: 935 hỏi hình dạng PSD nhiễu FM tăng với tần số; 816 hỏi công suất nhiễu tích phân tăng theo W³, cần thêm bước tích phân.'),
 ([914,962],'Giữ riêng: 914 nhận diện tăng trưởng hàm mũ theo số bit; 962 áp dụng công thức để tính cụ thể mức cải thiện 8→10 bit là khoảng 12 dB.'),
 ([851,982],'Giữ riêng: 851 là thu DSB-SC một nhánh tại lỗi pha đúng 90° làm thành phần thông điệp bằng zero; 982 là thu I/Q đầy đủ với lỗi pha tổng quát gây trộn/quay hai nhánh.'),
 ([807,832],'Giữ riêng: tương đương correlator ở mẫu quyết định và tối ưu SNR trong nhiễu trắng là hai tính chất khác nhau của matched filter.'),
 ([845,874,877,866],'Giữ riêng: hiệu suất dải biên tối đa, phần công suất sóng mang, điều kiện tách đường bao và hậu quả overmodulation là các câu khác điều kiện/đại lượng.'),
 ([822,861],'Giữ riêng: conventional AM có sóng mang; DSB-SC triệt sóng mang. Đây là phân biệt cần học, không phải câu trùng.'),
 ([832,1007,802,975],'Giữ riêng: tối ưu bộ lọc SNR, ý nghĩa hàm Q, cơ chế BER suy giảm và tác động tăng Eb/N0 cụ thể là các nhiệm vụ khác nhau.'),
 ([839,840,880,881],'Giữ riêng giữa nhóm FT và các điều kiện LTI: khả tích tuyệt đối tín hiệu cho tồn tại Fourier, khả tích tuyệt đối đáp ứng xung cho BIBO, h(t<0)=0 cho nhân quả và Paley-Wiener là các mệnh đề khác nhau.'),
 ([831,843,926,921],'Giữ riêng: định nghĩa CDF, tính đơn điệu CDF, PDF=dCDF/dx và mật độ phân bố đều không cùng một yêu cầu.'),
 ([934,918],'Giữ riêng: PPM dùng thời điểm nên ít nhạy nhiễu biên độ; sự tương tự PPM với PM kiểm tra liên hệ điều chế khác.'),
 ([965,941,849,898],'Giữ riêng: quá tải dốc, granular noise, tăng fs giúp theo dốc và noise-shaping delta-sigma có cơ chế/điều kiện khác nhau.'),
 ([815,964,998,972],'Giữ riêng: nhược điểm cần xác suất, trường hợp đồng xác suất 2^k, tối ưu trong lớp mã prefix theo ký hiệu và cận entropy là các kiến thức khác nhau.'),
 ([817,833,979,847,1000,992],'Giữ riêng ngoài nhóm 833/999: chống multipath, hậu quả mất trực giao, điều kiện khoảng cách/timing gây mất trực giao, FFT/IFFT và khôi phục FEC là những mục tiêu riêng.'),
 ([973,990,991],'Giữ riêng ngoài nhóm 990/1006: Gray coding giảm số bit sai, khoảng cách Euclid ảnh hưởng lỗi và ngưỡng tối ưu antipodal khác nhau.'),
 ([959,856,886],'Giữ riêng: đồng bộ Manchester, số lớp OSI và chức năng PHY không trùng nội dung dù cùng hệ thống truyền thông.')
]
out={'subject':'COS201','reviewedQuestions':len(qs),'groups':groups,'keptDistinct':[{'ids':[qid(n) for n in ids],'reasonVi':reason} for ids,reason in kept],'summary':{'groups':len(groups),'hiddenAliases':sum(len(g['ids'])-1 for g in groups),'remaining':len(qs)-sum(len(g['ids'])-1 for g in groups)},'mappingNoteVi':'Chỉ ánh xạ lựa chọn có nội dung tương đương chắc chắn; câu đảo chiều câu hỏi/đáp án hoặc distractor khác giữ null. Alias vẫn cần giữ dữ liệu gốc để đọc tiến độ cũ.'}
(ROOT/'data/duplicate-groups-COS201.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(out['summary'])
print([g['ids'] for g in groups])
