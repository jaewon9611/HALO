// front/pages/chat-users.js
import { useRouter } from 'next/router';
import { useState } from 'react';

const users = ['율비', '인', '재원', '윤기','준혁','경미']; 

const ChatUsers = () => {
  const router = useRouter();
  const [myName, setMyName] = useState('');

  const enterRoom = (username) => {
    if (!myName.trim()) return alert('내 닉네임을 입력하세요!');
    router.push(`/chat?user=${username}&me=${myName}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>💬 채팅 상대 선택</h2>
      <input
        value={myName}
        onChange={(e) => setMyName(e.target.value)}
        placeholder="내 닉네임 입력"
        style={{ marginBottom: 10 }}
      />
      <ul>
        {users.map((u, idx) => (
          <li key={idx}>
            <button onClick={() => enterRoom(u)}>{u}와 채팅하기</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatUsers;
