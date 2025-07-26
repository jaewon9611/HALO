import React from 'react';
import Lottie from 'lottie-react';
import ChatStartLottie from '../../public/lottie/Chat_Start.json';

const ChatStart = () => {
  console.log('ChatStart 컴포넌트 렌더링 시도...');
  console.log('Lottie 컴포넌트 렌더링 (import 방식).');

  return (
    <div style={{
        position: 'absolute',
        top: '47%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1, 
        opacity: 1, 
        pointerEvents: 'none',
         width: '600px',
         height: '600px',
    }}>

      <Lottie
        animationData={ChatStartLottie}
        loop={true}
        autoplay={true}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default ChatStart;