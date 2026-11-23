import json,re,cmath,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'ic-study-online/source/study.html').read_text(encoding='utf-8')
bank=json.loads(re.search(r'<script[^>]*id="question-bank"[^>]*>([\s\S]*?)</script>',s)[1])
qs=[q for q in bank if q['subject']=='DGT302'];by={q['id']:q for q in qs}
reasons={}
def group(ids,reason):
 for n in ids:reasons[f'DGT302-{n}']=reason
group([500,585,613,638,663,666,691,773], 'Substitution z=e^(jω) turns z^(−n) into the DTFT kernel; the evaluation represents a frequency response only if the unit circle belongs to the ROC.')
group([501,553,555,612,662,665,719,747,754,762,763,764], 'For rational LTI transfer functions, BIBO stability requires an ROC containing the unit circle; causality selects the exterior ROC, hence all uncancelled poles inside |z|=1. For poles 0.5 and 2, the stable annulus is 0.5<|z|<2.')
group([502,563,752,784], 'Finite precision perturbs polynomial coefficients and thus pole/zero locations; splitting a high-order transfer function into biquads usually limits sensitivity better than one high-degree polynomial. This is a recommendation, not a universal legal/industry mandate.')
group([503], 'The Schur stability recursion for a causal all-pole lattice requires every reflection coefficient to have magnitude strictly less than one.')
group([504,618,671,731], 'A longer observation window narrows its spectral main lobe, resolving closer frequencies while averaging over more time; time localization and frequency localization cannot both be arbitrarily sharp.')
group([505], 'The alias transfer is proportional to H0(−z)G0(z)+H1(−z)G1(z). Under H1(z)=H0(−z), BOTH the listed pair D and its common negative A make this expression zero; a gain/sign convention is needed for a unique single-choice answer.')
group([506,530,567,603,607,608,609,615,622,629,639,658,659,668,675,682,692,729,736,753,781], 'Least-squares linear estimation minimizes E|desired−estimate|²; differentiating gives orthogonality to regressors. Prediction uses shifted samples of the same WSS process, so Yule–Walker uses autocorrelation, whereas a general Wiener problem also needs desired/input cross-correlation. Expanding the regressor set cannot increase the theoretical minimum, but may leave it unchanged.')
group([507,540,713,745,779], 'Inversion swaps transfer-function zeros and poles. For a causal stable rational minimum-phase system, a stable causal inverse exists; it may be FIR or IIR. A small nonzero H amplifies noise under division, while a zero prevents exact inversion there.')
group([508,600,715,772], 'With the forward-DFT convention WN=e^(−j2π/N), W8²=e^(−jπ/2)=−j. Multiplication by −j maps a+jb to b−ja, needing a swap and sign change.')
group([509,778], 'A hold maintains each sampled voltage for a time interval. A zero-order hold is simple but has a staircase waveform and a sinc-shaped analog frequency response, so it is not ideal reconstruction.')
group([510,535,574], 'Summing a geometric series gives DTFT{a^n u[n]}=1/(1−ae^(−jω)); differentiating and multiplying by j gives DTFT{n a^n u[n]}=ae^(−jω)/(1−ae^(−jω))², for |a|<1.')
group([511,527,543,547,572,602,649,653,702,706,737], 'Time-domain windowing is pointwise multiplication, hence periodic spectral convolution. For equal length among the listed windows, rectangular has the narrowest main lobe but high sidelobes; Blackman has stronger sidelobe suppression and a broader main lobe. Increasing observation/filter length narrows transition width but does not eliminate the limiting Gibbs overshoot.')
group([512,549,591,636,689,735,741], 'Linear convolution of lengths L and M has length L+M−1; N-point FFT convolution equals it when zero-extended to at least that total length. Circular wraparound contaminates the first M−1 overlap-save outputs, which must be discarded.')
group([513,596,714,720], 'In a conventional in-place radix-2 decomposition, DIT multiplies the incoming branch by its twiddle before sum/difference and commonly uses bit-reversed input; DIF forms sum/difference before the difference-branch twiddle and commonly yields bit-reversed output.')
group([514,536,557,558,560,611,624,633,661,664,677,686,711,734,738,744,746,759,766,774,777,785,786,788], 'Sampling multiplies by an impulse train, producing translated spectral replicas separated by Fs. Aliasing is overlapping replica information that cannot in general be undone by later filtering or extra ADC bits. For baseband fmax=8 kHz, 20 kHz is the listed safe rate. Bandpass sampling can use a lower rate only when bands remain disjoint; for the stated wedge, k=floor(10702.5/25)=428 and 2Fh/k≈50.011682 kHz.')
group([515], 'Directly summing 0.5 Σ(n=0..3)exp(−j2πn/8) gives 0.5−j1.207106781..., confirming canonical B.')
group([516,526,545,578,579,580,581,634,651,654,687,704,707,708,756,767,770,780,798], 'Rate conversion by I/D conventionally upsamples, applies a low-pass filter of cutoff at most min(π/I,π/D) and gain I at the high-rate grid, then downsamples. Downsampling y[m]=x[Dm] reduces rate to Fs/D and expands/aliases its normalized-frequency spectrum: Y(ω)=(1/D)Σ(k=0..D−1)X((ω−2πk)/D). Polyphase implementations avoid calculations on inserted zeros or discarded outputs.')
group([517,718,782], 'An LTI system maps e^(jωn) to H(e^(jω))e^(jωn). Frequency remains unchanged, |H| scales amplitude and arg H adds phase, wherever the sinusoidal steady-state response exists.')
group([518,525,544,565,568,599,605,617,626,630,631,646,656,670,679,683,684,699,768,775,783,787,792], 'The direct DFT has N²-scale work; radix-2 FFT has log₂N stages, N log₂N additions and (N/2)log₂N standard twiddle products. In-place butterflies reuse memory. General FFT libraries also support non-power-of-two lengths; power-of-two padding is only a choice/requirement for radix-2-only implementations. The inverse of the unnormalized DFT needs its 1/N factor.')
group([519,576,627,628,680,681], 'Multiplication by e^(jω0n) shifts DTFT to X(ω−ω0). A cosine is half the sum of opposite exponentials, giving two half-scaled circular DFT shifts. Multiplication by (−1)^n shifts a low-pass response by π into high-pass.')
group([520], 'A successive-approximation ADC determines bits sequentially by comparing the analog input with trial DAC levels, unlike parallel flash comparators or integrating ramps.')
group([521,739,793], 'For X[k]=Σ x[n]e^(−j2πkn/N), orthogonality gives Σ|x[n]|²=(1/N)Σ|X[k]|². Energy conservation requires the normalization appropriate to the chosen transform convention.')
group([522,542,551,552,554,717,742], 'The two-sided z-transform sums x[n]z^(−n). Thus the six samples starting at n=0 give 2+4z^−1+5z^−2+7z^−3+z^−5; 10^n u[n−2] gives 100z^−2/(1−10z^−1), |z|>10. For the unilateral convention, a one-sample delay adds the initial-condition term y[−1]. H=Y/X is the zero-state transfer relation.')
group([523,570], 'The forward DTFT sums over all integer n with e^(−jωn); the N-point forward DFT is the finite sum with e^(−j2πkn/N), without a 1/N factor under this convention.')
group([524,528,531,532,534,561,562,614,616,623,650,667,669,676,703,726,765], 'Finite-order difference-equation realizations use adders, constant multipliers and delays. Direct Form II shares delays, requiring max(M,N). Partial fractions give parallel branches; MA is an all-zero FIR model, AR is all-pole, and lattice parameters are reflection coefficients. A FIR response can also have a recursive algebraic realization with exact cancellation, so feed-forward-only is not its definition.')
group([529], 'Parallel branches driven by the same x have y=x*h1+x*h2=x*(h1+h2); canonical C is correct. Convolution h1*h2 instead describes cascading.')
group([533,573], 'Linearity passes constants through the transform and adds transformed signals. Absolute-convergence regions include at least the intersection of the original ROCs; cancellations can enlarge it.')
group([537,743], 'A notch requires a numerator zero at e^(±jω0). For H(z)=1−z^−M, setting e^(−jMω)=1 gives ω=2πk/M.')
group([538,583,588,589,590,709,728,740,755,791,794], 'The time-domain convolution theorem gives Y=XH in either DTFT or z-domain. Pointwise time multiplication instead produces spectral convolution. Convolution is commutative and multiplies polynomial coefficient sequences; cross-correlation compares shifted signals and conjugates one for complex data rather than the convolution reversal.')
group([539,592,594,652,705,727], 'A real-coefficient FIR has generalized linear phase for a symmetric or antisymmetric impulse response. Group delay is constant where response/phase are defined; antisymmetric FIRs have zero DC and cannot pass DC as a low-pass filter. Linear phase removes phase-delay distortion, but flat magnitude is additionally needed to preserve an arbitrary waveform.')
group([541], 'A sigma-delta modulator places integration before quantization inside its error-feedback architecture, shaping quantization noise; the chosen answer is the intended block-level distinction.')
group([546,556,587,604,606,619,632,648,655,657,672,685,701,721,722,723,724,725,732,789], 'Linearity is superposition, time invariance means shifts commute with the system, and a relaxed causal LTI impulse response vanishes at negative time. Memoryless output uses only the current input; BIBO means every bounded input has bounded output. Discrete time quantizes the time index, while ADC quantization discretizes amplitude and random signals require statistical descriptions.')
group([548], 'ω=0 is DC; neighboring normalized frequencies describe slow variation, whereas |ω| near π is the fastest alternation on the discrete grid.')
group([559], 'The staircase can change at speed at most Δ/T, so avoiding slope overload requires max|dx/dt|≤Δ/T under the given step convention.')
group([564,645,698,716,749,761,771], 'Under high-resolution unsaturated ADC assumptions, quantization error is often approximated as white noise. More bits reduce quantization error; oversampling and band limiting reduce in-band noise. Fixed-point FFT butterflies can overflow without scaling. Dropping two’s-complement LSBs rounds downward, hence quantized-minus-exact error is nonpositive; truncation toward zero or the opposite error definition changes the sign conclusion.')
group([566], 'The nondeterministic part of a WSS process with an admissible spectral factor has a white-innovation-driven LTI representation. An arbitrary WSS process may additionally have a deterministic component, so “any stationary process” is too broad.')
group([569,620,673,769], 'The N-point DFT samples the DTFT of an N-sample zero-extended record at 2πk/N. Zero padding adds interpolation points of that same DTFT, not observation time, independent information or genuine frequency resolving power.')
group([571,635,642,688,695], 'For typical correlated image blocks, DCT concentrates energy in relatively few low-frequency coefficients; lossy JPEG quantization suppresses many high-frequency coefficients. This is energy compaction, not exact linear phase or avoiding all multiplication.')
group([575,577,641,694,776], 'A real sequence has conjugate-symmetric spectrum X(−ω)=X*(ω), giving even magnitude and odd phase modulo 2π where X≠0. An additionally even real sequence has a real-even spectrum, with phase 0 or π only where nonzero.')
group([582,625,678,795,796,797,799], 'SciPy documentation defines freqz for digital frequency response, firwin for window-designed FIR, butter for Butterworth IIR design, and lfilter for filtering by a direct-form-II-transposed implementation. SOS filtering is usually preferable to one high-order polynomial for numerical reliability; it is incorrect to claim lfilter’s form is globally superior.')
group([584,586], 'For H=(1−a)/(1−ae^−jω), solve |H|²=1/2 to obtain cosωc=(4a−1−a²)/(2a); a cutoff in [0,π] exists only when a≥3−2√2. A nonzero numerator with 0<a<1 has a low-pass magnitude shape.')
group([593,595,621,674,712,750], 'Feedback IIR designs often meet a magnitude specification at lower order. Bilinear substitution maps the s-plane left half to inside the unit circle but warps frequency, addressed by prewarping. Chebyshev-I trades passband ripple for a sharper transition than Butterworth at comparable order.')
group([597,598], 'Applying the unnormalized DFT twice yields N·x[−k mod N]. For N=8, natural index 3 is binary 011 and reverses to 110=6.')
group([610,660], 'Multiplying standard overlap-save input blocks by a Hamming window changes the input amplitudes. Without an appropriate overlap/window reconstruction scheme, the output is amplitude modulated rather than the unchanged linear-filter result.')
group([637,690], 'ROC is the region of convergence of the z-transform series.')
group([640,693], 'The cross-correlation maximum locates the lag of best waveform alignment, subject to the chosen sign convention; it is unrelated to filter poles or cutoff.')
group([643,647,696,700,751,758], 'DSP architectures optimize multiply-accumulate operations and programmable processing. Fixed point often lowers power/area cost; comparable-word-length floating formats offer larger dynamic range through an exponent, but neither has infinite precision.')
group([644,697,710], 'Fourier series represent periodic signals by discrete harmonics; Fourier-transform analysis is the corresponding standard tool for aperiodic signals. Generalized Fourier transforms can also describe periodic signals, so “mainly” is essential.')
group([733], 'Perfect reconstruction permits an overall gain and integer delay: analysis followed by synthesis returns g·x[n−d], not necessarily zero delay or a quantization-free implementation.')
group([730], 'An OFDM transmitter synthesizes orthogonal subcarriers with an IFFT and the receiver recovers their coefficients with an FFT.')
group([790], 'For a WSS input through a stable LTI system, output PSD is Syy=H H* Sxx=|H|²Sxx; a single H factor is insufficient.')
group([748], 'The DTFT kernel is unchanged by ω→ω+2π because e^(−j2πn)=1 for integer n, so 2π is its universal period.')
group([757], 'Digital signal processing permits changing algorithms in software rather than replacing an analog component network; thermal drift and component aging are drawbacks, not its listed advantage.')
group([760], 'A low-pass magnitude response preserves low frequencies (including DC in the usual case) while attenuating high frequencies, rather than passing a narrow resonance or rapid variation.')
assert len(reasons)==len(qs),(len(reasons),[q['id'] for q in qs if q['id'] not in reasons])

REF={
 'dtft':'https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/resources/lecture-11-discrete-time-fourier-transform/',
 'z':'https://archive.nptel.ac.in/content/storage2/courses/117104070/lecture7/slide_7_6.htm',
 'blackman':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.windows.blackman.html',
 'fft':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.fft.fft.html',
 'lfilter':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.lfilter.html',
 'freqz':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.freqz.html',
 'upfirdn':'https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.upfirdn.html',
 'qmf':'https://dsprelated.com/freebooks/SASP/Quadrature_Mirror_Filters_QMF.html',
 'downsample':'https://www.mathworks.com/help/signal/ug/avoid-aliasing-in-signal-downsampling.html',
 'aliasproof':'https://dsprelated.com/freebooks/SASP/Downsampling_Aliasing.html',
 'wiener':'https://live.ocw.mit.edu/courses/6-011-introduction-to-communication-control-and-signal-processing-spring-2010/a6bddaee5966f6e73450e6fe79ab0566_MIT6_011S10_notes.pdf'
}
changes={}
def change(n,note,question=None,options=None,reason=None,tip=None,refs=('dtft',),severity='essential'):
 q=by[f'DGT302-{n}'];d={}
 if question:d['question']=question
 if options:d['options']=options
 changes[q['id']]={'originalAnswer':q['answer'],'correctedAnswer':q['answer'],'changes':d,'reason':reason or reasons[q['id']],'note':note,'references':[REF[k] for k in refs],'severity':severity}
 if tip:changes[q['id']]['tip']=tip

q=by['DGT302-505'];o=q['options'].copy();o[0]='G0(z) = -H0(z) and G1(z) = -H0(-z)'
change(505,'Original A and D differ only by a common sign and both cancel aliasing; repair A and state the QMF analysis relation.',question='In a two-channel QMF bank with H1(z)=H0(-z), which conventional synthesis pair cancels the alias component?',options=o,refs=('qmf',),tip='QMF chuẩn: G0=H0; G1=−H0(−z).')
q=by['DGT302-507'];o=q['options'].copy();o[2]='It has a stable, causal inverse filter (which may be FIR or IIR).'
change(507,'Minimum-phase does not force the inverse to be IIR; an all-pole system can have an FIR inverse.',options=o,refs=('z',),tip='Minimum phase → inverse causal + stable; không bắt buộc IIR.')
change(512,'N≥L·M is also sufficient for positive integer lengths, so ask for the minimum general padding requirement.',question='For finite sequences of lengths L and M, what is the minimum general requirement on N that guarantees their N-point circular convolution equals their zero-padded linear convolution?',severity='clarity')
change(516,'A normalized cutoff needs its reference sampling grid specified.',question='To convert sample rate by 3/4 using upsample-by-3, FIR filtering and downsample-by-4, what ideal low-pass cutoff (normalized to the Nyquist frequency of the upsampled grid) and DC gain should the FIR have?',refs=('upfirdn',),severity='clarity')
q=by['DGT302-520'];o=q['options'].copy();o[0]='Flash converter';change(520,'Remove an OCR-embedded option label, which becomes misleading when choices are shuffled.',options=o,severity='ocr')
change(524,'Not every abstract LTI system has a finite implementation; qualify this as a finite-order difference equation.',question='A finite-order linear constant-coefficient difference equation can be implemented using which three basic DSP building blocks?',refs=('lfilter',))
change(539,'Linear phase prevents phase-delay distortion, but arbitrary waveform preservation also needs flat magnitude.',question='To avoid phase distortion caused by different frequencies having different group delays, a filter should have a:',severity='clarity')
q=by['DGT302-545'];o=q['options'].copy();o[0]='Upsample by I, apply an anti-imaging/anti-aliasing low-pass filter, then downsample by D.';o[1]='Downsample by D before any needed anti-aliasing filtering, then upsample by I.'
change(545,'The original answer was truncated to Always Interpolate, and the universal strictly-required claim was too broad.',question='What is the conventional general-purpose processing order for rational sample-rate conversion by I/D?',options=o,refs=('upfirdn',))
change(547,'Separate the window peak-sidelobe level from FIR stopband attenuation and use an approximate −58 dB sidelobe value.',question='Among the listed equal-length window functions, which has the lowest peak sidelobe (about −58 dB) and the broadest main lobe?',refs=('blackman',),severity='clarity')
change(557,'Restore lost inequality and floor symbols in the sampling-wedge formula.',question='A bandpass signal occupies Fl=10,677.5 kHz to Fh=10,702.5 kHz. Let B=Fh−Fl and k=floor(Fh/B). Using the valid bandpass-sampling interval 2Fh/k ≤ Fs ≤ 2Fl/(k−1), what is the minimum Fs?',refs=('downsample',),severity='ocr')
q=by['DGT302-562'];o=q['options'].copy();o[0]='IIR responses require effective recursion; FIR responses have finite duration and can be realized using feed-forward paths.'
change(562,'A recursive formula with exact pole-zero cancellation can implement an FIR, so strictly feed-forward is not its definition.',question='Which statement correctly distinguishes IIR and FIR responses and their usual realizations?',options=o,refs=('lfilter',))
change(563,'No universal industry mandate requires cascade form; SOS is an engineering recommendation.',question='Which realization usually improves numerical robustness for a high-order IIR filter by splitting it into lower-order sections?',refs=('lfilter',))
q=by['DGT302-564'];o=q['options'].copy();o[0]='The error is nonpositive; for values spread within quantization cells it generally has a negative mean (DC bias).'
change(564,'The sign of truncation error depends on representation and convention; make both explicit.',question='In two’s-complement fixed-point arithmetic, assume truncation drops low-order bits (rounds toward −∞), with no overflow. For error e=quantized value−exact value, what is its sign/bias?',options=o,severity='clarity')
change(566,'Wold/innovation factorization applies to the nondeterministic component, not every arbitrary stationary process.',question='In the innovations representation of a purely nondeterministic WSS process with an admissible stable spectral factor, the process is modeled by an LTI filter driven by which input?',refs=('wiener',))
change(569,'DFT is samples of the DTFT of a finite zero-extended record, not an arbitrary infinite aperiodic signal.',question='For an N-sample record extended by zero outside 0≤n<N, its N-point DFT can be viewed as:',severity='clarity')
change(575,'Phase is undefined at spectral zeros and odd only modulo 2π under branch conventions.',question='For a real sequence, wherever X(ω)≠0 and phase is interpreted modulo 2π, conjugate symmetry implies that the phase spectrum is:',severity='clarity')
q=by['DGT302-577'];o=q['options'].copy();o[1]='X(ω) is real and even; wherever X(ω) is nonzero, its phase is 0 or π modulo 2π.'
change(577,'Avoid assigning a phase to zero-valued frequency response points.',options=o,severity='clarity')
change(580,'The selected source formula is correct. Replace vague spectral-scaling wording with the actual alias-sum derivation.',reason='Dùng chỉ báo chỉ số chẵn [1+(−1)^n]/2, suy ra Xd(ω)=½[X(ω/2)+X(ω/2−π)]. Đối số phải là ω/2, không phải 2ω.',tip='Downsample 2 → ½[X(ω/2)+X(ω/2−π)]; phổ giãn và có thể alias.',refs=('downsample','aliasproof'),severity='explanation')
change(584,'For sufficiently small a, the response never reaches −3 dB by π; require that the cutoff exists.',question='For H(z)=(1−a)/(1−az^(-1)), 0<a<1, suppose a −3 dB cutoff ωc∈[0,π] exists. Which equation must ωc satisfy?',reason=reasons['DGT302-584'],severity='clarity')
change(585,'The original stem calls the z-domain function H(w); restore H(z).',question='Provided the ROC contains the unit circle, the frequency response H(e^(jω)) is obtained from H(z) by evaluating it on the:',severity='ocr')
change(586,'Restore lost exponent z^(-1) in the stem.',question='For a causal first-order filter H(z)=b0/(1−az^(-1)), with nonzero b0 and real 0<a<1, the magnitude response is fundamentally:',severity='ocr')
q=by['DGT302-588'];o=q['options'].copy();o[1]='The shifted second sequence is not time-reversed as in convolution; complex correlation also uses conjugation.'
change(588,'Include the conjugation distinction for complex sequences.',options=o,severity='clarity')
change(594,'Symmetry/antisymmetry is the usual real-coefficient FIR condition; complex-coefficient generalizations require conjugate symmetry.',question='For a real-coefficient FIR filter to have generalized linear phase, what condition must its impulse response h[n] satisfy?',severity='clarity')
q=by['DGT302-603'];o=q['options'].copy();o[2]='Prediction uses samples of the same WSS process, so the required second-order moments are shifted autocorrelation values.'
change(603,'Expectation does not simply eliminate samples; autocorrelation arises because desired and regressor samples belong to the same process.',options=o,refs=('wiener',))
for n in [613,666]:
 q=by[f'DGT302-{n}'];o=q['options'].copy();o[1]='Setting z = 0';change(n,'Restore the incomplete OCR distractor Setting using the complete duplicated question.',options=o,severity='ocr')
for n in [615,668]:
 q=by[f'DGT302-{n}'];o=q['options'].copy();o[3]='Cannot increase theoretical MMSE; it may decrease when the added past samples provide useful correlation.'
 change(n,'More regressors cannot increase optimal MMSE, but white input gives an equality counterexample to a strict decrease.',options=o,refs=('wiener',))
for n in [625,678]:change(n,'SciPy uses DFII-transposed, but recommends SOS for fewer numerical problems; remove unsupported universal superiority.',question='Which difference-equation realization is used internally by scipy.signal.lfilter?',refs=('lfilter',))
for n in [629,682]:
 q=by[f'DGT302-{n}'];o=q['options'].copy();o[0]='It reduces the standard dense solve cost from O(p³) to O(p²) by exploiting Toeplitz structure.';o[1]='It guarantees MMSE = 0'
 change(n,'Restore OCR-corrupted complexity exponents and zero.',options=o,refs=('wiener',),severity='ocr')
for n in [631,684]:change(n,'Modern FFTs accept arbitrary N; padding is a choice for a radix-2-only implementation, not a universal requirement.',question='When using an FFT implementation restricted to radix 2, and zero extension is acceptable, how can a record whose length is not a power of two be prepared?',refs=('fft',))
change(713,'Restore H(e^(jω)) from the OCR text H(eAjw).',question='Which condition is necessary for perfect frequency-domain inversion over a desired band?',options=[o.replace('H(eAjw)','H(e^(jω))') for o in by['DGT302-713']['options']],severity='ocr')
change(718,'Restore the complex-exponential notation from eA(jwOn).',question='A complex exponential e^(jω0n) is applied to a relaxed LTI system whose frequency response exists at ω0. Which statement describes its steady-state output?',severity='ocr')
change(736,'Future observations cannot worsen optimum MMSE, but may provide no improvement.',question='A noncausal Wiener filter can achieve MMSE no larger than a comparable causal filter because:',refs=('wiener',))
change(741,'L+M−1 is the total padded transform length, not the number of appended zeros.',question='For sequences of lengths L and M, what is the minimum common FFT length N after zero-padding so FFT multiplication yields their exact linear convolution?',severity='clarity')
change(748,'4π is also a period whenever 2π is; ask for the smallest universal guaranteed period to make the listed answer unique.',question='What is the smallest positive period guaranteed for the DTFT of every discrete-time sequence?',severity='clarity')
change(779,'Restore the completely missing magnitude condition in the question stem.',question='Why is direct inverse filtering unreliable at frequencies where |H(e^(jω))| is very small but nonzero?',tip='|H| nhỏ → chia cho H làm khuếch đại nhiễu.')
change(783,'Floating-point arithmetic rounds too; make the fixed-point precision/scaling issue explicit.',question='Why must fixed-point FFT implementations carefully manage rounding, truncation and scaling?',options=['The DFT matrix is singular.','The exact FFT changes signal energy.','Butterfly equations are inherently nonlinear.','Limited fractional precision and fixed scaling can accumulate rounding/truncation errors.'],refs=('fft',))
change(784,'Use a recommendation rather than an unsupported universal industry-standard claim.',question='Which realization is widely recommended to reduce numerical problems when implementing a high-order IIR filter?',refs=('lfilter',))
change(787,'Restore the digit 1 in the inverse-normalization factor.',question='If the 1/N factor is omitted from the inverse of an unnormalized forward DFT, what happens to the reconstructed amplitudes?',refs=('fft',),severity='ocr')
for n in [795,796,797,798,799]:
 q=by[f'DGT302-{n}'];o=[v.replace('Ifilter','lfilter') for v in q['options']]
 if o!=q['options']:change(n,'Restore the actual SciPy function name lfilter (lowercase L), not Ifilter (uppercase i).',options=o,refs=('lfilter','freqz','upfirdn'),severity='ocr')

# Product-ready concise Vietnamese text is provided separately from research reasoning.
es=json.loads(re.search(r'<script id="short-explanations"[^>]*>([\s\S]*?)</script>',s)[1])
vi={
505:('Với H1(z)=H0(−z), cặp G0=H0 và G1=−H0(−z) làm H0(−z)G0+H1(−z)G1=0. Bản cũ có cả A và D cùng triệt alias do chỉ khác dấu toàn cục.','QMF chuẩn → G0=H0; G1=−H0(−z).'),
507:('Hệ minimum-phase có bộ nghịch đảo nhân quả và ổn định; bộ nghịch đảo có thể là FIR hoặc IIR, tùy cấu trúc H(z).','minimum phase → inverse causal + stable; không bắt buộc IIR.'),
539:('Pha tuyến tính cho độ trễ nhóm không đổi, tránh méo do lệch trễ. Muốn giữ nguyên dạng mọi tín hiệu còn cần đáp ứng biên độ phẳng trong dải xét.','no phase distortion → linear phase; xét cả magnitude nếu cần giữ dạng.'),
564:('Khi bỏ LSB của số bù hai tương đương làm tròn xuống, giá trị sau lượng tử không lớn hơn giá trị thật. Với e=sau−trước, sai số không dương và thường có bias âm.','drop LSB / floor + e=quantized−exact → e≤0.'),
566:('Phần không tất định của quá trình WSS có nhân tử phổ phù hợp có thể được tạo bằng cách đưa nhiễu trắng qua bộ lọc ổn định.','purely nondeterministic innovations → white noise.'),
575:('X(−ω)=X*(ω) nên pha đổi dấu modulo 2π ở những điểm X khác zero; tại zero phổ không có pha xác định.','real signal → magnitude chẵn, phase lẻ modulo 2π khi X≠0.'),
577:('Tín hiệu thực chẵn có phần sin triệt nhau nên phổ thực chẵn. Pha là 0 hoặc π modulo 2π ở những điểm phổ khác zero.','real + even → real + even spectrum; phase undefined tại zero.'),
580:('Dùng chỉ báo chỉ số chẵn [1+(−1)^n]/2, suy ra Xd(ω)=½[X(ω/2)+X(ω/2−π)]. Đối số phải là ω/2, không phải 2ω.','D=2 → ½[X(ω/2)+X(ω/2−π)]; phổ giãn, có thể alias.'),
584:('Đặt |H|²=1/2 và giải được cos(ωc)=(4a−1−a²)/(2a). Trong [0,π], cutoff này chỉ tồn tại khi a≥3−2√2.','−3 dB → nửa công suất; kiểm tra cutoff có tồn tại.'),
588:('Tương quan so sánh các dãy khi trượt, không dùng phép gập của chập. Với dãy phức còn phải lấy liên hợp một dãy.','correlation → slide + conjugate; convolution → fold.'),
631:('Đệm lên lũy thừa 2 kế tiếp là cách dùng radix-2-only. Các thư viện FFT tổng quát có thể xử lý độ dài không phải lũy thừa 2.','radix-2-only → pad; FFT tổng quát không bắt buộc power of two.'),
684:('Đệm lên lũy thừa 2 kế tiếp là cách dùng radix-2-only. Các thư viện FFT tổng quát có thể xử lý độ dài không phải lũy thừa 2.','radix-2-only → pad; FFT tổng quát không bắt buộc power of two.'),
736:('Dùng thêm quan sát tương lai mở rộng tập nghiệm; bộ tối ưu có thể bỏ qua chúng nên MMSE không tăng, và có thể giảm khi thông tin mới hữu ích.','noncausal Wiener → MMSE không lớn hơn; có thể bằng nhau.'),
741:('Chập tuyến tính dài L+M−1, nên tổng chiều dài FFT N sau đệm phải ít nhất bằng số này; đây không phải số zero cần thêm.','FFT length N≥L+M−1; không phải thêm L+M−1 zero.'),
748:('e^(−j(ω+2π)n)=e^(−jωn) vì n nguyên. 2π là chu kỳ dương nhỏ nhất bảo đảm cho mọi DTFT; tín hiệu riêng có thể có chu kỳ nhỏ hơn.','chu kỳ bảo đảm chung DTFT → 2π.'),
783:('Độ chính xác phần lẻ và dải biểu diễn cố định làm sai số làm tròn/cắt tích lũy nếu không chọn word length và scale phù hợp. Floating-point cũng có làm tròn.','fixed-point FFT → quản lý precision + scaling + rounding.')
}
for id,p in changes.items():
 n=int(id.split('-')[1]);p['reasonVi'],p['tipVi']=vi.get(n,(es[id]['reason'],es[id]['tip']))

# Direct independent finite-sum checks, no reliance on answer keys or SciPy implementation.
def dtft(x,w):return sum(v*cmath.exp(-1j*w*n) for n,v in enumerate(x))
x=[1,2,-3,4,0.25,-1,0.5,2,1,-2];y=x[::2];points=[-3,-2.7,-1.4,-.2,0,.37,1.8,math.pi]
right=max(abs(dtft(y,w)-.5*(dtft(x,w/2)+dtft(x,(w-2*math.pi)/2))) for w in points)
wrong=max(abs(dtft(y,w)-.5*(dtft(x,2*w)+dtft(x,2*w-2*math.pi))) for w in points)
assert right<1e-12 and wrong>1
checks={'downsampling_D2':{'maxErrorCorrectFormula':right,'maxErrorIncorrect2omegaFormula':wrong,'sampleSignal':x,'omegas':points},'DFT8_bin1':{'real':dtft([.5]*4,2*math.pi/8).real,'imag':dtft([.5]*4,2*math.pi/8).imag},'bandpassSamplingFsKHz':2*10702.5/math.floor(10702.5/25),'halfPowerExistsThresholdA':3-2*math.sqrt(2),'QMF':{'D':'alias H0(-z)H0(z)−H0(z)H0(-z)=0','A':'common negative of D gives the same zero alias term'},'inverseNeedNotIIR':'H(z)=1/(1−0.5z^−1) is stable causal minimum phase; H_inverse=1−0.5z^−1 is FIR.','MMSECanStayEqual':'White zero-mean input has no useful past autocorrelation, so optimal one-step predictor and its error variance are unchanged as predictor order increases.'}
ledger=[]
for q in qs:
 id=q['id'];r={'id':id,'status':'change' if id in changes else 'reviewed','currentAnswer':q['answer'],'independentReason':reasons[id],'allOptionsRead':True}
 if id in changes:r['proposal']=changes[id]
 ledger.append(r)
keywords=json.loads((ROOT/'ic-study-online/source/keyword-cards.json').read_text(encoding='utf-8'))
keywordReasons=[
 'For real x, X(−ω)=X*(ω); magnitude is even and phase is odd modulo 2π away from zeros.',
 'The DCT decorrelates typical image blocks and concentrates their energy into relatively few low-frequency coefficients; no claim is made for every possible image.',
 'For equal length, the rectangular main lobe is narrower than Hann/Hamming but its abrupt edges yield larger sidelobes, hence stronger leakage.',
 'Termwise differentiation of Σx[n]e^(−jωn), when valid, yields −jΣn x[n]e^(−jωn), so multiplication by j gives the stated transform.',
 'The odd sin terms cancel for an even real sequence, leaving a real-even cosine spectrum.',
 'Selecting every D-th input sample is exactly y[m]=x[Dm], reducing sample rate by D.',
 'Parallel outputs add: x*h1+x*h2=x*(h1+h2).',
 'Cascading convolutions associates: (x*h1)*h2=x*(h1*h2).',
 'Absolute summability of h entails a DTFT on the unit circle; for the usual rational filter this is encoded by a unit-circle-containing ROC.',
 'A minimum-phase causal stable rational filter has all zeros inside the unit circle, so its causal inverse has stable poles.',
 'Finite Fourier orthogonality gives Σ|x|²=(1/N)Σ|X|² for the unnormalized forward DFT.',
 'Expand cosine into two opposite complex exponentials, each with coefficient 1/2; modulation creates opposite circular shifts of X.'
]
keywordReview=[{'id':c['id'],'status':'reviewed','reason':keywordReasons[i]} for i,c in enumerate([c for c in keywords if c['subject']=='DGT302'])]
report={'subject':'DGT302','reviewedAt':'2026-11-09','scope':'All 298 question stems, all alternatives and current canonical keys independently read, plus 12 keyword cards. No application/progress files changed. Not a claim that every original screenshot is a reliable answer authority.','summary':{'questionCount':len(qs),'ledgerCount':len(ledger),'proposedQuestionEdits':len(changes),'newCanonicalKeyChanges':0,'essentialEdits':sum(v['severity']=='essential' for v in changes.values()),'ocrEdits':sum(v['severity']=='ocr' for v in changes.values())},'numericalChecks':checks,'references':REF,'ledger':ledger,'keywordReview':keywordReview}
(ROOT/'data/full-audit-DGT302.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['summary']));print('Changes: '+', '.join(changes));print('Direct checks: '+json.dumps(checks))
