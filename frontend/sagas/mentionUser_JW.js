// sagas/mentionUser_JW.js
import { all, call, fork, put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';
import {
  LOAD_MENTION_USERS_REQUEST,
  LOAD_MENTION_USERS_SUCCESS,
  LOAD_MENTION_USERS_FAILURE,
} from '../reducers/mentionUser_JW';

function loadMentionUsersAPI() {
  return axios.get('/mention-users'); // 우리가 만든 API
}

function* loadMentionUsers() {
  try {
    const result = yield call(loadMentionUsersAPI);
    console.log('mentionUserSaga result:', result.data);
    yield put({
      type: LOAD_MENTION_USERS_SUCCESS,
      data: result.data, // [{nickname, user_id}]
    });
  } catch (err) {
    console.error(err);
    yield put({
      type: LOAD_MENTION_USERS_FAILURE,
      error: err.response ? err.response.data : err.message,
    });
  }
}

function* watchLoadMentionUsers() {
  yield takeLatest(LOAD_MENTION_USERS_REQUEST, loadMentionUsers);
}

export default function* mentionUserSaga() {
  yield all([
    fork(watchLoadMentionUsers),
  ]);
}
