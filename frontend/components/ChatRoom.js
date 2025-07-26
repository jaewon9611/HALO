import React, { useEffect, useCallback ,useState } from 'react';
import socket from '../socket';
import ReportModal from './ReportModal';   
import ReportButton from './ReportButton'; 

const ChatRoom = ({
  me,
  selectedUser,
  roomId,
  log,
  chatBoxRef,
  message,
  setMessage,
  showNewMsgAlert,
  handleScroll,
  onExit,
  onSendMessage,
  userMap,
  onClose,
  onReadUpdate,
}) => {

  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
const [isBlockingMe, setIsBlockingMe] = useState(false);
useEffect(() => {
  const fetchBlockStatus = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`http://localhost:3065/block/status/${selectedUser.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setIsBlockedByMe(data.isBlockedByMe);
      setIsBlockingMe(data.isBlockingMe);
    } catch (err) {
      console.error('차단 상태 가져오기 실패:', err);
    }
  };

  fetchBlockStatus();
}, [selectedUser]);



const API_URL = 'http://localhost:3065';
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const handleChatRoomClosed = (data) => {
      console.log('💥 chat_room_closed 수신:', data);
      alert(data.message || '상대방이 채팅방을 나갔습니다. 채팅을 새로 시작해야 합니다.');
    };

    socket.on('chat_room_closed', handleChatRoomClosed);

    return () => {
      socket.off('chat_room_closed', handleChatRoomClosed);
    };
  }, [roomId]);

  useEffect(() => {
    const handleReadUpdate = (data) => {
      console.log('✅ read_update 수신:', data);

      const { roomId: updateRoomId, readMessageIds } = data;

      // 현재 ChatRoom의 roomId 와 일치할 때만 업데이트
      if (updateRoomId === roomId && onReadUpdate) {
        onReadUpdate(readMessageIds);
      }
    };

    socket.on('read_update', handleReadUpdate);

    return () => {
      socket.off('read_update', handleReadUpdate);
    };
  }, [roomId, onReadUpdate]);

  useEffect(() => {
    if (roomId) {
      socket.emit('join_room', roomId);
      console.log(`🔗 join_room emit: ${roomId}`);
      socket.emit('mark_as_read', roomId);
    console.log('✅ mark_as_read emit:', roomId);
    }
    return () => {
      if (roomId) {
        socket.emit('leave_room', me.id);
        console.log(`🚪 leave_room emit: ${roomId}`);
      }
    };
  }, [roomId]);

  useEffect(() => {
  const handleReceiveMessage = (message) => {
    console.log('📩 receive_message 수신:', message);

    // 현재 ChatRoom의 메시지라면 → mark_as_read emit 다시 보내기
    if (message.roomId === roomId) {
      console.log('✅ 현재 ChatRoom에서 새 메시지 수신 → mark_as_read emit:', roomId);
      socket.emit('mark_as_read', roomId);
    }
  };

  socket.on('receive_message', handleReceiveMessage);

  return () => {
    socket.off('receive_message', handleReceiveMessage);
  };
}, [roomId]);


  const handleExitConfirm = () => {
    const confirmExit = window.confirm('채팅방을 나가시면 메세지기록이 모두 삭제됩니다. 정말 나가시겠습니까?');
    if (confirmExit) {
      onExit();
    }

  };

  return (
    <div className="chat-room-container">
      {/* 상단 타이틀 */}

<h2 className="chat-room-header">
  <span>💬 {selectedUser.nickname}님과의 채팅</span>

  <div className="chat-room-header-buttons">
    <button className="chat-close-button" onClick={() => {
      socket.emit('leave_room', me.id);
      onClose();
    }}>
      닫기
    </button>

    <button className="chat-menu-button" onClick={() => setShowReportMenu(prev => !prev)}>
      ...
    </button>

          {/* 신고 드롭다운 메뉴 */}

    {showReportMenu && (
      <div className="report-menu-dropdown">
        <ReportButton onClick={() => {
          setShowReportModal(true);
          setShowReportMenu(false);
        }} />
      </div>
          )}
        </div>
      </h2>


      {/* 메시지 목록 */}

      <div
        id="chat-box"
        ref={chatBoxRef}
        onScroll={handleScroll}
        className="chat-box"
      >
        {log.map((msg, idx) => {
          console.log('msg.id:', msg.id, typeof msg.id, 'msg.is_read:', msg.is_read);
          console.log('렌더링 시 메시지:', msg);
          const isMine = msg.sender_id === me.id || msg.senderId === me.id;
          const sender = msg.User;

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
              {!isMine && sender && (
                <img
  src={sender?.profile_img ? `${API_URL}${sender.profile_img}` : '/default.png'}
  alt="프로필"
  style={{
    width: 32,
    height: 32,
    borderRadius: '50%',
    marginRight: 8,
    marginLeft: 4,
  }}
/>
              )}

              <div style={{ maxWidth: '70%' }}>
                {!isMine && sender && (
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>
                    {sender.nickname}
                  </div>
                )}

                {/* 여기 수정된 부분 */}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  gap: 6 // 말풍선과 숫자 간격
                }}>
                  {/* 숫자 먼저 표시 (왼쪽) */}

                  {isMine && (msg.is_read === 0 || msg.is_read === false) && (
                    <div style={{ fontSize: 10, color: 'red', marginTop: 4 }}>
                      1
                    </div>
                  )}

                  {/* 말풍선 */}

                  <div
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: isMine ? '#d1f0ff' : '#f2f2f2',
                      color: '#000',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* 시간 */}

                <div
                  style={{
                    fontSize: 11,
                    color: '#999',
                    marginTop: 2,
                    background: isMine ? '#d1f0ff' : '#f2f2f2',
                    textAlign: isMine ? 'left' : 'right',
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 새 메시지 알림 */}

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
          }}
        >
          🔽 새 메시지 도착
        </div>
      )}

     {/* 메시지 입력 */}

{isBlockedByMe ? (
  <div className="chat-blocked-message">
    ⚠️ 차단한 유저입니다. 메시지를 보낼 수 없습니다.
  </div>
) : (
  <div className="chat-input-container">
    <input
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter' && !isBlockingMe) {
          onSendMessage();
        }
      }}
      placeholder="메시지를 입력하세요"
      disabled={isBlockingMe}
      className={`chat-input ${isBlockingMe ? 'blocked' : ''}`}
    />
    <button
      onClick={onSendMessage}
      disabled={isBlockingMe}
      className={`chat-send-button ${isBlockingMe ? 'blocked' : ''}`}
    >
      {isBlockingMe ? '전송 불가' : '전송'}
    </button>
  </div>
)}

{isBlockingMe && !isBlockedByMe && (
  <div className="chat-blocked-alert">
    ⚠️ 메시지를 보낼 수 없습니다.
  </div>
)}


      {/* 나가기 버튼 */}

      <div style={{ marginTop: '16px', textAlign: 'right' }}>
  <button
    onClick={handleExitConfirm}
    className="chat-exit-button"
  >
    나가기
  </button>
</div>
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={selectedUser.id}
        targetType={"7"}
      />
    </div>
  );
};

export default ChatRoom;