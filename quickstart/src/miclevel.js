'use strict';

const { selectTrackAudioByID } = require("@100mslive/hms-video-store");
const { hmsStore } = require("./hms");

/**
 * Poll the microphone's input level.
 * @param audioTrackId - the AudioTrack idrepresenting the microphone
 * @param onLevel - called when the input level changes
 */
module.exports = function micLevel(audioTrackId, onLevel) {
  hmsStore.subscribe(audioLevel => {
    onLevel(audioLevel);
  }, selectTrackAudioByID(audioTrackId));
};
