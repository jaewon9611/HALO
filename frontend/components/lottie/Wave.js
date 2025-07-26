// frontend/components/lottie/Wave.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Lottie from 'lottie-react';
import waveAnimationData from '../../public/lottie/wave.json';

const Wave = ({ isHovered }) => {
  const lottieRef = useRef(null);
  const animationLoadedRef = useRef(false);

  const lottieOptions = {
      animationData: waveAnimationData,
      loop: false,
      autoplay: false,
  };

  useEffect(() => {
    console.log('✨ Wave 컴포넌트: (초기 마운트) lottieRef.current:', lottieRef.current);
  }, []);

  const handleLottieDOMLoaded = useCallback(() => {
    console.log('🎉 Wave 컴포넌트: Lottie 애니메이션 데이터 DOM 로드 완료!');
    console.log('디버그: handleLottieDOMLoaded 내부 lottieRef.current:', lottieRef.current);

    if (lottieRef.current) {
        animationLoadedRef.current = true;
        console.log('🟢🟢 Wave 컴포넌트: animationLoadedRef.current 이제 true!');

        const currentLottieInstance = lottieRef.current;
        const totalFrames = lottieOptions.animationData.op;

        if (isHovered) {
          currentLottieInstance.setDirection(1);
          currentLottieInstance.playSegments([0, totalFrames], true);
          console.log('Wave 컴포넌트: (DOMLoaded 시점) isHovered=true, 정방향 재생 (전체 프레임).');
        } else {
          currentLottieInstance.goToAndStop(0, true);
          console.log('Wave 컴포넌트: (DOMLoaded 시점) isHovered=false, 0프레임으로 정지.');
        }

    } else {
        console.log('🚨🚨 Wave 컴포넌트: handleLottieDOMLoaded 시점에 lottieRef.current가 아직 없음!');
    }
  }, [isHovered, lottieOptions]);

  useEffect(() => {
    console.log('Wave 컴포넌트: isHovered 값 변경 감지 ->', isHovered);

    if (lottieRef.current && animationLoadedRef.current) {
        console.log('🚀 Wave 컴포넌트: Lottie 애니메이션 제어 준비 완료! isHovered:', isHovered);

      const currentLottieInstance = lottieRef.current;
      const totalFrames = lottieOptions.animationData.op;

      if (isHovered) {
            currentLottieInstance.setDirection(1);
            currentLottieInstance.playSegments([0, totalFrames], true);
              console.log('Wave 컴포넌트: Lottie 정방향 재생 명령 (전체 프레임).');
      } else {
        const currentFrame = currentLottieInstance.currentFrame || 0;
        currentLottieInstance.setDirection(-1);
        currentLottieInstance.playSegments([0, currentFrame], true);
              console.log('Wave 컴포넌트: Lottie 역방향 재생 명령.');
      }
    } else {
            console.log('🚫 Wave 컴포넌트: Lottie 제어 조건 미충족. (lottieRef.current:', lottieRef.current ? '존재' : '없음', ', animationLoadedRef.current:', animationLoadedRef.current, ') isHovered:', isHovered);
        }
  }, [isHovered, animationLoadedRef.current]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      borderRadius: '8px',
      backgroundColor: 'transparent',
    }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={lottieOptions.animationData}
        loop={lottieOptions.loop}
        autoplay={lottieOptions.autoplay}
        onDOMLoaded={handleLottieDOMLoaded}
        style={{
          width: '100%',
          height: '100%',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        rendererSettings={{
          // preserveAspectRatio: 'xMidYMid slice' // 👈 기존 이 부분
          preserveAspectRatio: 'xMidYMax slice' // 👈 이 값으로 변경! (Y축 아래 정렬)
        }}
      />
    </div>
  );
};

export default Wave;