// 1. advertisementImageRouter import 추가
const advertisementImageRouter = require('./routes/advertisementImage');

// 2. attackDetector보다 위에서 먼저 등록
app.use('/api/advertisement', advertisementImageRouter); // ✅ 이미지 업로드 예외 처리

// 3. 그 다음에 공격 탐지 실행
app.use(attackDetector);

// 4. 나머지 광고 라우터는 그대로
app.use('/api/advertisement', advertisementRouter); // ✅ 광고 CRUD는 감시됨
