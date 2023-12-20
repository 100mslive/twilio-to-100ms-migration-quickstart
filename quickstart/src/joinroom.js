'use strict';

const { hmsActions, hmsStore, hmsNotifications } = require('./hms');

const { selectLocalPeer, HMSNotificationTypes, selectRoomState, HMSRoomState, selectRemotePeers, selectVideoTrackByPeerID, selectPeerByID } = require('@100mslive/hms-video-store');
const { isMobile } = require('./browser');

const $leave = $('#leave-room');
const $room = $('#room');
const $activeParticipant = $('div#active-participant > div.participant.main', $room);
const $activeVideo = $('video', $activeParticipant);
const $participants = $('div#participants', $room);

// The current active Participant in the Room.
let activeParticipant = null;

// Whether the user has selected the active Participant by clicking on
// one of the video thumbnails.
let isActiveParticipantPinned = false;

/**
 * Set the active Participant's video.
 * @param participant - the active Participant
 */
function setActiveParticipant(participant) {
  if (activeParticipant) {
    const $activeParticipant = $(`div#${activeParticipant.id}`, $participants);
    $activeParticipant.removeClass('active');
    $activeParticipant.removeClass('pinned');

    // Detach any existing VideoTrack of the active Participant.
    if (activeParticipant.videoTrack) {
      hmsActions.detachVideo(activeParticipant.videoTrack, $activeVideo.get(0));
      $activeVideo.css('opacity', '0');
    }
  }

  // Set the new active Participant.
  activeParticipant = participant;
  const { name, id } = participant;
  const $participant = $(`div#${id}`, $participants);

  $participant.addClass('active');
  if (isActiveParticipantPinned) {
    $participant.addClass('pinned');
  }

  // Attach the new active Participant's video.
  if (participant.videoTrack) {
    hmsActions.attachVideo(participant.videoTrack, $activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }

  // Set the new active Participant's identity
  $activeParticipant.attr('data-identity', name);
}

/**
 * Set the current active Participant in the Room.
 * @param room - the Room which contains the current active Participant
 */
function setCurrentActiveParticipant(participant) {
  setActiveParticipant(participant);
}

/**
 * Set up the Participant's media container.
 * @param participant - the Participant whose media container is to be set up
 * @param room - the Room that the Participant joined
 */
function setupParticipantContainer(participant) {
  const { name, id } = participant;

  // Add a container for the Participant's media.
  const $container = $(`<div class="participant" data-identity="${name}" id="${id}">
    <video autoplay muted playsinline style="opacity: 0"></video>
  </div>`);

  // Toggle the pinning of the active Participant's video.
  $container.on('click', () => {
    if (activeParticipant.id === participant.id && isActiveParticipantPinned) {
      isActiveParticipantPinned = false;
      setCurrentActiveParticipant(participant);
    } else {
      isActiveParticipantPinned = true;
      setActiveParticipant(participant);
    }
  });
  // Add the Participant's container to the DOM.
  $participants.append($container);
  const $videoEle = $(`div#${id} > video`, $participants);
  hmsActions.attachVideo(participant.videoTrack, $videoEle.get(0));
  $videoEle.css('opacity', '1');
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant) {
  // Set up the Participant's media container.
  setupParticipantContainer(participant);
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(participant) {
  // If the disconnected Participant was pinned as the active Participant, then
  // unpin it so that the active Participant can be updated.
  if (activeParticipant === participant && isActiveParticipantPinned) {
    isActiveParticipantPinned = false;
    const localPeer = hmsStore.getState(selectLocalPeer);
    setCurrentActiveParticipant(localPeer);
  }

  // Remove the Participant's media container.
  const $videoEle = $(`div#${participant.id} > video`, $participants);
  hmsActions.detachVideo(participant.videoTrack, $videoEle.get(0));
  $(`div#${participant.id}`, $participants).remove();
}

/**
 * Handle all disconnected Participant.
 */
function removeAllParticipants() {
  // Remove all the Participant's media container.
  $participants.get(0).replaceChildren();
}
/**
 * Join a Room.
 * @param hmsConfig - the ConnectOptions used to join a Room
 */
async function joinRoom(hmsConfig) {
  // Join to the Room with the given hmsConfig, hmsConfig will have token as well.
  await hmsActions.join(hmsConfig);
  hmsStore.subscribe(() => {
    const roomState = hmsStore.getState(selectRoomState);
    if (roomState === HMSRoomState.Connected) {
      // Update the active Participant when changed, only if the user has not
      // pinned any particular Participant as the active Participant.
      const localPeer = hmsStore.getState(selectLocalPeer);
      participantConnected(localPeer);
      setCurrentActiveParticipant(localPeer);

      const remotePeers = hmsStore.getState(selectRemotePeers);
      remotePeers.forEach(participant => {
        participantConnected(participant);
      });

      // listen to if new peer joined
      hmsNotifications.onNotification((notification) => {
        const unsubscribe = hmsStore.subscribe((track) => {
          if (track) {
            const peer = hmsStore.getState(selectPeerByID(notification.data.id));
            participantConnected(peer);
            unsubscribe?.();
          }
        }, selectVideoTrackByPeerID(notification.data.id));
      }, HMSNotificationTypes.PEER_JOINED);
      // Handle a disconnected RemoteParticipant.
      hmsNotifications.onNotification((notification) => {
        participantDisconnected(notification.data);
      }, HMSNotificationTypes.PEER_LEFT);
    }
  }, selectRoomState);
  
  // Leave the Room when the "Leave Room" button is clicked.
  $leave.click(async function onLeave() {
    $leave.off('click', async () => await onLeave());
    await hmsActions.leave();
  });

  return new Promise((resolve, reject) => {
    // Leave the Room when the "beforeunload" event is fired.
    window.onbeforeunload = async () => {
      await hmsActions.leave();
    };

    if (isMobile) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = async () => {
        await hmsActions.leave();
      };

      // On mobile browsers, use "visibilitychange" event to determine when
      // the app is backgrounded or foregrounded.
      document.onvisibilitychange = async () => {
        // 100ms hms app will automatically handle publish/unpulbish
        await hmsActions.setLocalVideoEnabled(document.visibilityState !== 'hidden');
      };
    }
    // subscribe to check room disconnected
    hmsStore.subscribe(() => {
      const roomState = hmsStore.getState(selectRoomState);
      if (roomState === HMSRoomState.Disconnected) {
        window.onbeforeunload = null;
        if (isMobile) {
          window.onpagehide = null;
          document.onvisibilitychange = null;
        }
        // Handle the disconnected RemoteParticipants.
        removeAllParticipants();
        // Clear the active Participant's video.
        $activeVideo.get(0).srcObject = null;
        resolve();
      }
    }, selectRoomState);
  });
}

module.exports = joinRoom;
