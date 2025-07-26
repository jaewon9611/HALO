console.log('Weather Router file loaded!');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment-timezone'); 


const KMA_API_KEY = process.env.KMA_API_KEY;


const gridMap = {
    "sk": { nx: 54, ny: 124, name: "문학 야구장" }, 
    "lg": { nx: 62, ny: 126, name: "잠실 야구장" }, 
    "kiwoom": { nx: 58, ny: 125, name: "고척 스카이돔" },
    "samsung": { nx: 89, ny: 90, name: "대구 삼성 라이온즈 파크" },
    "lotte": { nx: 98, ny: 76, name: "부산 사직 야구장" },
    "nc": { nx: 91, ny: 77, name: "창원 NC 파크" },
    "kt": { nx: 61, ny: 121, name: "수원 KT 위즈 파크" },
    "hanwha": { nx: 67, ny: 100, name: "대전 한화생명 이글스파크" },
    "kia": { nx: 58, ny: 74, name: "광주 기아 챔피언스 필드" },
    "lg": { nx: 62, ny: 126, name: "잠실 야구장" }, 
};


router.get('/:stadium', async (req, res, next) => {
  try {
    const stadiumKey = req.params.stadium.toLowerCase(); 

    if (!gridMap.hasOwnProperty(stadiumKey)) {
      return res.status(404).json({ error: '요청한 구장 정보가 없습니다.' });
    }

    const { nx, ny, name: stadiumName } = gridMap[stadiumKey]; 

    if (!KMA_API_KEY) {
        return res.status(500).json({ message: '기상청 API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });
    }

    const baseDate = moment().tz("Asia/Seoul").format('YYYYMMDD');
    const baseTime = moment().tz("Asia/Seoul").subtract(40, 'minutes').format('HHmm'); 

    const apiUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
    
    const params = {
      serviceKey: decodeURIComponent(KMA_API_KEY), 
      pageNo: '1',
      numOfRows: '10', 
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx,
      ny: ny,
    };

    console.log(`[${stadiumName}] 기상청 API 요청 URL:`, apiUrl);
    console.log(`[${stadiumName}] 요청 파라미터:`, params);

    const response = await axios.get(apiUrl, { params });
    
    const resultCode = response.data.response.header.resultCode;
    if (resultCode !== '00') {
      console.error('기상청 API 에러 응답:', response.data.response.header.resultMsg);
      if (resultCode === '03') { 
        return res.status(200).json({ 
          stadium: stadiumName,
          temperature: 'N/A',
          humidity: 'N/A',
          wind: 'N/A',
          weatherStatus: '데이터 없음',
          weatherIcon: ''
        });
      }
      return res.status(500).json({ 
        message: '날씨 정보를 가져오는 데 실패했습니다.', 
        code: resultCode,
        description: response.data.response.header.resultMsg
      });
    }

    const weatherItems = response.data.response.body.items.item;

    if (!weatherItems || weatherItems.length === 0) {
        return res.status(404).json({ message: '해당 시간의 날씨 정보를 찾을 수 없습니다.' });
    }

    let temperature = 'N/A';
    let humidity = 'N/A';
    let wind = 'N/A';
    let ptyValue = '0'; 
    let skyValue = '1'; 

    weatherItems.forEach(item => {
        switch (item.category) {
            case 'T1H': 
                temperature = `${item.obsrValue}℃`;
                break;
            case 'REH': 
                humidity = `${item.obsrValue}%`;
                break;
            case 'WSD': 
                wind = `${item.obsrValue}m/s`;
                break;
            case 'PTY':
                ptyValue = item.obsrValue;
                break;
            case 'SKY': 
                skyValue = item.obsrValue;
                break;
        }
    });

    let weatherStatus = '정보 없음';
    let weatherIcon = ''; 


    switch (ptyValue) {
        case "0": 
            switch (skyValue) {
                case "1":
                    weatherStatus = "맑음";
                    weatherIcon = "sunny_loop2.gif";
                    break;
                case "3":
                    weatherStatus = "구름많음";
                    weatherIcon = "cloudy_loop.gif"; 
                    break;
                case "4":
                    weatherStatus = "흐림";
                    weatherIcon = "overcast_loop.gif"; 
                    break;
                default:
                    weatherStatus = "맑음";
                    weatherIcon = "sunny_loop2.gif";
            }
            break;
        case "1":
            weatherStatus = "비";
            weatherIcon = "rain_loop2.gif";
            break;
        case "2":
            weatherStatus = "비/눈";
            weatherIcon = "rain_snow_loop2.gif";
            break;
        case "3":
            weatherStatus = "눈";
            weatherIcon = "snow_loop2.gif";
            break;
        case "5":
            weatherStatus = "이슬비";
            weatherIcon = "rain_loop2.gif";
            break;
        case "6":
            weatherStatus = "이슬비/눈날림";
            weatherIcon = "rain_snow_loop2.gif";
            break;
        case "7": 
            weatherStatus = "눈날림";
            weatherIcon = "snow_loop2.gif";
            break;
        default:
            weatherStatus = "정보 없음";
            weatherIcon = "";
            break;
    }


    res.status(200).json({
      stadium: stadiumName, 
      temperature: temperature,
      humidity: humidity,
      wind: wind,
      weatherStatus: weatherStatus,
      weatherIcon: weatherIcon,
    });

  } catch (error) {
    console.error('날씨 정보를 가져오는 중 에러 발생:', error.message);
    if (error.response) {
      console.error('기상청 API 응답 에러 데이터:', error.response.data);
    }
    next(error);
  }
});

module.exports = router;