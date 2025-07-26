import { useState, useEffect, useRef, useCallback ,useMemo} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../components/AppLayout';
import ChatList from '../components/ChatList';
import SearchModal from '../components/SearchModal';
import ChatRoom from '../components/ChatRoom';
import axios from 'axios';
import { setChatRooms, sendMessage as sendMsg, setMe } from '../reducers/chatReducer_JW';
import {
  setSelectedUser,
  setMessage,
  clearLog,
  addLog,
  toggleSearchModal,
  setShowNewMsgAlert,
  exitRoom,
  updateChatRoomLastMessage,
} from '../reducers/chatReducer_JW';
import useRequireLogin from '../hooks/useRequireLogin';
import { wrapper } from '../store/configureStore';
import socket from '../socket';
import ChatStart from '../components/lottie/ChatStart';

export const getServerSideProps = wrapper.getServerSideProps(async (context) => {
  const cookie = context.req ? context.req.headers.cookie : '';
  axios.defaults.headers.Cookie = cookie || '';

  try {
    const chatRoomsResponse = await axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true });
    const userResponse = await axios.get('http://localhost:3065/api/user', { withCredentials: true });

    context.store.dispatch(setChatRooms(chatRoomsResponse.data));
    context.store.dispatch(setMe(userResponse.data));

    return { props: {} };
  } catch (error) {
    return { props: {} };
  }
});

const ChatPage = () => {
  useRequireLogin();
  const dispatch = useDispatch();
  const {
    me,
    selectedUser,
    message,
    log,
    showNewMsgAlert,
    showSearchModal,
    chatRooms,
  } = useSelector((state) => state.chat);

  const chatBoxRef = useRef();
  const [userMap, setUserMap] = useState({});
  const [selectedChatRoomId, setSelectedChatRoomId] = useState(null);

const skipAutoSelect = useRef(false);

const memoizedDataForSearch = useMemo(() => {
    return userMap && typeof userMap === 'object' ? Object.values(userMap) : [];
  }, [userMap]);

  const handleReadUpdate = useCallback((readMessageIdsRaw) => {
    const readMessageIds = Array.isArray(readMessageIdsRaw) ? readMessageIdsRaw : [readMessageIdsRaw];
    dispatch({ type: 'UPDATE_READ_STATUS', payload: { readMessageIds } });
  }, [dispatch]);

  const roomId = selectedUser && me && (me.id !== selectedUser.id)
    ? `chat-${[me.id, selectedUser.id].sort((a, b) => a - b).join('-')}`
    : null;

    useEffect(() => {
}, [selectedUser]);

  useEffect(() => {
    axios.get('http://localhost:3065/userSearch/all', { withCredentials: true })
      .then(res => {
        const map = {};
        res.data.forEach(user => {
          map[user.id] = {
            id: user.id,
            nickname: user.nickname,
            profileImage: user.profile_img,
          };
        });
        setUserMap(map);
      })
      .catch(err => {
      });
  }, []);

  const handleReceive = useCallback((data) => {
    dispatch(updateChatRoomLastMessage({
      roomId: data.roomId,
      lastMessage: data.content,
      lastTime: new Date(data.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      unreadCountDelta: (!selectedUser || roomId !== data.roomId) ? 1 : 0,
    }));

    if (!selectedUser || !roomId || data.roomId !== roomId) {
      dispatch(setShowNewMsgAlert(true));
      return;
    }

    const formattedMessage = {
      ...data,
      sender_id: data.sender_id,
      User: data.User,
      created_at: data.created_at,
      time: new Date(data.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      is_read: data.is_read,
    };
    dispatch(addLog(formattedMessage));
  }, [dispatch, roomId, selectedUser]);

 const handleExitSuccess = useCallback(() => {
  alert('채팅방을 나갔습니다.');
  dispatch(setSelectedUser(null));
  dispatch(clearLog());

  // 🚩 chatRooms 새로 갱신 추가
  axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
    .then((res) => {
      dispatch(setChatRooms(res.data));
    })
    .catch((err) => {
    });
}, [dispatch]);

  const handleExitFailed = useCallback((data) => {
    alert(`채팅방 나가기 실패: ${data.message || '알 수 없는 오류'}`);
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      if (me && me.id) {
        socket.emit('login', me.id);
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [me]);

  useEffect(() => {
}, [roomId]);

  useEffect(() => {
  if (!skipAutoSelect.current && !selectedUser && chatRooms.length > 0) { // ✅ 수정
    const firstRoom = chatRooms[0];
    const otherUser = firstRoom.otherUser || userMap[firstRoom.userId];
    if (otherUser) {
      dispatch(setSelectedUser(otherUser));
    }
  }
}, [selectedUser, chatRooms, userMap, dispatch, skipAutoSelect]);

  useEffect(() => {
    if (me && me.id && chatRooms.length === 0) {
      axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
        .then(res => {
          dispatch(setChatRooms(res.data));
        })
        .catch(err => {
        });
    }
  }, [dispatch, me, chatRooms.length]);

  useEffect(() => {
    socket.on('receive_message', handleReceive);
    socket.on('exit_room_success', handleExitSuccess);
    socket.on('exit_room_failed', handleExitFailed);
    socket.on('read_update', handleReadUpdate);

    const handleNewChatRoom = (data) => {
      axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
        .then((res) => {
          dispatch(setChatRooms(res.data));
        })
        .catch((err) => {
        });
    };

    socket.on('new_chat_room_created', handleNewChatRoom);

    const handleChatRoomClosed = (data) => {
      alert(data.message || '상대방이 채팅방을 나갔습니다. 채팅을 새로 시작해야 합니다.');
    };

    socket.on('chat_room_closed', handleChatRoomClosed);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('exit_room_success', handleExitSuccess);
      socket.off('exit_room_failed', handleExitFailed);
      socket.off('read_update', handleReadUpdate);
      socket.off('chat_room_closed', handleChatRoomClosed);
      socket.off('new_chat_room_created', handleNewChatRoom);
    };
  }, [handleReceive, handleExitSuccess, handleExitFailed, handleReadUpdate, dispatch, me]);

  const handleUserSelect = useCallback(async (user) => {
    skipAutoSelect.current = true;
    if (!me || user.id === me.id) {
      alert('본인과 채팅을 시작할 수 없습니다.');
      dispatch(setSelectedUser(null));
      dispatch(clearLog());
      dispatch(toggleSearchModal(false));
      return;
    }

    try {
      const res = await axios.post('http://localhost:3065/api/chat', {  
        targetUserId: user.id,
        allowCreate: true,
      }, { withCredentials: true });

      setSelectedChatRoomId(res.data.id);

      dispatch(updateChatRoomLastMessage({
        roomId: `chat-${[me.id, user.id].sort((a, b) => a - b).join('-')}`,
        lastMessage: '',
        lastTime: '',
        unreadCountDelta: -9999,
      }));

    // ✅ 차단 상태 요청 후
    const blockRes = await axios.get(`http://localhost:3065/block/status/${user.id}`, {
      withCredentials: true,
    });

    // ✅ 완전한 새 객체로 강제 설정
    const userCopy = JSON.parse(JSON.stringify(user));
    userCopy.isBlockedByMe = blockRes.data.isBlockedByMe;
    userCopy.isBlockingMe = blockRes.data.isBlockingMe;

    dispatch(setSelectedUser(userCopy)); // ✅ React가 감지할 수 있게

    
      dispatch(toggleSearchModal(false));
    } catch (error) {
      alert(error.response?.data || '채팅방 생성 중 오류가 발생했습니다.');
    }
  }, [dispatch, me]);

useEffect(() => {
  if (roomId && me && selectedUser && chatRooms.length > 0) {

    dispatch(clearLog());

    const sortedIds = [me.id, selectedUser.id].sort((a, b) => a - b);

    const existingRoom = chatRooms.find(room =>
      (room.user1_id === sortedIds[0] && room.user2_id === sortedIds[1])
    );

    if (existingRoom) {
      axios.get(`http://localhost:3065/api/chat/message/${roomId}`, { withCredentials: true })
        .then(getResponse => {
          getResponse.data.reverse().forEach(msg => dispatch(addLog(msg)));
          requestAnimationFrame(() => {
            if (chatBoxRef.current) {
              chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
            }
          });
          socket.emit('join_room', roomId, me.id);
        })
        .catch(error => {
        });

    } else {
      axios.post('http://localhost:3065/api/chat', { targetUserId: selectedUser.id, allowCreate: false }, { withCredentials: true })
        .then(postResponse => {
          return axios.get(`http://localhost:3065/api/chat/message/${roomId}`, { withCredentials: true });
        })
        .then(getResponse => {
          getResponse.data.reverse().forEach(msg => dispatch(addLog(msg)));
          requestAnimationFrame(() => {
            if (chatBoxRef.current) {
              chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
            }
          });
          socket.emit('join_room', roomId, me.id);
        })
        .catch(error => {
          if (error.response && error.response.status === 404) {
          } else {
            if (error.response) {
              alert(error.response.data || '채팅방 로드 중 오류가 발생했습니다.');
              dispatch(setSelectedUser(null));
              dispatch(clearLog());
            } else {
              alert('알 수 없는 오류가 발생했습니다.');
            }
          }
        });
    }
  }
}, [roomId, me, selectedUser, chatRooms.length, dispatch]);



  const isAtBottom = () => {
    const box = chatBoxRef.current;
    if (!box) return true;
    return box.scrollHeight - box.scrollTop - box.clientHeight < 100;
  };

  const handleScroll = () => {
    if (isAtBottom()) dispatch(setShowNewMsgAlert(false));
  };

  useEffect(() => {
    if (!chatBoxRef.current || log.length === 0) return;
    const lastMsg = log[log.length - 1];
    const wasAtBottom = isAtBottom();
    if (chatBoxRef.current && (lastMsg.senderId === me.id || wasAtBottom)) {
      requestAnimationFrame(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
      });
      dispatch(setShowNewMsgAlert(false));
    } else {
      dispatch(setShowNewMsgAlert(true));
    }
  }, [log, me, dispatch]);

  const handleSend = useCallback(() => {
    if (!message.trim() || !selectedUser || !me || !me.id) return;
    dispatch(sendMsg({ roomId, senderId: me.id, content: message }));
    dispatch(setMessage(''));
  }, [dispatch, message, selectedUser, roomId, me]);

  return (
    <AppLayout>
      <div style={{
        display: 'flex',
        padding: '20px',
        height: 'calc(100vh - 80px)',
        gap: '20px',
        boxSizing: 'border-box',
      }}>
                <ChatList
          chatRooms={chatRooms}
          onSelectUser={handleUserSelect}
        />

        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          position: 'relative',
        }}>
          {showSearchModal && (
            <SearchModal
              onUserSelect={handleUserSelect}
              onClose={() => dispatch(toggleSearchModal(false))}
              userMap={memoizedDataForSearch}
            />
          )}

          {selectedUser && roomId ? (  
            <div style={{ width: 600, margin: '80px auto 0' }}>
              <ChatRoom
              key={selectedUser.id}
                me={me}
                selectedUser={selectedUser}
                roomId={roomId}
                log={log}
                chatBoxRef={chatBoxRef}
                
                message={message}
                setMessage={(value) => dispatch(setMessage(value))}
                showNewMsgAlert={showNewMsgAlert}
                handleScroll={handleScroll}
                onExit={async () => {

                  let chatRoomIdToUse = selectedChatRoomId;

                  if (!chatRoomIdToUse) {

                    try {
                      const chatRoomRes = await axios.get(`http://localhost:3065/api/chat/my-rooms`, { withCredentials: true });
                      const chatRooms = chatRoomRes.data;

                      const parts = roomId.split('-');
                      if (parts.length === 3) {
                        const user1Id = parseInt(parts[1], 10);
                        const user2Id = parseInt(parts[2], 10);

                        const sortedUser1Id = Math.min(user1Id, user2Id);
                        const sortedUser2Id = Math.max(user1Id, user2Id);

                        const matchedRoom = chatRooms.find(room => {
                          if (!room?.roomId) return false;
                          const roomParts = room.roomId.split('-');
                          const rUser1Id = parseInt(roomParts[1], 10);
                          const rUser2Id = parseInt(roomParts[2], 10);

                          return (rUser1Id === sortedUser1Id && rUser2Id === sortedUser2Id);
                        });

                        if (matchedRoom) {
                          chatRoomIdToUse = matchedRoom.chatRoomId;
                        } else {
                          dispatch(setSelectedUser(null));
                          dispatch(clearLog());

                          axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
                            .then((res) => {
                              dispatch(setChatRooms(res.data));
                            })
                            .catch((err) => {
                            });

                          return;
                        }
                      }
                    } catch (err) {
                      dispatch(setSelectedUser(null));
                      dispatch(clearLog());
                      axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
                        .then((res) => {
                          dispatch(setChatRooms(res.data));
                        })
                        .catch((err) => {
                        });
                      return;
                    }
                  }

                  try {
                    await axios.patch(`http://localhost:3065/api/chat/${chatRoomIdToUse}/exit`, {}, { withCredentials: true });
                    dispatch(exitRoom({ roomId, userId: me.id }));
                      skipAutoSelect.current = true;
                     dispatch(setSelectedUser(null));
                    dispatch(clearLog());
                    
                  } catch (error) {


                   skipAutoSelect.current = true;
                    dispatch(setSelectedUser(null));
                    dispatch(clearLog());
                    axios.get('http://localhost:3065/api/chat/my-rooms', { withCredentials: true })
                      .then((res) => {
                        dispatch(setChatRooms(res.data));
                      })
                      .catch((err) => {
                      });
                  }
                }}
                onSendMessage={handleSend}
                userMap={userMap}
                onClose={() => {
                  skipAutoSelect.current = true; 
                  dispatch(setSelectedUser(null));
                  dispatch(clearLog());
                }}
                onReadUpdate={handleReadUpdate}
              />
            </div>
          ) : (
            <div style={{ margin: 'auto', position: 'relative', minHeight: 'calc(100vh - 120px)' }}>
              <h2
                style={{
                  cursor: 'pointer',
                  marginTop: '550px', 
                  zIndex: 10, 
                  position: 'relative' 
                }}
                onClick={() => {
                  skipAutoSelect.current = true; 
                  dispatch(setSelectedUser(null));
                  dispatch(clearLog());
                  dispatch(toggleSearchModal(true));
                }}
              >
                💬 채팅을 시작하세요
              </h2>
              <ChatStart />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatPage;
