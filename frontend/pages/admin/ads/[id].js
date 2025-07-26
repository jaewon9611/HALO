import { useRouter } from 'next/router';
import AdvertisementDetail from '../../../components/AdvertisementDetail';

const AdPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div style={{ padding: '30px' }}>
      <h2>📢 광고 상세 보기</h2>
      {id ? <AdvertisementDetail adId={id} /> : <p>광고 ID를 불러오는 중...</p>}
    </div>
  );
};

export default AdPage;
