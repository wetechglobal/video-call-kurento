import { notification } from 'antd';

const errorMessages = {
  // Common errors
  BrowserNetwork: 'Failed to connect to the server',
  InternalServer: 'An error occurred on the server, please try again later',
  Unknown: 'An error occurred, please try again later',
  Unauthenticated: 'You are logged out already, refresh the browser to continue',
  RequireAnonymous: 'You are logged in already, refresh the browser to continue',
  Unauthorized: 'You do not have permission to view this data',

  // File convert errors
  InvalidExtMP4: 'Not a video file',
  InvalidExtFLAC: 'Not an audio file',
  FileProcessing: 'The file is already being processed',
  AlreadyConverted: 'The file is already converted',
  InvalidFilename: 'The file is invalid or deleted',
  FileNotfound: 'The file is invalid or deleted',
  FileAlreadyExists: 'The new file name is already existed',
  InvalidFileCommand: 'Development error, key InvalidFileCommand',

  // Auth incorrect errors
  LoginIncorrect: 'Email or password is incorrect',
  ForgotTokenIncorrect: 'The recovery link you submit is invalid or expired',
  InvalidVerifyToken: 'The verify link you submit is invalid or expired',

  // Room errors
  RoomNotfound: 'The session id is invalid or deleted',
  ParticipantNotfound: 'The participant id is invalid or deleted',

  // User errors
  DuplicatedEmail: 'The email address is already existed',
  UserNotfound: 'The user id is invalid or deleted',
  CaseNotfound: 'The case id is invalid or deleted',
};

const getApolloErrorType = apolloErr => {
  const { networkError, graphQLErrors } = apolloErr;

  if (networkError) {
    return 'BrowserNetwork';
  }
  if (!graphQLErrors || !graphQLErrors.length) {
    return 'Unknown';
  }

  const { data } = graphQLErrors[0];
  if (!data || !data.type) {
    return 'Unknown';
  }
  return data.type;
};

const getErrorMessageFromType = errType => {
  if (errType in errorMessages) {
    return errorMessages[errType];
  }
  return errorMessages.Unknown;
};

const getApolloErrorMessage = apolloErr => {
  const errType = getApolloErrorType(apolloErr);
  return getErrorMessageFromType(errType);
};

const showApolloError = (apolloErr, key) =>
  notification.error({
    message: getApolloErrorMessage(apolloErr),
    duration: 0,
    key,
  });

const showErrorMessageByType = (errType, key) =>
  notification.error({
    message: getErrorMessageFromType(errType),
    duration: 0,
    key,
  });

const showInvalidFormError = key =>
  notification.error({
    message: 'Your provided data is invalid',
    key,
  });

export { showApolloError, showInvalidFormError, showErrorMessageByType };
