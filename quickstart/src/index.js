'use strict';
const { isMobile } = require('./browser');
const { hmsActions } = require('./hms');
const joinRoom = require('./joinroom');
const micLevel = require('./miclevel');
const selectMedia = require('./selectmedia');
const selectRoom = require('./selectroom');
const showError = require('./showerror');

const $modals = $('#modals');
const $selectMicModal = $('#select-mic', $modals);
const $selectCameraModal = $('#select-camera', $modals);
const $showErrorModal = $('#show-error', $modals);
const $joinRoomModal = $('#join-room', $modals);


// On mobile browsers, there is the possibility of not getting any media even
// after the user has given permission, most likely due to some other app reserving
// the media device. So, we make sure users always test their media devices before
// joining the Room. For more best practices, please refer to the following guide:
// https://www.twilio.com/docs/video/build-js-video-application-recommendations-and-best-practices
const deviceIds = {
  audio: isMobile ? null : localStorage.getItem('audioDeviceId'),
  video: isMobile ? null : localStorage.getItem('videoDeviceId')
};

/**
 * Select your Room name, your screen name and join.
 * @param [error=null] - Error from the previous Room session, if any
 */
async function selectAndJoinRoom(error = null) {
  const formData = await selectRoom($joinRoomModal, error);
  if (!formData) {
    // User wants to change the camera and microphone.
    // So, show them the microphone selection modal.
    deviceIds.audio = null;
    deviceIds.video = null;
    return selectMicrophone();
  }
  const { identity } = formData;

  try {
    const token = localStorage.getItem('token');
    // config at the time of room join
    const hmsConfig = {
      userName: identity,
      authToken: token,
      settings: {
        isAudioMuted: true,
        isVideoMuted: false,
        videoDeviceId: deviceIds.video,
        audioInputDeviceId: deviceIds.audio,
      }
    }

    // Join the Room.
    await joinRoom(hmsConfig);

    // After the video session, display the room selection modal.
    return selectAndJoinRoom();
  } catch (error) {
    return selectAndJoinRoom(error);
  }
}

/**
 * Select your camera.
 */
async function selectCamera() {
  if (deviceIds.video === null) {
    try {
      deviceIds.video = await selectMedia('video', $selectCameraModal, async videoTrack => {
        const $video = $('video', $selectCameraModal);
        await hmsActions.attachVideo(videoTrack.id, $video.get(0));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectAndJoinRoom();
}

/**
 * Select your microphone.
 */
async function selectMicrophone() {
  if (deviceIds.audio === null) {
    try {
      deviceIds.audio = await selectMedia('audio', $selectMicModal, audioTrack => {
        const $levelIndicator = $('svg rect', $selectMicModal);
        const maxLevel = Number($levelIndicator.attr('height'));
        micLevel(audioTrack.id, level => $levelIndicator.attr('y', maxLevel - level));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectCamera();
}

async function preview() {
  // getting room Id from url
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');
  const role = urlParams.get('role');
  const response = await fetch(`/token?roomId=${roomId}&role=${role}`);
  const token = await response.text();

  // preview join config
  const hmsConfig = {
    userName: '',
    authToken: token,
  }

  await hmsActions.preview(hmsConfig);
  localStorage.setItem('token', token);
  await selectMicrophone();
}
// If the current browser is not supported by twilio-video.js, show an error
// message. Otherwise, start the application.
window.addEventListener('load', () => {
  // clear token
  localStorage.removeItem('token');
  preview();
});
