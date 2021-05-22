export const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  sdpSemantics: 'unified-plan',
};

export const mediaConstraints = {
  video: true,
  audio: { echoCancellation: true },
};

// This is exactly what electron documentation recommends
export const electronScreenSharingMC = {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop',
    },
  },
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
    },
  },
};
