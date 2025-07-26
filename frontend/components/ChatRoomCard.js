import React from 'react';
import { useDispatch } from 'react-redux';
import { setShowNewMsgAlert } from '../reducers/chatReducer_JW';

const ChatRoomCard = ({
  me,
  selectedUser,
  message,
  log,
  userMap,
  chatBoxRef,
  roomId,
  showNewMsgAlert,
  onClose,
  onExit,
  onChangeMessage,
  onSend,
  onScroll,
}) => {
  const dispatch = useDispatch(); 

  return (
    <div
      style={{
        width: '600px',
        border: '1px solid #ddd',
        borderRadius: '12px',
        background: '#fff',
        padding: 20,
        marginLeft: 'auto',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>💬 {selectedUser.nickname}와의 채팅 (내 ID: {me})</span>
        <div>
          <button onClick={onClose} style={btnStyle}>닫기</button>
          <button onClick={onExit} style={{ ...btnStyle, marginLeft: 8 }}>나가기</button>
        </div>
      </div>


      <div
        ref={chatBoxRef}
        onScroll={onScroll}
        style={{
          border: '1px solid #ccc',
          padding: 10,
          height: 300,
          overflowY: 'scroll',
          margin: '12px 0',
        }}
      >
        {log.map((msg, idx) => {
          const isMine = msg.senderId === me;
          const sender = userMap[msg.senderId];
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                margin: '6px 0',
              }}
            >
              {!isMine && (
                <img
                  src={sender.profileImage}
                  alt="상대 프로필"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    marginRight: 8,
                  }}
                />
              )}
              <div style={{ maxWidth: '70%' }}>
                {!isMine && (
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{sender.nickname}</div>
                )}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: isMine ? '#d1f0ff' : '#f2f2f2',
                  }}
                >
                  {msg.content}
                </div>
                <div style={{ fontSize: 11, textAlign: isMine ? 'right' : 'left' }}>
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showNewMsgAlert && (
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '12px',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={() => {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
            dispatch(setShowNewMsgAlert(false));
          }}
        >
          🔽 새 메시지 도착
        </div>
      )}

      <div style={{ display: 'flex' }}>
        <input
          value={message}
          onChange={(e) => onChangeMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') onSend();
          }}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, padding: '8px' }}
        />
        <button onClick={onSend} style={{ padding: '8px 16px', marginLeft: 8 }}>전송</button>
      </div>
    </div>
  );
};

const btnStyle = {
  padding: '4px 10px',
  background: '#eee',
  border: '1px solid #ccc',
  borderRadius: '6px',
  cursor: 'pointer',
};

export default ChatRoomCard;
