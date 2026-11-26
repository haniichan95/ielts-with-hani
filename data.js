"use strict";

/* =============== STATIC REFERENCE DATA & DEFAULTS =============== */

window.HANI_DATA = {
  DEFAULT_BANDS: [
    { skill: "Listening", now: 6.5, target: 8.5 },
    { skill: "Reading", now: 7.5, target: 8.5 },
    { skill: "Writing", now: 7.0, target: 7.0 },
    { skill: "Speaking", now: 6.5, target: 7.0 }
  ],

  WEEK_DEFS: [
    { key: "listening", name: "Bài Listening", unit: "bài / tuần", hint: "Đếm theo số bài ghi ở tab Luyện đề" },
    { key: "reading", name: "Bài Reading", unit: "bài / tuần", hint: "Đếm theo số bài ghi ở tab Luyện đề" },
    { key: "writing", name: "Bài Writing chấm AI", unit: "bài / tuần", hint: "Đếm theo số bài đã chấm ở tab Writing AI" },
    { key: "speaking", name: "Chủ đề Speaking", unit: "chủ đề / tuần", hint: "Đếm theo số lần đánh dấu đã luyện xong" },
    { key: "vocab", name: "Từ vựng mới", unit: "từ / tuần", hint: "Đếm theo số từ thêm ở tab Từ vựng" }
  ],

  DAILY_DEFS: [
    { key: "minutes", name: "Thời gian học", unit: "phút / ngày", max: 600 },
    { key: "sections", name: "Section / passage luyện", unit: "phần / ngày", max: 20 },
    { key: "vocabReview", name: "Từ vựng ôn lại", unit: "từ / ngày", max: 200 }
  ],

  Q_TYPES: {
    Listening: [
      "Form / Note completion", "Table completion", "Sentence completion",
      "Summary completion", "Multiple choice", "Matching",
      "Map / Plan labelling", "Diagram labelling", "Short answer"
    ],
    Reading: [
      "True / False / Not Given", "Yes / No / Not Given", "Multiple choice",
      "Matching headings", "Matching information", "Matching features",
      "Sentence completion", "Summary completion", "Table / Flow-chart completion",
      "Diagram labelling", "Short answer"
    ]
  },

  ERRORS: {
    Listening: [
      "Spelling / chính tả", "Số ít – số nhiều", "Lỡ keyword vì nghe nhanh",
      "Bẫy đáp án (distractor)", "Mất tập trung / lạc chỗ", "Không nhận ra paraphrase",
      "Số, ngày, tên riêng", "Vượt giới hạn từ", "Chép đáp án nhầm vị trí",
      "Giọng nói chưa quen", "Map / diagram labelling", "Không kịp đọc trước câu hỏi",
      "Sai từ loại của đáp án"
    ],
    Reading: [
      "Nhầm False và Not Given", "Không nhận ra paraphrase", "Thiếu thời gian",
      "Không biết từ vựng", "Locate sai đoạn (skim / scan)", "Matching headings sai",
      "Bỏ sót từ giới hạn (all, some, only)", "Bẫy distractor", "Spelling / chính tả",
      "Vượt giới hạn từ", "Hiểu sai yêu cầu đề", "Suy luận ngoài văn bản",
      "Đọc lướt khi chọn MCQ"
    ]
  },

  TR_BANK: [
    { vi: "Ùn tắc giao thông vào giờ cao điểm khiến nhiều người đi làm đến muộn.", en: "Traffic congestion during rush hour makes many commuters late for work." },
    { vi: "Chính phủ nên đầu tư nhiều hơn vào giao thông công cộng để giảm khí thải.", en: "The government should invest more in public transport to reduce emissions." },
    { vi: "Sự phát triển của công nghệ đã thay đổi hoàn toàn cách chúng ta học ngoại ngữ.", en: "The development of technology has completely changed the way we learn foreign languages." },
    { vi: "Ô nhiễm môi trường là một trong những thách thức lớn nhất của thế kỷ này.", en: "Environmental pollution is one of the biggest challenges of this century." },
    { vi: "Đọc sách mỗi ngày giúp mở rộng vốn từ vựng một cách tự nhiên.", en: "Reading books every day helps expand your vocabulary in a natural way." }
  ],

  /* Fixed IELTS Writing Rubric (Task 1 & Task 2 official criteria checklists) */
  DEFAULT_FIXED_CRITERIA: {
    "Task 2": [
      {
        code: "TR",
        name: "Task Response",
        points: [
          { id: "t2-tr-1", text: "Trả lời đầy đủ mọi vế của đề bài (không sót câu hỏi phụ).", active: true },
          { id: "t2-tr-2", text: "Lập trường (position) rõ ràng ở mở bài, xuyên suốt thân bài và chốt lại ở kết bài.", active: true },
          { id: "t2-tr-3", text: "Ý chính được phát triển sâu bằng lập luận logic và ví dụ cụ thể, tránh nêu ý liệt kê.", active: true },
          { id: "t2-tr-4", text: "Độ dài đạt tối thiểu 250 từ (lý tưởng 270–310 từ).", active: true }
        ]
      },
      {
        code: "CC",
        name: "Coherence and Cohesion",
        points: [
          { id: "t2-cc-1", text: "Bố cục 4 đoạn rõ ràng; mỗi thân bài xoay quanh 1 central topic duy nhất.", active: true },
          { id: "t2-cc-2", text: "Câu chủ đề (topic sentence) mở đầu mỗi đoạn thân bài mạch lạc.", active: true },
          { id: "t2-cc-3", text: "Từ nối đa dạng, tự nhiên — không lạm dụng Firstly/Secondly/Moreover ở mọi câu.", active: true },
          { id: "t2-cc-4", text: "Dùng phép quy chiếu (this, these, such, it, they) chính xác để liên kết câu.", active: true }
        ]
      },
      {
        code: "LR",
        name: "Lexical Resource",
        points: [
          { id: "t2-lr-1", text: "Paraphrase đề bài tự nhiên, không lặp lại nguyên cụm từ khóa quá nhiều lần.", active: true },
          { id: "t2-lr-2", text: "Sử dụng collocations học thuật chính xác theo ngữ cảnh (tránh ghép từ gượng ép).", active: true },
          { id: "t2-lr-3", text: "Văn phong trang trọng (formal), tránh từ viết tắt (don't/can't) và từ khẩu ngữ.", active: true },
          { id: "t2-lr-4", text: "Chính tả và dạng từ (noun/verb/adj/adv) chính xác.", active: true }
        ]
      },
      {
        code: "GRA",
        name: "Grammatical Range and Accuracy",
        points: [
          { id: "t2-gra-1", text: "Kết hợp linh hoạt câu đơn, câu ghép và câu phức (quan hệ, điều kiện, nhượng bộ, bị động).", active: true },
          { id: "t2-gra-2", text: "Kiểm soát tốt mạo từ (a/an/the), danh từ đếm được số ít/số nhiều và hòa hợp chủ-vị.", active: true },
          { id: "t2-gra-3", text: "Không mắc lỗi run-on sentences (nối 2 mệnh đề độc lập bằng dấu phẩy) hoặc câu cụt.", active: true },
          { id: "t2-gra-4", text: "Dùng thì động từ và dấu câu chính xác.", active: true }
        ]
      }
    ],
    "Task 1": [
      {
        code: "TA",
        name: "Task Achievement",
        points: [
          { id: "t1-ta-1", text: "Có đoạn Overview nêu rõ 2–3 xu hướng/điểm nổi bật nhất (không đưa số liệu chi tiết vào Overview).", active: true },
          { id: "t1-ta-2", text: "Chọn lọc và so sánh số liệu tiêu biểu (cao nhất, thấp nhất, thay đổi mạnh nhất), không liệt kê máy móc.", active: true },
          { id: "t1-ta-3", text: "Mô tả đúng dữ liệu/quy trình/bản đồ, tuyệt đối không suy diễn nguyên nhân ngoài biểu đồ.", active: true },
          { id: "t1-ta-4", text: "Độ dài đạt tối thiểu 150 từ (lý tưởng 165–190 từ).", active: true }
        ]
      },
      {
        code: "CC",
        name: "Coherence and Cohesion",
        points: [
          { id: "t1-cc-1", text: "Nhóm dữ liệu thông minh thành 2 đoạn Body theo logic thời gian hoặc hạng mục.", active: true },
          { id: "t1-cc-2", text: "Chuyển tiếp mượt mà giữa các số liệu và đoạn (In contrast, Meanwhile, Turning to...).", active: true },
          { id: "t1-cc-3", text: "Dùng từ thay thế/quy chiếu rõ ràng (the former, the latter, this figure, respectively).", active: true }
        ]
      },
      {
        code: "LR",
        name: "Lexical Resource",
        points: [
          { id: "t1-lr-1", text: "Đa dạng động từ/danh từ/trạng từ mô tả xu hướng (increase/surge/plateau) và mức độ.", active: true },
          { id: "t1-lr-2", text: "Diễn đạt tỷ lệ, số lượng linh hoạt (a fifth, roughly a quarter, threefold, account for).", active: true },
          { id: "t1-lr-3", text: "Không lặp cụm 'the percentage of' hay 'the number of' liên tục.", active: true }
        ]
      },
      {
        code: "GRA",
        name: "Grammatical Range and Accuracy",
        points: [
          { id: "t1-gra-1", text: "Chia đúng thì quá khứ / hiện tại / tương lai theo mốc thời gian của biểu đồ.", active: true },
          { id: "t1-gra-2", text: "Đa dạng cấu trúc so sánh (hơn, nhất, gấp đôi, whereas/while, followed by, compared to).", active: true },
          { id: "t1-gra-3", text: "Dùng chính xác giới từ đi với số liệu (rise by vs. rise to, at 20%, from...to...).", active: true }
        ]
      }
    ]
  },

  /* Optional starter suggestions the user can import with 1 click if desired */
  SAMPLE_TEACHER_FEEDBACK: [
    {
      title: "Hay thiếu mạo từ (a/an/the) trước danh từ đếm được số ít",
      criterion: "GRA",
      priority: "high",
      taskScope: "both",
      example: "VD: 'Government should solve problem' → 'The government should solve this problem'",
      active: true
    },
    {
      title: "Lạm dụng từ nối đầu câu (Firstly, Secondly, Moreover, In conclusion)",
      criterion: "CC",
      priority: "high",
      taskScope: "Task 2",
      example: "Nên thay bằng referencing hoặc cấu trúc câu nối tự nhiên hơn.",
      active: true
    },
    {
      title: "Ý thân bài còn chung chung, thiếu giải thích nguyên nhân - hệ quả",
      criterion: "TR/TA",
      priority: "high",
      taskScope: "Task 2",
      example: "Mỗi luận điểm cần đủ: Topic -> Explain (Why/How) -> Example/Result.",
      active: true
    },
    {
      title: "Sửa lỗi lặp từ khóa của đề bài (paraphrase chưa linh hoạt)",
      criterion: "LR",
      priority: "normal",
      taskScope: "both",
      example: "Đổi dạng từ hoặc dùng cụm đồng nghĩa học thuật phù hợp ngữ cảnh.",
      active: true
    },
    {
      title: "Overview Task 1 bị thiếu so sánh nhóm cao nhất / thấp nhất",
      criterion: "TR/TA",
      priority: "high",
      taskScope: "Task 1",
      example: "Overview cần nêu xu hướng chính VÀ đối tượng nổi bật nhất.",
      active: true
    }
  ]
};
