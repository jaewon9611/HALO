// sagas/chatSaga.js

import { takeEvery, call, put, all, fork } from 'redux-saga/effects';
import socket from '../socket'; // socket 객체 임포트 확인
import {
  SEND_MESSAGE_REQUEST,
  SEND_MESSAGE_SUCCESS, // 이 액션 타입 자체는 필요하지만, 여기서는 디스패치하지 않을 거야.
  SEND_MESSAGE_FAILURE,
  JOIN_ROOM_REQUEST,
  JOIN_ROOM_SUCCESS,
  JOIN_ROOM_FAILURE,
  EXIT_ROOM_REQUEST,
  EXIT_ROOM_SUCCESS,
  EXIT_ROOM_FAILURE,
} from '../reducers/chatReducer_JW';

// 메시지 전송 Saga
function* sendMessageSaga(action) {
  try {
    // ⭐ 중요: 서버로 메시지를 보내는 Socket.IO emit만 여기서 수행해.
    //    클라이언트의 로컬 log에 메시지를 추가하는 것은
    //    서버로부터 'receive_message' 이벤트가 왔을 때 pages/chat.js에서 처리할 거야.
    yield call([socket, 'emit'], 'send_message', action.payload);
    console.log('✅ Saga: 메시지 소켓 전송 요청 완료:', action.payload);

    // ⭐ 여기에 SEND_MESSAGE_SUCCESS를 put 하지 않아.
    //    이렇게 하면 클라이언트에서 메시지가 중복으로 추가되는 것을 방지할 수 있어.
    //    서버가 메시지를 처리하고 모든 클라이언트에게 'receive_message'를 보낼 때
    //    pages/chat.js에서 addLog 액션이 디스패치될 거야.

  } catch (error) {
    console.error('❌ Saga: 메시지 전송 실패:', error);
    yield put({ type: SEND_MESSAGE_FAILURE, error });
  }
}

// 채팅방 입장 Saga (변동 없음)
function* joinRoomSaga(action) {
  try {
    const { roomId, userId } = action.payload;
    yield call([socket, 'emit'], 'join_room', roomId, userId);
    console.log('✅ Saga: 채팅방 입장 소켓 전송 성공:', action.payload);
    yield put({ type: JOIN_ROOM_SUCCESS, data: action.payload });
  } catch (error) {
    console.error('❌ Saga: 채팅방 입장 실패:', error);
    yield put({ type: JOIN_ROOM_FAILURE, error });
  }
}

// 채팅방 나가기 Saga (변동 없음)
function* exitRoomSaga(action) {
  try {
    const { roomId, userId } = action.payload;
    yield call([socket, 'emit'], 'exit_room', { roomId, userId });
    console.log('✅ Saga: 채팅방 나가기 소켓 전송 성공:', action.payload);
    yield put({ type: EXIT_ROOM_SUCCESS, data: action.payload });
  } catch (error) {
    console.error('❌ Saga: 채팅방 나가기 실패:', error);
    yield put({ type: EXIT_ROOM_FAILURE, error });
  }
}

// 모든 watcher 통합 (변동 없음)
function* watchSendMessage() {
  yield takeEvery(SEND_MESSAGE_REQUEST, sendMessageSaga);
}

function* watchJoinRoom() {
  yield takeEvery(JOIN_ROOM_REQUEST, joinRoomSaga);
}

function* watchExitRoom() {
  yield takeEvery(EXIT_ROOM_REQUEST, exitRoomSaga);
}

// Root saga (변동 없음)
export default function* chatSaga() {
  yield all([
    fork(watchSendMessage),
    fork(watchJoinRoom),
    fork(watchExitRoom),
  ]);
}