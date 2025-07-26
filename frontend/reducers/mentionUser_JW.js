export const initialState = {
  mentionUserMap: {}, // nickname → user_id 매핑 저장
  loadMentionUsersLoading: false,
  loadMentionUsersDone: false,
  loadMentionUsersError: null,
};

export const LOAD_MENTION_USERS_REQUEST = 'LOAD_MENTION_USERS_REQUEST';
export const LOAD_MENTION_USERS_SUCCESS = 'LOAD_MENTION_USERS_SUCCESS';
export const LOAD_MENTION_USERS_FAILURE = 'LOAD_MENTION_USERS_FAILURE';

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_MENTION_USERS_REQUEST:
      return {
        ...state,
        loadMentionUsersLoading: true,
        loadMentionUsersDone: false,
        loadMentionUsersError: null,
      };
    case LOAD_MENTION_USERS_SUCCESS:
      // data: [{ nickname, user_id }]
      const map = {};
      action.data.forEach((user) => {
        map[user.nickname] = user.user_id;
      });
      return {
        ...state,
        loadMentionUsersLoading: false,
        loadMentionUsersDone: true,
        mentionUserMap: map,
      };
    case LOAD_MENTION_USERS_FAILURE:
      return {
        ...state,
        loadMentionUsersLoading: false,
        loadMentionUsersError: action.error,
      };
    default:
      return state;
  }
};

export default reducer;